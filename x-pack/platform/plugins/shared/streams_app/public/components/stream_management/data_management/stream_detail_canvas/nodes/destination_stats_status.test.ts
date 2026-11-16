/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DestinationStatsView } from '../../../../../services/unit_stats_client/types';
import type { StatsEntry } from '../../../../unit_stats/state_management/types';
import { getDestinationFlowStatus } from './destination_stats_status';
import type { DestinationFlowStatus } from './destination_stats_status';

const statsWithRate = (eventsRate: number | null): DestinationStatsView => ({
  eventsRate,
  eventsTotal: null,
  failedRate: null,
  latencyAverage: null,
  series: { bucketMs: 300000, points: [] },
});

describe('getDestinationFlowStatus', () => {
  it.each<[string, StatsEntry<DestinationStatsView> | undefined, DestinationFlowStatus]>([
    ['no entry yet shows no status', undefined, 'unknown'],
    ['a request in flight shows no status', { status: 'loading' }, 'unknown'],
    [
      'an error shows no status, so a failure never claims data is not flowing',
      { status: 'error', error: { code: 'unavailable', reason: 'Elasticsearch is unavailable' } },
      'unknown',
    ],
    [
      'a result with no data is not flowing',
      { status: 'noData', stats: statsWithRate(null) },
      'notFlowing',
    ],
    ['a rate above 0 is live', { status: 'ready', stats: statsWithRate(3700) }, 'live'],
    ['a tiny rate is live', { status: 'ready', stats: statsWithRate(0.004) }, 'live'],
    [
      'a rate of exactly 0 is not flowing',
      { status: 'ready', stats: statsWithRate(0) },
      'notFlowing',
    ],
    [
      'a result with other values but no rate is not flowing',
      { status: 'ready', stats: { ...statsWithRate(null), latencyAverage: 0.012 } },
      'notFlowing',
    ],
    ['a stale value keeps live', { status: 'stale', stats: statsWithRate(3700) }, 'live'],
    ['a stale value keeps not flowing', { status: 'stale', stats: statsWithRate(0) }, 'notFlowing'],
    ['a stale entry without values shows no status', { status: 'stale' }, 'unknown'],
  ])('%s', (_description, entry, expected) => {
    expect(getDestinationFlowStatus(entry)).toBe(expected);
  });
});
