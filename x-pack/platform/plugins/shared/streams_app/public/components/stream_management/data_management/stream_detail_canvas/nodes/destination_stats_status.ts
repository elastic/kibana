/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DestinationStatsView } from '../../../../../services/unit_stats_client/types';
import type { StatsEntry } from '../../../../unit_stats/state_management/types';
import type { DestinationViewModel } from '../../../../streams_layout/destinations/types';

export type DestinationFlowStatus = 'live' | 'notFlowing' | 'unknown';

/**
 * The destination types that currently report collector metrics.
 */
export const DESTINATION_TYPES_WITH_STATS: ReadonlyArray<DestinationViewModel['type']> = [
  'elasticsearch',
];

/**
 * - `live`: the rate is above 0.
 * - `notFlowing`: the result has no data, or the rate is `null` or 0.
 * - `unknown`: nothing is known yet, or the request failed. The node shows no status, so a load
 *   or a failure never claims that data is not flowing.
 *
 * The rate is an average over the whole window, so `live` means data arrived within the window,
 * not right now. A short gap in ingest does not flicker the status, and the status is slow to
 * clear after data stops. The rate counts every outcome, so a destination that rejects what it
 * receives is still `live`. A stale value keeps its last status.
 */
export const getDestinationFlowStatus = (
  entry: StatsEntry<DestinationStatsView> | undefined
): DestinationFlowStatus => {
  if (!entry) return 'unknown';

  switch (entry.status) {
    case 'noData':
      return 'notFlowing';
    case 'ready':
    case 'stale': {
      if (!entry.stats) return 'unknown';
      const { eventsRate } = entry.stats;
      return eventsRate !== null && eventsRate > 0 ? 'live' : 'notFlowing';
    }
    case 'loading':
    case 'error':
    default:
      return 'unknown';
  }
};
