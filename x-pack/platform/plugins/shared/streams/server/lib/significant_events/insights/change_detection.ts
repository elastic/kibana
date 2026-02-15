/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { SignificantEventsResponse } from '@kbn/streams-schema';

/** Change point types from ES aggregation */
type ChangePointType =
  | 'dip'
  | 'distribution_change'
  | 'non_stationary'
  | 'spike'
  | 'stationary'
  | 'step_change'
  | 'trend_change';

export interface ChangedQuery {
  /** The significant event data including query info, occurrences, and change_points */
  event: SignificantEventsResponse;
  /** Percentage change: positive = increase, negative = decrease */
  percentageChange: number;
  /** Absolute percentage change for sorting by impact */
  absoluteChange: number;
  /** Type of change detected (e.g., 'spike', 'dip', 'step_change') */
  changeType: string;
}

export interface ChangeFilterOptions {
  /** Minimum absolute percentage change to include (e.g., 20 for 20%) */
  changeThreshold?: number;
  /** Maximum number of queries to return after filtering */
  maxQueries?: number;
  /** Logger for debugging and limit notifications */
  logger?: Logger;
}

const DEFAULT_CHANGE_THRESHOLD = 20; // 20%
const DEFAULT_MAX_QUERIES = 50;

/** Change point types that indicate actual changes (not stationary) */
const SIGNIFICANT_CHANGE_TYPES: ChangePointType[] = [
  'spike',
  'dip',
  'step_change',
  'trend_change',
  'distribution_change',
];

/**
 * Computes percentage change from histogram occurrences relative to a change point.
 *
 * Algorithm: Sums counts before and after the change_point bucket index,
 * then calculates (after - before) / before * 100.
 *
 * @param occurrences - Array of {date, count} histogram buckets
 * @param changePointIndex - Bucket index where change was detected
 * @returns Percentage change (positive = increase, negative = decrease)
 *
 * @example
 * // Spike from nothing: 0→3 = 100%
 * computePercentageChange([{date: '1', count: 0}, {date: '2', count: 0}, {date: '3', count: 1}], 2) // 100
 *
 * @example
 * // 1% increase
 * computePercentageChange([..100s.., ..101s..], middleIndex) // ~1
 *
 * @example
 * // 50% decrease
 * computePercentageChange([..100s.., ..50s..], middleIndex) // -50
 */
export function computePercentageChange(
  occurrences: Array<{ date: string; count: number }>,
  changePointIndex: number
): number {
  if (occurrences.length === 0 || changePointIndex < 0 || changePointIndex >= occurrences.length) {
    return 0;
  }

  // Sum counts before change_point (exclusive)
  const before = occurrences.slice(0, changePointIndex).reduce((sum, b) => sum + b.count, 0);

  // Sum counts after change_point (inclusive)
  const after = occurrences.slice(changePointIndex).reduce((sum, b) => sum + b.count, 0);

  // Edge cases
  if (before === 0 && after === 0) {
    return 0;
  }

  // Spike from nothing - cap at 100%
  if (before === 0) {
    return 100;
  }

  return ((after - before) / before) * 100;
}

/**
 * Extracts the primary change point info from a SignificantEventsResponse.
 * Returns the first non-stationary change point type with its index.
 */
function extractChangePoint(event: SignificantEventsResponse): {
  type: ChangePointType | null;
  index: number;
} {
  const changePoints = event.change_points?.type;
  if (!changePoints) {
    return { type: null, index: 0 };
  }

  // Find the first significant (non-stationary) change type
  for (const changeType of SIGNIFICANT_CHANGE_TYPES) {
    const point = changePoints[changeType];
    if (point && typeof point.change_point === 'number') {
      return { type: changeType, index: point.change_point };
    }
  }

  // Check for stationary or non_stationary as fallback
  const stationary = changePoints.stationary;
  if (stationary && typeof stationary.change_point === 'number') {
    return { type: 'stationary', index: stationary.change_point };
  }

  const nonStationary = changePoints.non_stationary;
  if (nonStationary && typeof nonStationary.change_point === 'number') {
    return { type: 'non_stationary', index: nonStationary.change_point };
  }

  return { type: null, index: 0 };
}

