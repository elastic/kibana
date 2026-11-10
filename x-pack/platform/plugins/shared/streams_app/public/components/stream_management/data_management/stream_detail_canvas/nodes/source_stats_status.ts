/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SourceStatsView } from '../../../../../services/unit_stats_client/types';
import type { StatsEntry } from '../../../../unit_stats/state_management/types';
import type { SourceType } from '../../../../streams_layout/sources/types';

export type SourceFlowStatus = 'live' | 'waiting' | 'unknown';

/**
 * The source types that report metrics. They are the managed sources, served by the ingest
 * collector. A direct source posts to an Elasticsearch endpoint, so it never reaches the collector
 * and has no metrics.
 */
export const SOURCE_TYPES_WITH_STATS: ReadonlyArray<SourceType> = [
  'otlp',
  'async_bulk',
  'prometheus_remote_write',
];

/**
 * - `live`: the accepted rate is above 0.
 * - `waiting`: the result has no data, or the accepted rate is `null` or 0.
 * - `unknown`: nothing is known yet, or the request failed. The node shows no status, so a load
 *   or a failure never claims that the source is waiting for data.
 *
 * The rate is an average over the whole window, so `live` means data arrived within the window,
 * not right now. The rate counts only accepted items, so a source that only gets refused or
 * failed items is `waiting`. A stale value keeps its last status.
 */
export const getSourceFlowStatus = (
  entry: StatsEntry<SourceStatsView> | undefined
): SourceFlowStatus => {
  if (!entry) return 'unknown';

  switch (entry.status) {
    case 'noData':
      return 'waiting';
    case 'ready':
    case 'stale': {
      if (!entry.stats) return 'unknown';
      const { acceptedRate } = entry.stats;
      return acceptedRate !== null && acceptedRate > 0 ? 'live' : 'waiting';
    }
    case 'loading':
    case 'error':
    default:
      return 'unknown';
  }
};
