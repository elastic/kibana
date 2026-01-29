/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IndicesFieldUsageStatsResponse } from '@elastic/elasticsearch/lib/api/types';

/**
 * Represents usage statistics for a single field, aggregated across all shards and indices.
 */
export interface AggregatedFieldStats {
  /** Field name */
  name: string;
  /** Total accesses across all usage types */
  any: number;
  /** Inverted index usage statistics */
  inverted_index: {
    terms: number;
    postings: number;
    proximity: number;
    positions: number;
    term_frequencies: number;
    offsets: number;
    payloads: number;
  };
  /** Stored fields access count */
  stored_fields: number;
  /** Doc values access count */
  doc_values: number;
  /** Points (numeric range queries) access count */
  points: number;
  /** Norms access count */
  norms: number;
  /** Term vectors access count */
  term_vectors: number;
  /** KNN vectors access count */
  knn_vectors: number;
}

/**
 * Response from the field statistics endpoint.
 */
export interface FieldStatisticsResponse {
  /** Whether field usage stats are supported in this environment */
  isSupported: boolean;
  /** Aggregated field statistics (empty if not supported) */
  fields: AggregatedFieldStats[];
  /** Total number of fields */
  totalFields: number;
}

/**
 * Creates an empty inverted index stats object.
 */
function createEmptyInvertedIndex(): AggregatedFieldStats['inverted_index'] {
  return {
    terms: 0,
    postings: 0,
    proximity: 0,
    positions: 0,
    term_frequencies: 0,
    offsets: 0,
    payloads: 0,
  };
}

/**
 * Creates an empty aggregated field stats object.
 */
function createEmptyFieldStats(name: string): AggregatedFieldStats {
  return {
    name,
    any: 0,
    inverted_index: createEmptyInvertedIndex(),
    stored_fields: 0,
    doc_values: 0,
    points: 0,
    norms: 0,
    term_vectors: 0,
    knn_vectors: 0,
  };
}

/**
 * Aggregates field usage statistics from Elasticsearch field_usage_stats API responses.
 *
 * When a stream has multiple backing indices, we need to aggregate the stats across
 * all indices. This function:
 * 1. Iterates through all indices in the response
 * 2. For each index, iterates through all shards
 * 3. Aggregates field usage counts by summing across all shards and indices
 *
 * @param responses - Array of field usage stats responses from Elasticsearch
 * @returns Aggregated field statistics for all fields
 */
export function aggregateFieldUsageStats(
  responses: IndicesFieldUsageStatsResponse[]
): AggregatedFieldStats[] {
  const fieldStatsMap = new Map<string, AggregatedFieldStats>();

  for (const response of responses) {
    // The response contains _shards metadata and index data
    // We need to iterate through all keys that aren't _shards
    for (const [key, indexData] of Object.entries(response)) {
      if (key === '_shards' || !indexData || typeof indexData !== 'object') {
        continue;
      }

      // Type assertion - indexData should have shards array
      const shardData = indexData as {
        shards?: Array<{
          stats?: {
            all_fields?: Record<string, number>;
            fields?: Record<
              string,
              {
                any?: number;
                inverted_index?: {
                  terms?: number;
                  postings?: number;
                  proximity?: number;
                  positions?: number;
                  term_frequencies?: number;
                  offsets?: number;
                  payloads?: number;
                };
                stored_fields?: number;
                doc_values?: number;
                points?: number;
                norms?: number;
                term_vectors?: number;
                knn_vectors?: number;
              }
            >;
          };
        }>;
      };

      if (!shardData.shards) {
        continue;
      }

      for (const shard of shardData.shards) {
        if (!shard.stats?.fields) {
          continue;
        }

        for (const [fieldName, fieldStats] of Object.entries(shard.stats.fields)) {
          let aggregated = fieldStatsMap.get(fieldName);
          if (!aggregated) {
            aggregated = createEmptyFieldStats(fieldName);
            fieldStatsMap.set(fieldName, aggregated);
          }

          // Aggregate all the numeric counts
          aggregated.any += fieldStats.any ?? 0;
          aggregated.stored_fields += fieldStats.stored_fields ?? 0;
          aggregated.doc_values += fieldStats.doc_values ?? 0;
          aggregated.points += fieldStats.points ?? 0;
          aggregated.norms += fieldStats.norms ?? 0;
          aggregated.term_vectors += fieldStats.term_vectors ?? 0;
          aggregated.knn_vectors += fieldStats.knn_vectors ?? 0;

          // Aggregate inverted index stats
          if (fieldStats.inverted_index) {
            aggregated.inverted_index.terms += fieldStats.inverted_index.terms ?? 0;
            aggregated.inverted_index.postings += fieldStats.inverted_index.postings ?? 0;
            aggregated.inverted_index.proximity += fieldStats.inverted_index.proximity ?? 0;
            aggregated.inverted_index.positions += fieldStats.inverted_index.positions ?? 0;
            aggregated.inverted_index.term_frequencies +=
              fieldStats.inverted_index.term_frequencies ?? 0;
            aggregated.inverted_index.offsets += fieldStats.inverted_index.offsets ?? 0;
            aggregated.inverted_index.payloads += fieldStats.inverted_index.payloads ?? 0;
          }
        }
      }
    }
  }

  // Convert map to array and sort by total usage (any) descending
  return Array.from(fieldStatsMap.values()).sort((a, b) => b.any - a.any);
}
