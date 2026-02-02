/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { QueryDslQueryContainer, SortCombinations } from '@elastic/elasticsearch/lib/api/types';
import { errors } from '@elastic/elasticsearch';
import { omit } from 'lodash';
import { SecurityError } from '../../streams/errors/security_error';

/** Strategy for selecting sample documents */
export type SampleStrategy = 'latest' | 'random';

/** Options for fetching sample documents */
export interface FetchSampleDocsOptions {
  /** Index to search (e.g., '.alerts-streams.alerts-default') */
  index: string;
  /** Start of time window */
  from: Date;
  /** End of time window */
  to: Date;
  /** Number of sample documents to retrieve (default: 5) */
  size?: number;
  /** Selection strategy: 'latest' sorts by timestamp desc, 'random' uses random scoring (default: 'latest') */
  strategy?: SampleStrategy;
  /** Timestamp field to use for range filtering and sorting (default: '@timestamp') */
  timestampField?: string;
  /** Additional filters to apply (combined with AND) */
  additionalFilters?: QueryDslQueryContainer[];
  /** Fields to return from _source (default: all) */
  sourceFields?: string[];
  /**
   * Field containing the original document (for alerts index).
   * If provided, extracts this field from each hit instead of the full _source.
   */
  originalSourceField?: string;
  /** Fields to omit from the result (e.g., '_id') */
  omitFields?: readonly string[];
}

/** Result of fetching sample documents */
export interface FetchSampleDocsResult {
  /** Array of document objects (as JSON-serializable records) */
  documents: Array<Record<string, unknown>>;
  /** Total count of matching documents (not just sampled) */
  totalCount: number;
}

/** Default configuration */
const DEFAULT_SAMPLE_SIZE = 5;
const DEFAULT_TIMESTAMP_FIELD = '@timestamp';
const DEFAULT_STRATEGY: SampleStrategy = 'latest';
const DEFAULT_OMIT_FIELDS = ['_id'];

/**
 * Fetches sample documents from an Elasticsearch index.
 *
 * This is the shared abstraction for retrieving sample documents used in insights generation.
 * It encapsulates the index, time window, sample size, and selection strategy.
 *
 * @param options - Configuration for the sample fetch
 * @param esClient - Elasticsearch client
 * @returns Promise resolving to sample documents and total count
 *
 * @example
 * // Fetch latest 5 alerts for a rule
 * const result = await fetchSampleDocuments({
 *   index: '.alerts-streams.alerts-default',
 *   from: new Date('2024-01-01'),
 *   to: new Date('2024-01-02'),
 *   additionalFilters: [{ term: { 'kibana.alert.rule.uuid': 'rule-id' } }],
 *   originalSourceField: 'original_source',
 * }, esClient);
 *
 * @example
 * // Fetch random sample from a data stream
 * const result = await fetchSampleDocuments({
 *   index: 'logs-*',
 *   from: new Date('2024-01-01'),
 *   to: new Date('2024-01-02'),
 *   size: 10,
 *   strategy: 'random',
 * }, esClient);
 */
export async function fetchSampleDocuments(
  options: FetchSampleDocsOptions,
  esClient: ElasticsearchClient
): Promise<FetchSampleDocsResult> {
  const {
    index,
    from,
    to,
    size = DEFAULT_SAMPLE_SIZE,
    strategy = DEFAULT_STRATEGY,
    timestampField = DEFAULT_TIMESTAMP_FIELD,
    additionalFilters = [],
    sourceFields,
    originalSourceField,
    omitFields = DEFAULT_OMIT_FIELDS,
  } = options;

  // Build the base query with time range
  const timeRangeFilter: QueryDslQueryContainer = {
    range: {
      [timestampField]: {
        gte: from.toISOString(),
        lte: to.toISOString(),
      },
    },
  };

  // Combine filters
  const filters: QueryDslQueryContainer[] = [timeRangeFilter, ...additionalFilters];

  // Build query based on strategy
  const query: QueryDslQueryContainer =
    strategy === 'random'
      ? {
          function_score: {
            query: { bool: { filter: filters } },
            functions: [{ random_score: {} }],
            boost_mode: 'replace',
          },
        }
      : { bool: { filter: filters } };

  // Sort for latest strategy (random strategy uses function_score which handles ordering)
  const sort: SortCombinations[] | undefined =
    strategy === 'latest' ? [{ [timestampField]: 'desc' }] : undefined;

  try {
    const response = await esClient.search<Record<string, unknown>>({
      index,
      size,
      query,
      sort,
      track_total_hits: true,
      ...(sourceFields && { _source: sourceFields }),
    });

    const totalCount =
      typeof response.hits.total === 'number'
        ? response.hits.total
        : response.hits.total?.value ?? 0;

    // Extract documents, optionally from a nested field
    const documents = response.hits.hits.map((hit) => {
      const source = originalSourceField
        ? (hit._source?.[originalSourceField] as Record<string, unknown>) ?? {}
        : hit._source ?? {};

      return omit(source, omitFields) as Record<string, unknown>;
    });

    return { documents, totalCount };
  } catch (err) {
    if (err instanceof errors.ResponseError && err?.body?.error?.type === 'security_exception') {
      throw new SecurityError(
        `Cannot read sample documents, insufficient privileges: ${err.message}`,
        { cause: err }
      );
    }
    throw err;
  }
}

/**
 * Pre-configured options for fetching from the alerts index.
 * Includes the standard alerts index name and original_source extraction.
 */
export const ALERTS_INDEX_CONFIG = {
  index: '.alerts-streams.alerts-default',
  originalSourceField: 'original_source',
  omitFields: ['_id'],
} as const;

/**
 * Convenience function to fetch sample documents from the alerts index for a specific rule.
 *
 * @param ruleId - The rule UUID (kibana.alert.rule.uuid)
 * @param from - Start of time window
 * @param to - End of time window
 * @param esClient - Elasticsearch client
 * @param options - Optional overrides for size and strategy
 * @returns Promise resolving to sample documents and total count
 */
export async function fetchAlertSampleDocuments(
  ruleId: string,
  from: Date,
  to: Date,
  esClient: ElasticsearchClient,
  options?: { size?: number; strategy?: SampleStrategy }
): Promise<FetchSampleDocsResult> {
  return fetchSampleDocuments(
    {
      ...ALERTS_INDEX_CONFIG,
      from,
      to,
      size: options?.size,
      strategy: options?.strategy,
      additionalFilters: [
        {
          term: {
            'kibana.alert.rule.uuid': ruleId,
          },
        },
      ],
    },
    esClient
  );
}
