/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CountTimeframeStrategy } from './count_timeframe_strategy';
import { alertEpisodeStatus, alertEventStatus } from '../../../resources/alert_events';
import type { StateTransition } from '@kbn/alerting-v2-schemas';
import { createRuleResponse } from '../../test_utils';
import { buildLatestAlertEvent, buildStrategyStateTransitionContext } from '../test_utils';

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
    it('transitions inactive to pending on breach (no statusCount)', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.breached,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: alertEpisodeStatus.inactive,
            eventStatus: alertEventStatus.breached,
          }),
        })
      );

      expect(result).toEqual({ status: alertEpisodeStatus.pending });
    });

    it('transitions pending to active on breach', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.breached,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: alertEpisodeStatus.pending,
            eventStatus: alertEventStatus.breached,
            statusCount: 1,
          }),
        })
      );

      expect(result).toEqual({ status: alertEpisodeStatus.active });
    });

    it('transitions active to recovering on breach (no statusCount)', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.recovered,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: alertEpisodeStatus.active,
            eventStatus: alertEventStatus.recovered,
          }),
        })
      );

      expect(result).toEqual({ status: alertEpisodeStatus.recovering });
    });

    it('transitions recovering to inactive on breach (no statusCount)', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.recovered,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: alertEpisodeStatus.recovering,
            eventStatus: alertEventStatus.recovered,
          }),
        })
      );

      expect(result).toEqual({ status: alertEpisodeStatus.inactive });
    });
  });

  describe('pendingCount of 0 (skip pending)', () => {
    const stateTransition: StateTransition = { pendingCount: 0 };

    it('transitions directly to active from inactive on breach', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.breached,
          stateTransition,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: alertEpisodeStatus.inactive,
            eventStatus: alertEventStatus.breached,
          }),
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.active, statusCount: 1 });
    });

    it('transitions directly to active when no previous episode', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.breached,
          stateTransition,
        })
      );

      expect(result).toEqual({ status: alertEpisodeStatus.active, statusCount: 1 });
    });
  });

  describe('pendingCount threshold', () => {
    const stateTransition: StateTransition = { pendingCount: 3 };

    it('enters pending with statusCount 1 from inactive', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.breached,
          stateTransition,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: alertEpisodeStatus.inactive,
            eventStatus: alertEventStatus.breached,
          }),
        })
      );

      expect(result).toEqual({ status: alertEpisodeStatus.pending, statusCount: 1 });
    });

    it('enters pending with statusCount 1 when no previous episode', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.breached,
          stateTransition,
        })
      );

      expect(result).toEqual({ status: alertEpisodeStatus.pending, statusCount: 1 });
    });

    it('stays in pending when count threshold not met', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.breached,
          stateTransition,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: alertEpisodeStatus.pending,
            eventStatus: alertEventStatus.breached,
            statusCount: 1,
          }),
        })
      );

      expect(result).toEqual({ status: alertEpisodeStatus.pending, statusCount: 2 });
    });

    it('transitions to active when count threshold is met', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.breached,
          stateTransition,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: alertEpisodeStatus.pending,
            eventStatus: alertEventStatus.breached,
            statusCount: 2,
          }),
        })
      );

      expect(result).toEqual({ status: alertEpisodeStatus.active, statusCount: 1 });
    });

    it('transitions to active when count exceeds threshold', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.breached,
          stateTransition,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: alertEpisodeStatus.pending,
            eventStatus: alertEventStatus.breached,
            statusCount: 5,
          }),
        })
      );

      expect(result).toEqual({ status: alertEpisodeStatus.active, statusCount: 1 });
    });

    it('still transitions pending to inactive on recovered event', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.recovered,
          stateTransition,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: alertEpisodeStatus.pending,
            eventStatus: alertEventStatus.recovered,
            statusCount: 3,
          }),
        })
      );

      expect(result).toEqual({ status: alertEpisodeStatus.inactive });
    });
  });

  describe('pendingTimeframe threshold', () => {
    it('transitions to active when timeframe is met', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.breached,
          eventTimestamp: '2025-01-01T00:02:00.000Z',
          stateTransition: { pendingTimeframe: '2m' },
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: alertEpisodeStatus.pending,
            eventStatus: alertEventStatus.breached,
            statusCount: 1,
            previousTimestamp: '2025-01-01T00:00:00.000Z',
          }),
        })
      );

      expect(result).toEqual({ status: alertEpisodeStatus.active, statusCount: 1 });
    });

    it('stays pending when timeframe is not met', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.breached,
          eventTimestamp: '2025-01-01T00:03:00.000Z',
          stateTransition: { pendingTimeframe: '5m' },
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: alertEpisodeStatus.pending,
            eventStatus: alertEventStatus.breached,
            statusCount: 2,
            previousTimestamp: '2025-01-01T00:00:00.000Z',
          }),
        })
      );

      expect(result).toEqual({ status: alertEpisodeStatus.pending, statusCount: 3 });
    });

    it('uses OR to combine count and timeframe', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.breached,
          eventTimestamp: '2025-01-01T00:02:00.000Z',
          stateTransition: {
            pendingCount: 5,
            pendingTimeframe: '2m',
            pendingOperator: 'OR',
          },
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: alertEpisodeStatus.pending,
            eventStatus: alertEventStatus.breached,
            statusCount: 1,
            previousTimestamp: '2025-01-01T00:00:00.000Z',
          }),
        })
      );

      expect(result).toEqual({ status: alertEpisodeStatus.active, statusCount: 1 });
    });

    it('uses AND to combine count and timeframe', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.breached,
          eventTimestamp: '2025-01-01T00:02:00.000Z',
          stateTransition: {
            pendingCount: 5,
            pendingTimeframe: '2m',
            pendingOperator: 'AND',
          },
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: alertEpisodeStatus.pending,
            eventStatus: alertEventStatus.breached,
            statusCount: 1,
            previousTimestamp: '2025-01-01T00:00:00.000Z',
          }),
        })
      );

      expect(result).toEqual({ status: alertEpisodeStatus.pending, statusCount: 2 });
    });
  });

  describe('recoveringCount of 0 (skip recovering)', () => {
    const stateTransition: StateTransition = { recoveringCount: 0 };

    it('transitions directly to inactive from active on recovered', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.recovered,
          stateTransition,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: alertEpisodeStatus.active,
            eventStatus: alertEventStatus.recovered,
          }),
        })
      );

      expect(result).toEqual({ status: alertEpisodeStatus.inactive, statusCount: 1 });
    });
  });

  describe('recoveringCount threshold', () => {
    const stateTransition: StateTransition = { recoveringCount: 3 };

    it('enters recovering with statusCount 1 from active', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.recovered,
          stateTransition,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: alertEpisodeStatus.active,
            eventStatus: alertEventStatus.recovered,
          }),
        })
      );

      expect(result).toEqual({ status: alertEpisodeStatus.recovering, statusCount: 1 });
    });

    it('stays recovering when count threshold not met', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.recovered,
          stateTransition,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: alertEpisodeStatus.recovering,
            eventStatus: alertEventStatus.recovered,
            statusCount: 1,
          }),
        })
      );

      expect(result).toEqual({ status: alertEpisodeStatus.recovering, statusCount: 2 });
    });

    it('transitions to inactive when count threshold is met', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.recovered,
          stateTransition,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: alertEpisodeStatus.recovering,
            eventStatus: alertEventStatus.recovered,
            statusCount: 2,
          }),
        })
      );

      expect(result).toEqual({ status: alertEpisodeStatus.inactive, statusCount: 1 });
    });

    it('still transitions recovering to active on breached event', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.breached,
          stateTransition,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: alertEpisodeStatus.recovering,
            eventStatus: alertEventStatus.breached,
            statusCount: 1,
          }),
        })
      );

      expect(result).toEqual({ status: alertEpisodeStatus.active });
    });
  });

  describe('recoveringTimeframe threshold', () => {
    it('transitions to inactive when timeframe is met', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.recovered,
          eventTimestamp: '2025-01-01T00:02:00.000Z',
          stateTransition: { recoveringTimeframe: '2m' },
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: alertEpisodeStatus.recovering,
            eventStatus: alertEventStatus.recovered,
            statusCount: 1,
            previousTimestamp: '2025-01-01T00:00:00.000Z',
          }),
        })
      );

      expect(result).toEqual({ status: alertEpisodeStatus.inactive, statusCount: 1 });
    });

    it('stays recovering when timeframe is not met', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.recovered,
          eventTimestamp: '2025-01-01T00:03:00.000Z',
          stateTransition: { recoveringTimeframe: '5m' },
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: alertEpisodeStatus.recovering,
            eventStatus: alertEventStatus.recovered,
            statusCount: 2,
            previousTimestamp: '2025-01-01T00:00:00.000Z',
          }),
        })
      );

      expect(result).toEqual({ status: alertEpisodeStatus.recovering, statusCount: 3 });
    });

    it('uses OR to combine count and timeframe', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.recovered,
          eventTimestamp: '2025-01-01T00:02:00.000Z',
          stateTransition: {
            recoveringCount: 5,
            recoveringTimeframe: '2m',
            recoveringOperator: 'OR',
          },
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: alertEpisodeStatus.recovering,
            eventStatus: alertEventStatus.recovered,
            statusCount: 1,
            previousTimestamp: '2025-01-01T00:00:00.000Z',
          }),
        })
      );

      expect(result).toEqual({ status: alertEpisodeStatus.inactive, statusCount: 1 });
    });

    it('uses AND to combine count and timeframe', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.recovered,
          eventTimestamp: '2025-01-01T00:02:00.000Z',
          stateTransition: {
            recoveringCount: 5,
            recoveringTimeframe: '2m',
            recoveringOperator: 'AND',
          },
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: alertEpisodeStatus.recovering,
            eventStatus: alertEventStatus.recovered,
            statusCount: 1,
            previousTimestamp: '2025-01-01T00:00:00.000Z',
          }),
        })
      );

      expect(result).toEqual({ status: alertEpisodeStatus.recovering, statusCount: 2 });
    });
  });

  describe('combined pending and recovering thresholds', () => {
    const stateTransition: StateTransition = { pendingCount: 2, recoveringCount: 2 };

    it('applies pending threshold independently of recovering', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.breached,
          stateTransition,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: alertEpisodeStatus.pending,
            eventStatus: alertEventStatus.breached,
            statusCount: 1,
          }),
        })
      );

      expect(result).toEqual({ status: alertEpisodeStatus.active, statusCount: 1 });
    });

    it('applies recovering threshold independently of pending', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.recovered,
          stateTransition,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: alertEpisodeStatus.recovering,
            eventStatus: alertEventStatus.recovered,
            statusCount: 1,
          }),
        })
      );

      expect(result).toEqual({ status: alertEpisodeStatus.inactive, statusCount: 1 });
    });
  });

  describe('no previous episode or status count', () => {
    it('treats status count as 0 when the previous episode is not present', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.breached,
          stateTransition: { pendingCount: 3 },
        })
      );

      expect(result).toEqual({ status: alertEpisodeStatus.pending, statusCount: 1 });
    });

    it('treats status count as 1 when the previous episode is present but the status count no', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.breached,
          stateTransition: { pendingCount: 3 },
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: alertEpisodeStatus.pending,
            eventStatus: alertEventStatus.breached,
            statusCount: null,
          }),
        })
      );

      expect(result).toEqual({ status: alertEpisodeStatus.pending, statusCount: 2 });
    });
  });

  describe('unaffected transitions (same as basic)', () => {
    const stateTransition: StateTransition = { pendingCount: 5, recoveringCount: 5 };

    it('stays active on breached', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.breached,
          stateTransition,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: alertEpisodeStatus.active,
            eventStatus: alertEventStatus.breached,
          }),
        })
      );

      expect(result).toEqual({ status: alertEpisodeStatus.active });
    });

    it('stays inactive on recovered', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.recovered,
          stateTransition,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: alertEpisodeStatus.inactive,
            eventStatus: alertEventStatus.recovered,
          }),
        })
      );

      expect(result).toEqual({ status: alertEpisodeStatus.inactive });
    });

    it('stays inactive on no_data', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.no_data,
          stateTransition,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: alertEpisodeStatus.inactive,
            eventStatus: alertEventStatus.no_data,
          }),
        })
      );

      expect(result).toEqual({ status: alertEpisodeStatus.inactive });
    });
  });
});
