/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { withExecuteToolSpan } from '@kbn/inference-tracing';
import { tool as toTool } from '@langchain/core/tools';
import type { ScopedModel } from '@kbn/onechat-server';
import type { ResourceResult, ToolResult } from '@kbn/onechat-common/tools';
import { ToolResultType } from '@kbn/onechat-common/tools';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { getToolResultId } from '@kbn/onechat-server/src/tools';
import { relevanceSearch } from '../relevance_search';
import { naturalLanguageSearch } from '../nl_search';
import type { MatchResult } from '../steps/perform_match_search';

const convertMatchResult = (result: MatchResult): ResourceResult => {
  return {
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
}: {
  model: ScopedModel;
  esClient: ElasticsearchClient;
}) => {
  return toTool(
    async ({ term, index, size }) => {
      return withExecuteToolSpan(
        relevanceSearchToolName,
        { tool: { input: { term, index, size } } },
        async () => {
          const { results: rawResults } = await relevanceSearch({
            target: index,
            term,
            size,
            model,
            esClient,
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
        term: z.string().describe('Term to search for'),
        index: z.string().describe('Name of the index, alias or datastream to search against'),
        size: z
          .number()
          .optional()
          .default(10)
          .describe('Number of documents to return. Defaults to 10.'),
      }),
      description: `Find relevant documents in an index, alias or datastream, based on a simple fulltext search.

      Will search for documents performing a match query against the provided term(s).`,
    }
  );
};

export const naturalLanguageSearchToolName = 'natural_language_search';

export const createNaturalLanguageSearchTool = ({
  model,
  esClient,
}: {
  model: ScopedModel;
  esClient: ElasticsearchClient;
}) => {
  return toTool(
    async ({ query, index }) => {
      return withExecuteToolSpan(
        naturalLanguageSearchToolName,
        { tool: { input: { query, index } } },
        async () => {
          const response = await naturalLanguageSearch({
            nlQuery: query,
            target: index,
            model,
            esClient,
          });

          const results: ToolResult[] = [
            {
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
