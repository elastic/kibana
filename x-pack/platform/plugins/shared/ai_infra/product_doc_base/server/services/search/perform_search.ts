/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ProductDocumentationAttributes } from '@kbn/product-doc-common';

// https://search-labs.elastic.co/search-labs/blog/elser-rag-search-for-relevance

export const performSearch = async ({
  searchQuery,
  size,
  index,
  client,
}: {
  searchQuery: string;
  size: number;
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
  });

  return results.hits.hits;
};
