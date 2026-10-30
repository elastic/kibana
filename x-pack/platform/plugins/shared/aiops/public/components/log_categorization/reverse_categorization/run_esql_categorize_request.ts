/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRange } from '@kbn/es-query';
import type { IEsqlSearchParams, ISearchMethods } from '@kbn/search-types';
import type { Category } from '@kbn/aiops-log-pattern-analysis/types';
import {
  buildEsqlCategorizeQuery,
  categoryKeyFromPattern,
  getAlignedSparklineRange,
  mapEsqlSparklineToBuckets,
} from './build_esql_analysis_queries';

export async function runEsqlCategorizeRequest({
  esql,
  fieldName,
  timeFieldName,
  earliest,
  latest,
  intervalMs,
  search,
  timeRange,
  filter,
  signal,
}: {
  esql: string;
  fieldName: string;
  timeFieldName: string;
  earliest: number;
  latest: number;
  intervalMs: number;
  search: Pick<ISearchMethods, 'esql'>;
  timeRange?: TimeRange;
  filter?: IEsqlSearchParams['filter'];
  signal?: AbortSignal;
}): Promise<{ categories: Category[]; hasExamples: boolean }> {
  const { start, end, bucketCount } = getAlignedSparklineRange({ earliest, latest, intervalMs });
  const esqlQuery = buildEsqlCategorizeQuery({
    esql,
    fieldName,
    timeFieldName,
    bucketCount,
    rangeStart: start,
    rangeEnd: end,
  });

  const { rawResponse: response } = await search.esql(
    {
      query: esqlQuery,
      filter,
      dropNullColumns: true,
      kibanaQueryContext: { timeRange },
    },
    { abortSignal: signal }
  );

  const patternIndex = response.columns.findIndex((column) => column.name === 'Pattern');
  const countIndex = response.columns.findIndex((column) => column.name === 'Count');
  const sparklineIndex = response.columns.findIndex((column) => column.name === 'Sparkline');

  if (patternIndex < 0) {
    return { categories: [], hasExamples: false };
  }

  const categories: Category[] = response.values.map((row) => {
    const pattern = String(row[patternIndex] ?? '');
    const count = Number(row[countIndex] ?? 0);

    return {
      key: categoryKeyFromPattern(pattern) || pattern,
      count: Number.isFinite(count) ? count : 0,
      examples: [],
      regex: pattern,
      sparkline: mapEsqlSparklineToBuckets({
        values: sparklineIndex >= 0 ? row[sparklineIndex] : undefined,
        earliest: start,
        intervalMs,
      }),
    };
  });

  return {
    categories,
    hasExamples: false,
  };
}
