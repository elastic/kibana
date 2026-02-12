/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { lastValueFrom } from 'rxjs';
import type { Filter } from '@kbn/es-query';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';
import type { QueryMode } from '@kbn/aiops-log-pattern-analysis/get_category_query';
import { useAiopsAppContext } from '../../../hooks/use_aiops_app_context';
import { createFilter } from '../use_discover_links';

export function useDocsForCategory() {
  const {
    data: { search },
  } = useAiopsAppContext();

  const docsForCategory = useCallback(
    async ({
      index,
      field,
      category,
      mode,
      additionalFilters = [],
      additionalField,
      timeField,
      size = 100,
    }: {
      index: string;
      field: string;
      category: Category;
      mode: QueryMode;
      additionalFilters?: Filter[];
      additionalField?: { name: string; value: string };
      timeField?: string;
      size?: number;
    }): Promise<{ total: number; results: { timestamp: string; message: string }[] }> => {
      // Create filter from category
      const categoryFilter = createFilter(
        index,
        field,
        [category],
        mode,
        category,
        additionalField
      );

      // Merge filters
      const allFilters = [categoryFilter, ...additionalFilters];

      // Build source fields array
      const sourceFields = [field];
      if (timeField) {
        sourceFields.push(timeField);
      }

      // Perform match_all search with filters
      const response = await lastValueFrom(
        search.search({
          params: {
            index,
            size,
            body: {
              _source: sourceFields,
              query: {
                bool: {
                  must: [{ match_all: {} }],
                  filter: allFilters.map((f) => f.query),
                },
              },
            },
          },
        })
      );

      return {
        // @ts-expect-error total value typing
        total: response.rawResponse.hits.total,
        results: response.rawResponse.hits.hits.map((hit: any) => ({
          timestamp: hit._source[timeField!],
          message: hit._source[field],
        })),
      };
    },
    [search]
  );

  return { docsForCategory };
}
