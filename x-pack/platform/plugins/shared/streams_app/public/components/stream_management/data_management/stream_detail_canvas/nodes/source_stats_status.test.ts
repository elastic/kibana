/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SourceStatsView } from '../../../../../services/unit_stats_client/types';
import type { StatsEntry } from '../../../../unit_stats/state_management/types';
import {
  getSourceFlowStatus,
  SOURCE_TYPES_WITH_STATS,
  type SourceFlowStatus,
} from './source_stats_status';

const statsWithRate = (acceptedRate: number | null): SourceStatsView => ({ acceptedRate });

describe('getSourceFlowStatus', () => {
  it.each<[string, StatsEntry<SourceStatsView> | undefined, SourceFlowStatus]>([
    ['no entry yet shows no status', undefined, 'unknown'],
    ['a request in flight shows no status', { status: 'loading' }, 'unknown'],
    [
      'an error shows no status, so a failure never claims the source is waiting',
      { status: 'error', error: { code: 'unavailable', reason: 'Elasticsearch is unavailable' } },
      'unknown',
    ],
    [
      'a result with no data is waiting',
      { status: 'noData', stats: statsWithRate(null) },
      'waiting',
    ],
    ['an accepted rate above 0 is live', { status: 'ready', stats: statsWithRate(3700) }, 'live'],
    ['a tiny rate is live', { status: 'ready', stats: statsWithRate(0.004) }, 'live'],
    [
      'a rate of exactly 0, as for a source that only had failures, is waiting',
      { status: 'ready', stats: statsWithRate(0) },
      'waiting',
    ],
    ['a stale value keeps live', { status: 'stale', stats: statsWithRate(3700) }, 'live'],
    ['a stale value keeps waiting', { status: 'stale', stats: statsWithRate(0) }, 'waiting'],
    ['a stale entry without values shows no status', { status: 'stale' }, 'unknown'],
  ])('%s', (_description, entry, expected) => {
    expect(getSourceFlowStatus(entry)).toBe(expected);
  });
});

describe('SOURCE_TYPES_WITH_STATS', () => {
  it('holds the managed source types, and not the direct ones', () => {
    expect([...SOURCE_TYPES_WITH_STATS].sort()).toEqual([
      'async_bulk',
      'otlp',
      'prometheus_remote_write',
    ]);
  });
});
