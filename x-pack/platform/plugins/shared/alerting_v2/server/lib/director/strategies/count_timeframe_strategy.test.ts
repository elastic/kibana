/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CountTimeframeStrategy } from './count_timeframe_strategy';
import { alertEpisodeStatus, alertEventStatus } from '../../../resources/alert_events';
import type { AlertEpisodeStatus, AlertEventStatus } from '../../../resources/alert_events';
import type { StateTransition } from '@kbn/alerting-v2-schemas';
import { createAlertEvent } from '../../rule_executor/test_utils';
import { createRuleResponse } from '../../test_utils';
import type { StateTransitionContext } from './types';
import type { LatestAlertEventState } from '../queries';

const buildCtx = ({
  episodeStatus,
  eventStatus,
  statusCount,
  stateTransition,
  eventTimestamp,
  previousTimestamp,
}: {
  episodeStatus?: AlertEpisodeStatus | null;
  eventStatus: AlertEventStatus;
  statusCount?: number | null;
  stateTransition?: StateTransition;
  eventTimestamp?: string;
  previousTimestamp?: string | null;
}): StateTransitionContext => ({
  rule: createRuleResponse({ stateTransition }),
  alertEvent: createAlertEvent({
    status: eventStatus,
    '@timestamp': eventTimestamp ?? '2025-01-01T00:00:00.000Z',
  }),
  ...(episodeStatus !== undefined
    ? {
        previousEpisode: {
          last_status: eventStatus,
          last_episode_id: 'episode-1',
          last_episode_status: episodeStatus,
          last_episode_status_count: statusCount ?? null,
          last_episode_timestamp: previousTimestamp ?? '2025-01-01T00:00:00.000Z',
          group_hash: 'hash-1',
        } as LatestAlertEventState,
      }
    : {}),
});