/**
 * Type guard that determines if a change point type represents a significant change.
 */
function isSignificantChangeType(type: ChangePointType | null): type is ChangePointType {
  return type !== null && SIGNIFICANT_CHANGE_TYPES.includes(type);
}

/**
 * Filters significant events to only those with changes above the threshold.
 *
 * Process:
 * 1. For each event, extract change_point info
 * 2. Compute percentage change from histogram
 * 3. Filter by change type (must be spike, dip, etc.) and threshold
 * 4. Sort by absolute impact and take top X
 * 5. Log when limits are applied
 *
 * @param significantEvents - Events from readSignificantEventsFromAlertsIndices
 * @param options - Filter options (threshold, maxQueries, logger)
 * @returns Filtered and sorted list of ChangedQuery objects
 */
export function filterChangedQueries(
  significantEvents: SignificantEventsResponse[],
  options: ChangeFilterOptions = {}
): ChangedQuery[] {
  const {
    changeThreshold = DEFAULT_CHANGE_THRESHOLD,
    maxQueries = DEFAULT_MAX_QUERIES,
    logger,
  } = options;

  const queriesWithChange: ChangedQuery[] = [];

  for (const event of significantEvents) {
    const { type: changeType, index: changePointIndex } = extractChangePoint(event);

    // Skip events without significant change type
    if (!isSignificantChangeType(changeType)) {
      continue;
    }

    const percentageChange = computePercentageChange(event.occurrences, changePointIndex);
    const absoluteChange = Math.abs(percentageChange);

    // Filter by threshold (changeType is guaranteed non-null by type guard above)
    if (absoluteChange >= changeThreshold) {
      queriesWithChange.push({
        event,
        percentageChange,
        absoluteChange,
        changeType,
      });
    }
  }

  // Sort by absolute impact (highest first)
  queriesWithChange.sort((a, b) => b.absoluteChange - a.absoluteChange);

  const totalMatching = queriesWithChange.length;

  // Apply max limit
  if (totalMatching > maxQueries) {
    logger?.info(
      `[insights] Change filter limit applied: ${totalMatching} queries matched threshold (>=${changeThreshold}%), returning top ${maxQueries} by impact`
    );
    return queriesWithChange.slice(0, maxQueries);
  }

  if (logger && totalMatching > 0) {
    logger.debug(
      `[insights] Change filter: ${totalMatching} queries matched threshold (>=${changeThreshold}%)`
    );
  }

  return queriesWithChange;
}

/**
 * Groups changed queries by stream name.
 * Useful for per-stream insight generation or when limiting by stream.
 */
export function groupByStream(changedQueries: ChangedQuery[]): Map<string, ChangedQuery[]> {
  const byStream = new Map<string, ChangedQuery[]>();

  for (const query of changedQueries) {
    const streamName = query.event.stream_name;
    const existing = byStream.get(streamName) ?? [];
    existing.push(query);
    byStream.set(streamName, existing);
  }

  return byStream;
}

/**
 * Derives reasonable bucket size from time range if not specified.
 * Aims for approximately 24-48 buckets.
 */
export function deriveBucketSize(from: number, to: number, explicitBucketSize?: string): string {
  if (explicitBucketSize) {
    return explicitBucketSize;
  }

  const durationMs = to - from;
  const durationMinutes = durationMs / (1000 * 60);

  // Aim for ~30 buckets
  if (durationMinutes <= 60) {
    return '2m'; // 1 hour → 30 buckets
  }
  if (durationMinutes <= 360) {
    return '10m'; // 6 hours → 36 buckets
  }
  if (durationMinutes <= 1440) {
    return '30m'; // 24 hours → 48 buckets
  }
  if (durationMinutes <= 10080) {
    return '4h'; // 7 days → 42 buckets
  }
  return '12h'; // longer → reasonable buckets
}
