/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import type { Logger } from '@kbn/logging';
import { withExecuteToolSpan } from '@kbn/inference-tracing';
import { tool as toTool } from '@langchain/core/tools';
import type { ScopedModel, ToolEventEmitter } from '@kbn/agent-builder-server';
import type { ResourceResult, ToolResult } from '@kbn/agent-builder-common/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { getToolResultId, createErrorResult } from '@kbn/agent-builder-server/tools';
import { relevanceSearch } from '../relevance_search';
import { naturalLanguageSearch } from '../nl_search';
import type { MatchResult } from '../steps/perform_match_search';
import { progressMessages } from './i18n';

const convertMatchResult = (result: MatchResult): ResourceResult => {
  return {
    tool_result_id: getToolResultId(),
    type: ToolResultType.resource,
    data: {
      reference: {
        id: result.id,
        index: result.index,
      },
      partial: true,
      content: {
        highlights: result.highlights,
      },
    },
  };
};

export const relevanceSearchToolName = 'relevance_search';

export const createRelevanceSearchTool = ({
  model,
  esClient,
  events,
  logger,
}: {
  model: ScopedModel;
  esClient: ElasticsearchClient;
  events?: ToolEventEmitter;
  logger: Logger;
}) => {
  return toTool(
    async ({ term, index, size }) => {
      return withExecuteToolSpan(
        relevanceSearchToolName,
        { tool: { input: { term, index, size } } },
        async () => {
          events?.reportProgress(progressMessages.performingRelevanceSearch({ term }));
          const { results: rawResults } = await relevanceSearch({
            target: index,
            term,
            size,
            model,
            esClient,
            logger,
          });
          const results = rawResults.map(convertMatchResult);

          const content = JSON.stringify(results);
          const artifact = { results };
          return [content, artifact];
        }
      );
    },
    {
      name: relevanceSearchToolName,
      responseFormat: 'content_and_artifact',
      schema: z.object({
        term: z.string().describe('The search term or phrase to match against document content'),
        index: z.string().describe('The index, alias, or datastream to search'),
        size: z.number().optional().default(10).describe('Max documents to return (default: 10)'),
      }),
      description:
        'Find documents using full-text search. Returns results ranked by relevance score.',
    }
  );
};

export const naturalLanguageSearchToolName = 'natural_language_search';

export const createNaturalLanguageSearchTool = ({
  model,
  esClient,
  events,
  logger,
  rowLimit,
  customInstructions,
}: {
  model: ScopedModel;
  esClient: ElasticsearchClient;
  events: ToolEventEmitter;
  logger: Logger;
  rowLimit?: number;
  customInstructions?: string;
}) => {
  return toTool(
    async ({ query, index }) => {
      return withExecuteToolSpan(
        naturalLanguageSearchToolName,
        { tool: { input: { query, index } } },
        async () => {
          events?.reportProgress(progressMessages.performingNlSearch({ query }));
          const response = await naturalLanguageSearch({
            nlQuery: query,
            target: index,
            model,
            esClient,
            events,
            logger,
            rowLimit,
            customInstructions,
          });

          const results: ToolResult[] = response.esqlData
            ? [
                {
                  tool_result_id: getToolResultId(),
                  type: ToolResultType.query,
                  data: {
                    esql: response.generatedQuery,
                  },
                },
                {
                  tool_result_id: getToolResultId(),
                  type: ToolResultType.tabularData,
                  data: {
                    source: 'esql',
                    query: response.generatedQuery,
                    columns: response.esqlData.columns,
                    values: response.esqlData.values,
                  },
                },
              ]
            : [
                createErrorResult({
                  message: response.error ?? 'Query was not executed',
                  metadata: {
                    query: response.generatedQuery,
                  },
                }),
              ];

          const content = JSON.stringify(results);
          const artifact = { results };
          return [content, artifact];
        }
      );
    },
    {
      name: naturalLanguageSearchToolName,
      responseFormat: 'content_and_artifact',
      schema: z.object({
        query: z.string().describe('A natural language query expressing the search request'),
        index: z.string().describe('Name of the index, alias or datastream to search against'),
      }),
      description: `Given a natural language query, generate and execute the corresponding search request and returns the results in a tabular format

Example of natural language queries which can be passed to the tool:
  - "show me the last 5 documents from the index"
  - "what is the average order value?"
  - "list all products where status is 'in_stock' and price is less than 50"
  - "how many errors were logged in the past hour?"`,
    }
  );
};