describe('CountTimeframeStrategy', () => {
  let strategy: CountTimeframeStrategy;

  beforeEach(() => {
    strategy = new CountTimeframeStrategy();
  });

  it('has name "count_timeframe"', () => {
    expect(strategy.name).toBe('count_timeframe');
  });

  describe('canHandle', () => {
    it('returns true when rule has stateTransition', () => {
      expect(strategy.canHandle(createRuleResponse({ stateTransition: { pendingCount: 3 } }))).toBe(
        true
      );
    });

    it('returns true when stateTransition is an empty object', () => {
      expect(strategy.canHandle(createRuleResponse({ stateTransition: {} }))).toBe(true);
    });

    it('returns false when stateTransition is undefined', () => {
      expect(strategy.canHandle(createRuleResponse({ stateTransition: undefined }))).toBe(false);
    });

    it('returns false when stateTransition is null', () => {
      expect(strategy.canHandle(createRuleResponse({ stateTransition: null }))).toBe(false);
    });
  });

  describe('without stateTransition config (falls back to basic)', () => {
    it('transitions inactive → pending on breach (no statusCount)', () => {
      const result = strategy.getNextState(
        buildCtx({
          episodeStatus: alertEpisodeStatus.inactive,
          eventStatus: alertEventStatus.breached,
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.pending });
    });

    it('transitions pending → active on breach', () => {
      const result = strategy.getNextState(
        buildCtx({
          episodeStatus: alertEpisodeStatus.pending,
          eventStatus: alertEventStatus.breached,
          statusCount: 1,
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.active });
    });
  });

  describe('pendingCount threshold', () => {
    const stateTransition: StateTransition = { pendingCount: 3 };

    it('enters pending with statusCount 1 from inactive', () => {
      const result = strategy.getNextState(
        buildCtx({
          episodeStatus: alertEpisodeStatus.inactive,
          eventStatus: alertEventStatus.breached,
          stateTransition,
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.pending, statusCount: 1 });
    });

    it('enters pending with statusCount 1 when no previous episode', () => {
      const result = strategy.getNextState(
        buildCtx({
          eventStatus: alertEventStatus.breached,
          stateTransition,
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.pending, statusCount: 1 });
    });

    it('stays in pending when count threshold not met', () => {
      const result = strategy.getNextState(
        buildCtx({
          episodeStatus: alertEpisodeStatus.pending,
          eventStatus: alertEventStatus.breached,
          statusCount: 1,
          stateTransition,
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.pending, statusCount: 2 });
    });

    it('stays in pending when count is one below threshold', () => {
      const result = strategy.getNextState(
        buildCtx({
          episodeStatus: alertEpisodeStatus.pending,
          eventStatus: alertEventStatus.breached,
          statusCount: 1,
          stateTransition: { pendingCount: 3 },
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.pending, statusCount: 2 });
    });

    it('transitions to active when count threshold is met', () => {
      const result = strategy.getNextState(
        buildCtx({
          episodeStatus: alertEpisodeStatus.pending,
          eventStatus: alertEventStatus.breached,
          statusCount: 2,
          stateTransition,
        })
      );
      // 2 + 1 = 3, meets threshold of 3
      expect(result).toEqual({ status: alertEpisodeStatus.active });
    });

    it('transitions to active when count exceeds threshold', () => {
      const result = strategy.getNextState(
        buildCtx({
          episodeStatus: alertEpisodeStatus.pending,
          eventStatus: alertEventStatus.breached,
          statusCount: 5,
          stateTransition,
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.active });
    });

    it('still transitions pending → inactive on recovered event', () => {
      const result = strategy.getNextState(
        buildCtx({
          episodeStatus: alertEpisodeStatus.pending,
          eventStatus: alertEventStatus.recovered,
          statusCount: 1,
          stateTransition,
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.inactive });
    });

    it('stays pending on no_data event', () => {
      const result = strategy.getNextState(
        buildCtx({
          episodeStatus: alertEpisodeStatus.pending,
          eventStatus: alertEventStatus.no_data,
          statusCount: 2,
          stateTransition,
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.pending });
    });
  });

  describe('pendingTimeframe threshold', () => {
    it('transitions to active when timeframe is met', () => {
      const result = strategy.getNextState(
        buildCtx({
          episodeStatus: alertEpisodeStatus.pending,
          eventStatus: alertEventStatus.breached,
          statusCount: 1,
          eventTimestamp: '2025-01-01T00:02:00.000Z',
          previousTimestamp: '2025-01-01T00:00:00.000Z',
          stateTransition: { pendingTimeframe: '2m' },
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.active });
    });

    it('stays pending when timeframe is not met', () => {
      const result = strategy.getNextState(
        buildCtx({
          episodeStatus: alertEpisodeStatus.pending,
          eventStatus: alertEventStatus.breached,
          statusCount: 2,
          eventTimestamp: '2025-01-01T00:03:00.000Z',
          previousTimestamp: '2025-01-01T00:00:00.000Z',
          stateTransition: { pendingTimeframe: '5m' },
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.pending, statusCount: 3 });
    });

    it('uses OR to combine count and timeframe', () => {
      const result = strategy.getNextState(
        buildCtx({
          episodeStatus: alertEpisodeStatus.pending,
          eventStatus: alertEventStatus.breached,
          statusCount: 1,
          eventTimestamp: '2025-01-01T00:02:00.000Z',
          previousTimestamp: '2025-01-01T00:00:00.000Z',
          stateTransition: {
            pendingCount: 5,
            pendingTimeframe: '2m',
            pendingOperator: 'OR',
          },
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.active });
    });

    it('uses AND to combine count and timeframe', () => {
      const result = strategy.getNextState(
        buildCtx({
          episodeStatus: alertEpisodeStatus.pending,
          eventStatus: alertEventStatus.breached,
          statusCount: 1,
          eventTimestamp: '2025-01-01T00:02:00.000Z',
          previousTimestamp: '2025-01-01T00:00:00.000Z',
          stateTransition: {
            pendingCount: 5,
            pendingTimeframe: '2m',
            pendingOperator: 'AND',
          },
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.pending, statusCount: 2 });
    });
  });

  describe('pendingCount of 0 (skip pending)', () => {
    const stateTransition: StateTransition = { pendingCount: 0 };

    it('transitions directly to active from inactive on breach', () => {
      const result = strategy.getNextState(
        buildCtx({
          episodeStatus: alertEpisodeStatus.inactive,
          eventStatus: alertEventStatus.breached,
          stateTransition,
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.active });
    });

    it('transitions directly to active when no previous episode', () => {
      const result = strategy.getNextState(
        buildCtx({
          eventStatus: alertEventStatus.breached,
          stateTransition,
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.active });
    });
  });

  describe('recoveringCount threshold', () => {
    const stateTransition: StateTransition = { recoveringCount: 3 };

    it('enters recovering with statusCount 1 from active', () => {
      const result = strategy.getNextState(
        buildCtx({
          episodeStatus: alertEpisodeStatus.active,
          eventStatus: alertEventStatus.recovered,
          stateTransition,
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.recovering, statusCount: 1 });
    });

    it('stays recovering when count threshold not met', () => {
      const result = strategy.getNextState(
        buildCtx({
          episodeStatus: alertEpisodeStatus.recovering,
          eventStatus: alertEventStatus.recovered,
          statusCount: 1,
          stateTransition,
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.recovering, statusCount: 2 });
    });

    it('transitions to inactive when count threshold is met', () => {
      const result = strategy.getNextState(
        buildCtx({
          episodeStatus: alertEpisodeStatus.recovering,
          eventStatus: alertEventStatus.recovered,
          statusCount: 2,
          stateTransition,
        })
      );
      // 2 + 1 = 3, meets threshold of 3
      expect(result).toEqual({ status: alertEpisodeStatus.inactive });
    });

    it('still transitions recovering → active on breached event', () => {
      const result = strategy.getNextState(
        buildCtx({
          episodeStatus: alertEpisodeStatus.recovering,
          eventStatus: alertEventStatus.breached,
          statusCount: 1,
          stateTransition,
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.active });
    });

    it('stays recovering on no_data event', () => {
      const result = strategy.getNextState(
        buildCtx({
          episodeStatus: alertEpisodeStatus.recovering,
          eventStatus: alertEventStatus.no_data,
          statusCount: 2,
          stateTransition,
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.recovering });
    });
  });

  describe('recoveringTimeframe threshold', () => {
    it('transitions to inactive when timeframe is met', () => {
      const result = strategy.getNextState(
        buildCtx({
          episodeStatus: alertEpisodeStatus.recovering,
          eventStatus: alertEventStatus.recovered,
          statusCount: 1,
          eventTimestamp: '2025-01-01T00:02:00.000Z',
          previousTimestamp: '2025-01-01T00:00:00.000Z',
          stateTransition: { recoveringTimeframe: '2m' },
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.inactive });
    });

    it('stays recovering when timeframe is not met', () => {
      const result = strategy.getNextState(
        buildCtx({
          episodeStatus: alertEpisodeStatus.recovering,
          eventStatus: alertEventStatus.recovered,
          statusCount: 2,
          eventTimestamp: '2025-01-01T00:03:00.000Z',
          previousTimestamp: '2025-01-01T00:00:00.000Z',
          stateTransition: { recoveringTimeframe: '5m' },
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.recovering, statusCount: 3 });
    });

    it('uses OR to combine count and timeframe', () => {
      const result = strategy.getNextState(
        buildCtx({
          episodeStatus: alertEpisodeStatus.recovering,
          eventStatus: alertEventStatus.recovered,
          statusCount: 1,
          eventTimestamp: '2025-01-01T00:02:00.000Z',
          previousTimestamp: '2025-01-01T00:00:00.000Z',
          stateTransition: {
            recoveringCount: 5,
            recoveringTimeframe: '2m',
            recoveringOperator: 'OR',
          },
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.inactive });
    });

    it('uses AND to combine count and timeframe', () => {
      const result = strategy.getNextState(
        buildCtx({
          episodeStatus: alertEpisodeStatus.recovering,
          eventStatus: alertEventStatus.recovered,
          statusCount: 1,
          eventTimestamp: '2025-01-01T00:02:00.000Z',
          previousTimestamp: '2025-01-01T00:00:00.000Z',
          stateTransition: {
            recoveringCount: 5,
            recoveringTimeframe: '2m',
            recoveringOperator: 'AND',
          },
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.recovering, statusCount: 2 });
    });
  });

  describe('recoveringCount of 0 (skip recovering)', () => {
    const stateTransition: StateTransition = { recoveringCount: 0 };

    it('transitions directly to inactive from active on recovered', () => {
      const result = strategy.getNextState(
        buildCtx({
          episodeStatus: alertEpisodeStatus.active,
          eventStatus: alertEventStatus.recovered,
          stateTransition,
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.inactive });
    });
  });

  describe('combined pending and recovering thresholds', () => {
    const stateTransition: StateTransition = { pendingCount: 2, recoveringCount: 2 };

    it('applies pending threshold independently of recovering', () => {
      const result = strategy.getNextState(
        buildCtx({
          episodeStatus: alertEpisodeStatus.pending,
          eventStatus: alertEventStatus.breached,
          statusCount: 1,
          stateTransition,
        })
      );
      // 1 + 1 = 2, meets pending threshold of 2
      expect(result).toEqual({ status: alertEpisodeStatus.active });
    });

    it('applies recovering threshold independently of pending', () => {
      const result = strategy.getNextState(
        buildCtx({
          episodeStatus: alertEpisodeStatus.recovering,
          eventStatus: alertEventStatus.recovered,
          statusCount: 1,
          stateTransition,
        })
      );
      // 1 + 1 = 2, meets recovering threshold of 2
      expect(result).toEqual({ status: alertEpisodeStatus.inactive });
    });
  });

  describe('null/zero previous status count', () => {
    it('treats null previous status count as 0', () => {
      const result = strategy.getNextState(
        buildCtx({
          episodeStatus: alertEpisodeStatus.pending,
          eventStatus: alertEventStatus.breached,
          statusCount: null,
          stateTransition: { pendingCount: 3 },
        })
      );
      // 0 + 1 = 1 < 3, stay pending
      expect(result).toEqual({ status: alertEpisodeStatus.pending, statusCount: 1 });
    });
  });

  describe('unaffected transitions (same as basic)', () => {
    const stateTransition: StateTransition = { pendingCount: 5, recoveringCount: 5 };

    it('stays active on breached', () => {
      const result = strategy.getNextState(
        buildCtx({
          episodeStatus: alertEpisodeStatus.active,
          eventStatus: alertEventStatus.breached,
          stateTransition,
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.active });
    });

    it('stays inactive on recovered', () => {
      const result = strategy.getNextState(
        buildCtx({
          episodeStatus: alertEpisodeStatus.inactive,
          eventStatus: alertEventStatus.recovered,
          stateTransition,
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.inactive });
    });

    it('stays inactive on no_data', () => {
      const result = strategy.getNextState(
        buildCtx({
          episodeStatus: alertEpisodeStatus.inactive,
          eventStatus: alertEventStatus.no_data,
          stateTransition,
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.inactive });
    });
  });
});
