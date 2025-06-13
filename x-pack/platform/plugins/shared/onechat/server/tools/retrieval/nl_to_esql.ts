/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingTypeMapping } from '@elastic/elasticsearch/lib/api/types';
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
import { indexExplorer } from './index_explorer';

const nlToEsqlToolSchema = z.object({
  query: z.string().describe('The query to generate an ES|QL query from.'),
  index: z
    .string()
    .optional()
    .describe(
      '(optional) Index to search against. If not provided, will use the index explorer to find the best index to use.'
    ),
  context: z
    .string()
    .optional()
    .describe('(optional) Additional context that could be useful to generate the ES|QL query'),
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
    handler: async ({ query, index, context }, { esClient, modelProvider }) => {
      const model = await modelProvider.getDefaultModel();

      let selectedIndex = index;
      let mappings: MappingTypeMapping;

      if (index) {
        selectedIndex = index;
        const indexMappings = await getIndexMappings({
          indices: [index],
          esClient: esClient.asCurrentUser,
        });
        mappings = indexMappings[index].mappings;
      } else {
        const {
          indices: [firstIndex],
        } = await indexExplorer({
          query,
          esClient: esClient.asCurrentUser,
          limit: 1,
          model,
        });
        selectedIndex = firstIndex.indexName;
        mappings = firstIndex.mappings;
      }

      const esqlEvents$ = naturalLanguageToEsql({
        // @ts-expect-error using a scoped inference client
        connectorId: undefined,
        client: model.inferenceClient,
        logger: { debug: () => undefined },
        input: `
        Your task is to generate an ES|QL query.

        - User query: "${query}",
        - Additional context: "${context ?? 'N/A'}
        - Index to use: "${selectedIndex}"
        - Mapping of this index:
        \`\`\`json
        ${JSON.stringify(mappings, undefined, 2)}
        \`\`\`

        Given those info, please generate an ES|QL query to address the user request
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

const extractEsqlQueries = (message: string): string[] => {
  return Array.from(message.matchAll(INLINE_ESQL_QUERY_REGEX)).map(([match, query]) => query);
};
