/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildGapsFilter } from '../../../../lib/rule_gaps/build_gaps_filter';
import type { AggregatedGapStatus } from '../../../../../common/constants';
import { aggregatedGapStatus } from '../../../../../common/constants';
export interface TimeRangeInput {
  from?: string;
  to?: string;
}

export interface ResolvedTimeRange {
  from: string;
  to: string;
}

export function resolveTimeRange(timeRange?: TimeRangeInput): ResolvedTimeRange {
  const now = new Date();
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  const fromDefault = ninetyDaysAgo.toISOString();
  const toDefault = now.toISOString();
  const from = timeRange?.from ?? fromDefault;
  const to = timeRange?.to ?? toDefault;
  return { from, to };
}

export function buildBaseGapsFilter(from: string, to: string): string {
  return buildGapsFilter({ start: from, end: to });
}

export function computeAggregatedStatusFromIntervals(
  hasUnfilled: boolean,
  hasInProgress: boolean,
  hasFilled: boolean
): AggregatedGapStatus {
  if (hasUnfilled) return aggregatedGapStatus.UNFILLED;
  if (hasInProgress) return aggregatedGapStatus.IN_PROGRESS;
  if (hasFilled) return aggregatedGapStatus.FILLED;
  return null;
}
