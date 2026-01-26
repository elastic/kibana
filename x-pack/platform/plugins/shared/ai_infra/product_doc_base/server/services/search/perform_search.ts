/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ProductDocumentationAttributes } from '@kbn/product-doc-common';
import type { OpenAPIV3 } from 'openapi-types';

// https://search-labs.elastic.co/search-labs/blog/elser-rag-search-for-relevance

export const performSearch = async ({
  searchQuery,
  size,
  highlights,
  index,
  client,
}: {
  searchQuery: string;
  size: number;
  highlights: number;
  index: string | string[];
  client: ElasticsearchClient;
}) => {
  const results = await client.search<ProductDocumentationAttributes>({
    index,
    size,
    query: {
      bool: {
        should: [
          {
            multi_match: {
              query: searchQuery,
              minimum_should_match: '1<-1 3<49%',
              type: 'cross_fields',
              fields: [
                'content_title',
                'content_body.text',
                'ai_subtitle',
                'ai_summary.text',
                'ai_questions_answered.text',
                'ai_tags',
              ],
            },
          },
          {
            multi_match: {
              query: searchQuery,
              type: 'phrase',
              boost: 3,
              slop: 0,
              fields: [
                'content_title.stem',
                'content_body.stem',
                'ai_subtitle.stem',
                'ai_summary.stem',
                'ai_questions_answered.stem',
              ],
            },
          },
          {
            semantic: {
              field: 'content_body',
              query: searchQuery,
            },
          },
          {
            semantic: {
              field: 'ai_summary',
              query: searchQuery,
            },
          },
          {
            semantic: {
              field: 'ai_questions_answered',
              query: searchQuery,
            },
          },
        ],
      },
    },
    ...(highlights > 0
      ? {
          highlight: {
            fields: {
              content_body: {
                type: 'semantic',
                number_of_fragments: highlights,
              },
            },
          },
        }
      : {}),
  });

  return results.hits.hits;
};

interface SecurityLabsAttributes {
  title: string;
  slug: string;
  // semantic_text can be returned as string (normal mode) or object (legacy mode)
  content?: string | { text: string };
  description?: string | { text: string };
  authors?: string;
  categories?: string[];
  date?: string;
  resource_type?: string;
}

export const performSecurityLabsSearch = async ({
  searchQuery,
  size,
  highlights,
  index,
  client,
}: {
  searchQuery: string;
  size: number;
  highlights: number;
  index: string;
  client: ElasticsearchClient;
}) => {
  const results = await client.search<SecurityLabsAttributes>({
    index,
    size,
    query: {
      bool: {
        should: [
          {
            multi_match: {
              query: searchQuery,
              minimum_should_match: '1<-1 3<49%',
              type: 'cross_fields',
              fields: ['title', 'content.text', 'description.text', 'authors', 'categories'],
            },
          },
          {
            multi_match: {
              query: searchQuery,
              type: 'phrase',
              boost: 3,
              slop: 0,
              fields: ['title.stem', 'content.stem', 'description.stem'],
            },
          },
          {
            semantic: {
              field: 'content',
              query: searchQuery,
            },
          },
          {
            semantic: {
              field: 'description',
              query: searchQuery,
            },
          },
        ],
      },
    },
    ...(highlights > 0
      ? {
          highlight: {
            fields: {
              content: {
                type: 'semantic',
                number_of_fragments: highlights,
              },
            },
          },
        }
      : {}),
  });

  return results.hits.hits;
};

export interface OpenapiSpecAttributes extends OpenAPIV3.OperationObject {
  path: string;
  method: OpenAPIV3.HttpMethods;
  endpoint: string;
}

export const performOpenapiSpecSearch = async ({
  searchQuery,
  size,
  highlights,
  index,
  client,
}: {
  searchQuery: string;
  size: number;
  highlights: number;
  index: string;
  client: ElasticsearchClient;
}) => {
  const results = await client.search<OpenapiSpecAttributes>({
    index,
    size,
    query: {
      bool: {
        should: [
          // Semantic matches (highest boost for understanding intent)
          { semantic: { field: 'summary', query: searchQuery, boost: 5 } },
          { semantic: { field: 'description', query: searchQuery, boost: 4 } },
          { semantic: { field: 'endpoint', query: searchQuery, boost: 3 } },

          // Lexical matches with phrase matching for better precision
          {
            match_phrase: {
              summary_text: {
                query: searchQuery,
                boost: 3,
                slop: 3,
              },
            },
          },
          {
            match_phrase: {
              description_text: {
                query: searchQuery,
                boost: 2.5,
                slop: 5,
              },
            },
          },
          {
            match: {
              summary_text: {
                query: searchQuery,
                boost: 2,
                operator: 'and',
              },
            },
          },
          {
            match: {
              description_text: {
                query: searchQuery,
                boost: 1.5,
                operator: 'and',
              },
            },
          },
          {
            match: {
              operationId: {
                query: searchQuery,
                boost: 1.5,
                fuzziness: 'AUTO',
              },
            },
          },
          {
            match: {
              path: {
                query: searchQuery,
                boost: 1.2,
              },
            },
          },
        ],
        // Require at least 2 conditions to match for better precision
        minimum_should_match: 2,
      },
    },
    // Only return documents with a minimum score to filter out weak matches
    min_score: 5,
  });

  return results.hits.hits;
};
