/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseMessageLike } from '@langchain/core/messages';
import { z } from '@kbn/zod';
import { filter, toArray, firstValueFrom } from 'rxjs';
import { isChatCompletionMessageEvent, isChatCompletionEvent } from '@kbn/inference-common';
import { naturalLanguageToEsql } from '@kbn/inference-plugin/server';
import { OnechatToolIds, OnechatToolTags } from '@kbn/onechat-common';
import { INLINE_ESQL_QUERY_REGEX } from '@kbn/inference-plugin/common/tasks/nl_to_esql/constants';
import type { RegisteredTool } from '@kbn/onechat-server';
import { listIndices, ListIndexInfo } from './list_indices';
import { getIndexMappings } from './get_index_mapping';

const nlToEsqlToolSchema = z.object({
  query: z.string().describe('The query to generate an ES|QL query from.'),
  context: z
    .string()
    .optional()
    .describe('(optional) Additional context that can be used to generate the ES|QL query'),
});

export interface NlToEsqlResponse {
  answer: string;
  queries: string[];
}

export const nlToEsqlTool = (): RegisteredTool<typeof nlToEsqlToolSchema, NlToEsqlResponse> => {
  return {
    id: OnechatToolIds.generateEsql,
    description: 'Generate an ES|QL query from a natural language query.',
    schema: nlToEsqlToolSchema,
    handler: async ({ query, context }, { esClient, modelProvider }) => {
      const { chatModel, inferenceClient } = await modelProvider.getDefaultModel();
      const indexInfo = await listIndices({ esClient: esClient.asCurrentUser, pattern: '*' });

      const indexSelectionModel = chatModel.withStructuredOutput(
        z.object({
          indices: z
            .array(
              z.object({
                name: z.string().describe('name of the index'),
                reason: z
                  .string()
                  .optional()
                  .describe('(optional) reason why the index is relevant'),
              })
            )
            .describe('the index, or indices, that should be used to generate the ES|QL query'),
        })
      );

      const { indices: selectedIndices } = await indexSelectionModel.invoke(
        getIndexSelectionPrompt({ query, context, indices: indexInfo })
      );

      const indexMappings = await getIndexMappings({
        indices: selectedIndices.map((index) => {
          return index.name;
        }),
        esClient: esClient.asCurrentUser,
      });

      // console.log('selectedIndices: ', selectedIndices);
      // console.log('indexMappings: ', indexMappings);

      const esqlEvents$ = naturalLanguageToEsql({
        // @ts-expect-error using a scoped inference client
        connectorId: undefined,
        client: inferenceClient,
        logger: { debug: () => undefined },
        input: `
        Generate an ES|QL query for the following:

        *User query*: ${query},
        *Additional context*"${context}

        *Indices: ${selectedIndices}*

        *Index mappings: ${indexMappings}*
        `,
      });

      const messages = await firstValueFrom(
        esqlEvents$.pipe(
          filter(isChatCompletionEvent),
          filter(isChatCompletionMessageEvent),
          toArray()
        )
      );

      const fullContent = messages.map((message) => message.content).join('\n');
      const esqlQueries = extractEsqlQueries(fullContent);

      return {
        answer: fullContent,
        queries: esqlQueries,
      };
    },
    meta: {
      tags: [OnechatToolTags.retrieval],
    },
  };
};

export const getIndexSelectionPrompt = ({
  query,
  context,
  indices,
}: {
  query: string;
  context?: string;
  indices: ListIndexInfo[];
}): BaseMessageLike[] => {
  const resultEntry = (document: ListIndexInfo): string => {
    return `
    - **${document.index}**
    `;
  };

  return [
    [
      'system',
      `
      ## Current task: Index identification

      Given a user query and additional context, identify the relevant indices that should be searched
      for documents that contain relevant information for the user query.`,
    ],
    [
      'human',
      `
    ## Input

    **Search Query:**: "${query}"
    **Additional context:**: "${context ?? 'N/A'}"

    ## List of indices

    ${indices.map(resultEntry).join('\n')}
    `,
    ],
  ];
};

const extractEsqlQueries = (message: string): string[] => {
  return Array.from(message.matchAll(INLINE_ESQL_QUERY_REGEX)).map(([match, query]) => query);
};
