/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { OnechatToolIds, OnechatToolTags } from '@kbn/onechat-common';
import type { RegisteredTool } from '@kbn/onechat-server';
import { indexExplorer } from './index_explorer';
import { getIndexMappings } from './get_index_mapping';
import { flattenFields } from './utils/flatten_fields';

const fulltextSearchSchema = z.object({
  term: z.string().describe('Term to search for'),
  index: z
    .string()
    .optional()
    .describe(
      '(optional) Index to search against. If not provided, will use index explorer to find the best index to use.'
    ),
  fields: z
    .array(z.string())
    .optional()
    .describe(
      '(optional) Fields to perform fulltext search on. If not provided, will use all searchable fields.'
    ),
  size: z
    .number()
    .optional()
    .default(10)
    .describe('Number of documents to return. Defaults to 10.'),
});

export interface SearchFulltextResult {
  id: string;
  index: string;
  highlights: string[];
}

export interface SearchFulltextResponse {
  results: SearchFulltextResult[];
}

// TODO: rename to relevance search
export const searchFulltextTool = (): RegisteredTool<
  typeof fulltextSearchSchema,
  SearchFulltextResponse
> => {
  return {
    id: OnechatToolIds.searchFulltext,
    description: `Find relevant documents in an index based on a simple fulltext search.

    - The 'index' parameter can be used to specify which index to search against. If not provided, the tool will use the index explorer to find the best index to use.
    - The 'fields' parameter can be used to specify which fields to search on. If not provided, the tool will use all searchable fields.

    It is perfectly fine not to not specify both 'index' and 'fields'. Those should only be used when you already know about the index and fields you want to search on,
    e.g if the user explicitly specified them.`,
    schema: fulltextSearchSchema,
    handler: async ({ term, index, fields = [], size }, { esClient, modelProvider }) => {
      const model = await modelProvider.getDefaultModel();

      let selectedIndex = index;
      let selectedFields = fields;

      if (!selectedIndex) {
        const { indices } = await indexExplorer({
          query: term,
          esClient: esClient.asCurrentUser,
          model,
        });
        if (indices.length === 0) {
          return { results: [] };
        }
        selectedIndex = indices[0].indexName;
      }

      if (!fields.length) {
        const mappings = await getIndexMappings({
          indices: [selectedIndex],
          esClient: esClient.asCurrentUser,
        });

        const flattenedFields = flattenFields(mappings[selectedIndex]);

        selectedFields = flattenedFields
          .filter((field) => field.type === 'text' || field.type === 'semantic_text')
          .map((field) => field.path);
      }

      return searchFulltext({
        term,
        fields: selectedFields,
        index: selectedIndex,
        size,
        esClient: esClient.asCurrentUser,
      });
    },
    meta: {
      tags: [OnechatToolTags.retrieval],
    },
  };
};

export const searchFulltext = async ({
  term,
  fields,
  index,
  size,
  esClient,
}: {
  term: string;
  fields: string[];
  index: string;
  size: number;
  esClient: ElasticsearchClient;
}): Promise<SearchFulltextResponse> => {
  const response = await esClient.search<any>({
    index,
    size,
    retriever: {
      rrf: {
        retrievers: fields.map((field) => {
          return {
            standard: {
              query: {
                match: {
                  [field]: term,
                },
              },
            },
          };
        }),
      },
    },
    highlight: {
      number_of_fragments: 5,
      fields: fields.reduce((memo, field) => ({ ...memo, [field]: {} }), {}),
    },
  });

  const results = response.hits.hits.map<SearchFulltextResult>((hit) => {
    return {
      id: hit._id!,
      index: hit._index!,
      highlights: Object.entries(hit.highlight ?? {}).reduce((acc, [field, highlights]) => {
        acc.push(...highlights);
        return acc;
      }, [] as string[]),
    };
  });

  return { results };
};
