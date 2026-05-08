/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { IKibanaSearchRequest, IKibanaSearchResponse } from '@kbn/search-types';
import { lastValueFrom } from 'rxjs';

import { useStartServices } from '../../../hooks';

import { OTEL_LOG_INDEX } from './constants';

export type LogLevel = 'error' | 'warning';
export type TimeRange = '5m' | '1h' | '1d' | '1w';
export type SortField = 'count' | 'lastSeen';

export interface ErrorPattern {
  key: string;
  pattern: string;
  docCount: number;
  firstSeen: string;
  lastSeen: string;
  exampleMessage: string;
  component: string | null;
}

export interface UseErrorPatternsResult {
  errorPatterns: ErrorPattern[];
  warningPatterns: ErrorPattern[];
  errorCount: number;
  warningCount: number;
  totalLogCount: number;
  isLoading: boolean;
  error?: Error;
}

const TIME_RANGE_TO_MS: Record<TimeRange, number> = {
  '5m': 5 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000,
};

const LOG_LEVEL_VALUES: Record<LogLevel, string[]> = {
  error: ['error', 'ERROR', 'fatal', 'FATAL'],
  warning: ['warn', 'WARN', 'warning', 'WARNING'],
};

interface CategorizeTextBucket {
  key: string;
  doc_count: number;
  min_timestamp: { value: number | null };
  max_timestamp: { value: number | null };
  sample: {
    hits: {
      hits: Array<{
        _source?: {
          component?: { id?: string };
        };
        fields?: {
          message?: string[];
        };
      }>;
    };
  };
}

interface ErrorPatternsAggregations {
  categories: {
    buckets: CategorizeTextBucket[];
  };
}

const buildQuery = (
  serviceInstanceId: string,
  level: LogLevel,
  now: number,
  timeRangeMs: number
) => ({
  params: {
    index: OTEL_LOG_INDEX,
    track_total_hits: false,
    body: {
      size: 0,
      query: {
        bool: {
          filter: [
            { term: { 'service.instance.id': serviceInstanceId } },
            { terms: { 'log.level': LOG_LEVEL_VALUES[level] } },
            { range: { '@timestamp': { gte: now - timeRangeMs, lte: now } } },
          ],
        },
      },
      aggs: {
        categories: {
          categorize_text: {
            field: 'message',
            size: 20,
          },
          aggs: {
            min_timestamp: { min: { field: '@timestamp' } },
            max_timestamp: { max: { field: '@timestamp' } },
            sample: {
              top_hits: {
                size: 1,
                _source: { includes: ['component.id'] },
                fields: ['message'],
                sort: { _score: { order: 'desc' as const } },
              },
            },
          },
        },
      },
    },
  },
});

const mapBucketsToPatterns = (buckets: CategorizeTextBucket[]): ErrorPattern[] =>
  buckets.map((bucket) => ({
    key: bucket.key,
    pattern: bucket.key,
    docCount: bucket.doc_count,
    firstSeen: bucket.min_timestamp.value ? new Date(bucket.min_timestamp.value).toISOString() : '',
    lastSeen: bucket.max_timestamp.value ? new Date(bucket.max_timestamp.value).toISOString() : '',
    exampleMessage: bucket.sample?.hits?.hits?.[0]?.fields?.message?.[0] ?? bucket.key,
    component: bucket.sample?.hits?.hits?.[0]?._source?.component?.id ?? null,
  }));

export const useErrorPatterns = ({
  serviceInstanceId,
  timeRange,
}: {
  serviceInstanceId: string;
  timeRange: TimeRange;
}): UseErrorPatternsResult => {
  const { data } = useStartServices();

  const [errorPatterns, setErrorPatterns] = useState<ErrorPattern[]>([]);
  const [warningPatterns, setWarningPatterns] = useState<ErrorPattern[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | undefined>();

  const fetchPatterns = useCallback(
    (abortSignal: AbortSignal, showLoading: boolean) => {
      if (showLoading) {
        setIsLoading(true);
      }
      setError(undefined);

      const run = async () => {
        try {
          const now = Date.now();
          const timeRangeMs = TIME_RANGE_TO_MS[timeRange];

          const [errorResponse, warningResponse] = await Promise.all(
            (['error', 'warning'] as const).map((level) =>
              lastValueFrom(
                data.search.search<
                  IKibanaSearchRequest,
                  IKibanaSearchResponse<{ aggregations?: ErrorPatternsAggregations }>
                >(buildQuery(serviceInstanceId, level, now, timeRangeMs), {
                  abortSignal,
                })
              )
            )
          );

          if (!abortSignal.aborted) {
            const errorBuckets = errorResponse.rawResponse.aggregations?.categories?.buckets ?? [];
            const warningBuckets =
              warningResponse.rawResponse.aggregations?.categories?.buckets ?? [];

            setErrorPatterns(mapBucketsToPatterns(errorBuckets));
            setWarningPatterns(mapBucketsToPatterns(warningBuckets));
            setIsLoading(false);
          }
        } catch (e) {
          if (!abortSignal.aborted) {
            setError(e instanceof Error ? e : new Error(String(e)));
            setIsLoading(false);
          }
        }
      };

      run();
    },
    [serviceInstanceId, timeRange, data.search]
  );

  useEffect(() => {
    if (!serviceInstanceId) {
      setIsLoading(false);
      return;
    }

    const abortController = new AbortController();
    fetchPatterns(abortController.signal, true);

    const interval = setInterval(() => {
      fetchPatterns(abortController.signal, false);
    }, 30_000);

    return () => {
      abortController.abort();
      clearInterval(interval);
    };
  }, [fetchPatterns, serviceInstanceId]);

  const totalLogCount = useMemo(
    () => [...errorPatterns, ...warningPatterns].reduce((sum, p) => sum + p.docCount, 0),
    [errorPatterns, warningPatterns]
  );

  return {
    errorPatterns,
    warningPatterns,
    errorCount: errorPatterns.length,
    warningCount: warningPatterns.length,
    totalLogCount,
    isLoading,
    error,
  };
};
