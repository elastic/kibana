/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { lastValueFrom } from 'rxjs';
import type { AggregateQuery, Filter, Query, TimeRange } from '@kbn/es-query';
import { buildQueryFromFilters, isOfAggregateQueryType } from '@kbn/es-query';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';
import type { QueryMode } from '@kbn/aiops-log-pattern-analysis/get_category_query';
import { getESQLResults } from '@kbn/esql-utils';
import { useAiopsAppContext } from '../../../hooks/use_aiops_app_context';
import { createFilter } from '../use_discover_links';
import { buildEsqlCategoryDocsQuery } from './build_esql_analysis_queries';

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
      query,
      timeRange,
      signal,
      filter,
    }: {
      index: string;
      field: string;
      category: Category;
      mode: QueryMode;
      additionalFilters?: Filter[];
      additionalField?: { name: string; value: string };
      timeField?: string;
      size?: number;
      query?: Query | AggregateQuery;
      timeRange?: TimeRange;
      signal?: AbortSignal;
      filter?: unknown;
    }): Promise<{ total: number; results: { timestamp: string; message: string }[] }> => {
      if (isOfAggregateQueryType(query) && timeField) {
        const esqlQuery = buildEsqlCategoryDocsQuery({
          esql: query.esql,
          fieldName: field,
          timeFieldName: timeField,
          categoryKey: category.key,
          size,
        });

        const { response } = await getESQLResults({
          esqlQuery,
          search: search.search,
          signal,
          filter,
          timeRange,
          dropNullColumns: true,
        });

        const fieldIndex = response.columns.findIndex((column) => column.name === field);
        const timeIndex = response.columns.findIndex((column) => column.name === timeField);

        const results = response.values.map((row) => ({
          message: String(fieldIndex >= 0 ? row[fieldIndex] ?? '' : ''),
          timestamp: String(timeIndex >= 0 ? row[timeIndex] ?? '' : ''),
        }));

        return {
          total: results.length,
          results,
        };
      }

      // Create filter from category
      const categoryFilter = createFilter(
        index,
        field,
        [category],
        mode,
        category,
        additionalField
      );

      // Respect meta.negate / meta.disabled via buildQueryFromFilters (must vs must_not)
      const filterQuery = buildQueryFromFilters([categoryFilter, ...additionalFilters], undefined);

      // Build source fields array
      const sourceFields = [field];
      if (timeField) {
        sourceFields.push(timeField);
      }

      // Perform match_all search with filters
      const response = await lastValueFrom(
        search.search(
          {
            params: {
              index,
              size,
              body: {
                _source: sourceFields,
                query: {
                  bool: {
                    must: [{ match_all: {} }, ...filterQuery.must],
                    filter: filterQuery.filter,
                    should: filterQuery.should,
                    must_not: filterQuery.must_not,
                  },
                },
              },
            },
          },
          { abortSignal: signal }
        )
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
