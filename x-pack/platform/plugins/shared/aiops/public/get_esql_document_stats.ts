/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Query } from '@kbn/es-query';
import type { ISearchGeneric } from '@kbn/search-types';
import type { DocumentCountStats } from '@kbn/aiops-log-rate-analysis/types';
import { appendToESQLQuery, getESQLResults, sanitazeESQLInput } from '@kbn/esql-utils';

/**
 * Builds an ES|QL query counting documents per interval. BUCKET with a time span rounds
 * down to multiples of the interval since the epoch, like a date_histogram with a fixed_interval.
 */
export const buildEsqlDocumentCountQuery = ({
  esql,
  timeFieldName,
  intervalMs,
}: {
  esql: string;
  timeFieldName: string;
  intervalMs: number;
}): string => {
  const timeField = sanitazeESQLInput(timeFieldName);
  return appendToESQLQuery(
    esql,
    `| STATS Count = COUNT(*) BY Bucket = BUCKET(${timeField}, ${Math.floor(
      intervalMs
    )} milliseconds)`
  );
};

/**
 * Fetches the document count histogram for an ES|QL document scope, returning the same
 * shape (including empty buckets) as the DSL based document count stats.
 */
export const getEsqlDocumentCountStats = async ({
  esql,
  search,
  timeFieldName,
  earliest,
  latest,
  intervalMs,
  searchQuery,
  signal,
}: {
  esql: string;
  search: ISearchGeneric;
  timeFieldName: string;
  earliest: number;
  latest: number;
  intervalMs: number;
  searchQuery?: Query['query'];
  signal?: AbortSignal;
}): Promise<{ totalCount: number; documentCountStats: DocumentCountStats }> => {
  const { response } = await getESQLResults({
    esqlQuery: buildEsqlDocumentCountQuery({ esql, timeFieldName, intervalMs }),
    search,
    signal,
    filter: {
      bool: {
        filter: [
          ...(typeof searchQuery === 'object' ? [searchQuery] : []),
          {
            range: {
              [timeFieldName]: { gte: earliest, lte: latest, format: 'epoch_millis' },
            },
          },
        ],
      },
    },
  });

  const countIndex = response.columns.findIndex(({ name }) => name === 'Count');
  const bucketIndex = response.columns.findIndex(({ name }) => name === 'Bucket');

  // Start with every bucket in range so empty ones are present, as with min_doc_count: 0.
  const buckets: Record<string, number> = {};
  const firstBucket = Math.floor(earliest / intervalMs) * intervalMs;
  const lastBucket = Math.floor(latest / intervalMs) * intervalMs;
  for (let key = firstBucket; key <= lastBucket; key += intervalMs) {
    buckets[key] = 0;
  }

  let totalCount = 0;
  if (countIndex >= 0 && bucketIndex >= 0) {
    response.values.forEach((row) => {
      const key = Date.parse(String(row[bucketIndex]));
      const count = Number(row[countIndex]);
      if (!Number.isFinite(key) || !Number.isFinite(count)) return;
      buckets[key] = (buckets[key] ?? 0) + count;
      totalCount += count;
    });
  }

  return {
    totalCount,
    documentCountStats: {
      interval: intervalMs,
      buckets,
      timeRangeEarliest: earliest,
      timeRangeLatest: latest,
      totalCount,
    },
  };
};
