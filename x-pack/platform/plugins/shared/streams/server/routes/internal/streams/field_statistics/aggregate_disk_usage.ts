/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Response structure from Elasticsearch _disk_usage API.
 * Note: The ES client types this as `any`, so we define our own interface.
 */
export interface DiskUsageResponse {
  _shards: {
    total: number;
    successful: number;
    failed: number;
  };
  [indexName: string]:
    | {
        store_size_in_bytes: number;
        all_fields: DiskUsageFieldStats;
        fields: Record<string, DiskUsageFieldStats>;
      }
    | { total: number; successful: number; failed: number }; // _shards type
}

/**
 * Disk usage statistics for a field from the _disk_usage API.
 */
export interface DiskUsageFieldStats {
  total_in_bytes: number;
  inverted_index?: {
    total_in_bytes: number;
  };
  stored_fields_in_bytes?: number;
  doc_values_in_bytes?: number;
  points_in_bytes?: number;
  norms_in_bytes?: number;
  term_vectors_in_bytes?: number;
  knn_vectors_in_bytes?: number;
}

/**
 * Represents disk usage statistics for a single field, aggregated across all indices.
 */
export interface AggregatedFieldStats {
  /** Field name */
  name: string;
  /** Total disk usage in bytes across all storage types */
  total_in_bytes: number;
  /** Inverted index disk usage in bytes */
  inverted_index_in_bytes: number;
  /** Stored fields disk usage in bytes */
  stored_fields_in_bytes: number;
  /** Doc values disk usage in bytes */
  doc_values_in_bytes: number;
  /** Points (numeric range queries) disk usage in bytes */
  points_in_bytes: number;
  /** Norms disk usage in bytes */
  norms_in_bytes: number;
  /** Term vectors disk usage in bytes */
  term_vectors_in_bytes: number;
  /** KNN vectors disk usage in bytes */
  knn_vectors_in_bytes: number;
}

/**
 * Response from the field statistics endpoint.
 */
export interface FieldStatisticsResponse {
  /** Whether disk usage stats are supported in this environment */
  isSupported: boolean;
  /** Aggregated field disk usage statistics (empty if not supported) */
  fields: AggregatedFieldStats[];
  /** Total number of fields */
  totalFields: number;
}

/**
 * Creates an empty aggregated field stats object.
 */
function createEmptyFieldStats(name: string): AggregatedFieldStats {
  return {
    name,
    total_in_bytes: 0,
    inverted_index_in_bytes: 0,
    stored_fields_in_bytes: 0,
    doc_values_in_bytes: 0,
    points_in_bytes: 0,
    norms_in_bytes: 0,
    term_vectors_in_bytes: 0,
    knn_vectors_in_bytes: 0,
  };
}

/**
 * Type guard to check if a value is an index data object (not _shards).
 */
function isIndexData(value: unknown): value is {
  store_size_in_bytes: number;
  all_fields: DiskUsageFieldStats;
  fields: Record<string, DiskUsageFieldStats>;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    'fields' in value &&
    typeof (value as Record<string, unknown>).fields === 'object'
  );
}

/**
 * Aggregates disk usage statistics from Elasticsearch _disk_usage API response.
 *
 * When a stream has multiple backing indices, we need to aggregate the stats across
 * all indices. This function:
 * 1. Iterates through all indices in the response
 * 2. Aggregates field disk usage by summing across all indices
 *
 * @param response - Disk usage response from Elasticsearch
 * @returns Aggregated field statistics for all fields, sorted by total_in_bytes descending
 */
export function aggregateDiskUsage(response: DiskUsageResponse): AggregatedFieldStats[] {
  const fieldStatsMap = new Map<string, AggregatedFieldStats>();

  // Iterate through all keys that aren't _shards
  for (const [key, indexData] of Object.entries(response)) {
    if (key === '_shards' || !isIndexData(indexData)) {
      continue;
    }

    // Process all fields in this index
    for (const [fieldName, fieldStats] of Object.entries(indexData.fields)) {
      let aggregated = fieldStatsMap.get(fieldName);
      if (!aggregated) {
        aggregated = createEmptyFieldStats(fieldName);
        fieldStatsMap.set(fieldName, aggregated);
      }

      // Aggregate all the byte counts
      aggregated.total_in_bytes += fieldStats.total_in_bytes ?? 0;
      aggregated.inverted_index_in_bytes += fieldStats.inverted_index?.total_in_bytes ?? 0;
      aggregated.stored_fields_in_bytes += fieldStats.stored_fields_in_bytes ?? 0;
      aggregated.doc_values_in_bytes += fieldStats.doc_values_in_bytes ?? 0;
      aggregated.points_in_bytes += fieldStats.points_in_bytes ?? 0;
      aggregated.norms_in_bytes += fieldStats.norms_in_bytes ?? 0;
      aggregated.term_vectors_in_bytes += fieldStats.term_vectors_in_bytes ?? 0;
      aggregated.knn_vectors_in_bytes += fieldStats.knn_vectors_in_bytes ?? 0;
    }
  }

  // Convert map to array and sort by total disk usage descending
  return Array.from(fieldStatsMap.values()).sort((a, b) => b.total_in_bytes - a.total_in_bytes);
}
