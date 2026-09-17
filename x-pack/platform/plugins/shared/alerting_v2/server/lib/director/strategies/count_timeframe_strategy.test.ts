/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CountTimeframeStrategy } from './count_timeframe_strategy';
import type {
  AlertEpisodeStatus,
  AlertEventStatus,
} from '../../../resources/datastreams/alert_events';
import { alertEpisodeStatus, alertEventStatus } from '../../../resources/datastreams/alert_events';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import { createRuleResponse } from '../../test_utils';
import { createLoggerService } from '../../services/logger_service/logger_service.mock';
import { buildLatestAlertEvent, buildStrategyStateTransitionContext } from '../test_utils';

describe('CountTimeframeStrategy', () => {
  let strategy: CountTimeframeStrategy;

  beforeEach(() => {
    const { loggerService } = createLoggerService();
    strategy = new CountTimeframeStrategy(loggerService);
  });

  const getNextState = (...args: Parameters<typeof buildStrategyStateTransitionContext>) =>
    strategy.getNextState(buildStrategyStateTransitionContext(...args));

  const expectTransition = ({
    from,
    on,
    to,
    stateTransition,
    noDataStrategy,
    statusCount,
    expectedStatusCount,
    eventTimestamp,
    previousTimestamp,
  }: {
    from?: AlertEpisodeStatus;
    on: AlertEventStatus;
    to: AlertEpisodeStatus;
    stateTransition?: RuleResponse['state_transition'];
    noDataStrategy?: RuleResponse['no_data_strategy'];
    statusCount?: number | null;
    expectedStatusCount?: number;
    eventTimestamp?: string;
    previousTimestamp?: string;
  }) => {
    const result = getNextState({
      eventStatus: on,
      stateTransition,
      noDataStrategy,
      eventTimestamp,
      ...(from != null
        ? {
            previousEpisode: buildLatestAlertEvent({
              episodeStatus: from,
              eventStatus: on,
              statusCount,
              previousTimestamp,
            }),
          }
        : {}),
    });

    expect(result).toEqual({
      status: to,
      ...(expectedStatusCount != null ? { statusCount: expectedStatusCount } : {}),
    });
  };

  it('has name "count_timeframe"', () => {
    expect(strategy.name).toBe('count_timeframe');
  });

  describe('canHandle', () => {
    it('returns true when rule has stateTransition', () => {
      expect(
        strategy.canHandle(createRuleResponse({ state_transition: { pending_count: 3 } }))
      ).toBe(true);
    });

    it('returns false when stateTransition is an empty object', () => {
      expect(strategy.canHandle(createRuleResponse({ state_transition: {} }))).toBe(false);
    });

    it('returns false when stateTransition is undefined', () => {
      expect(strategy.canHandle(createRuleResponse({ state_transition: undefined }))).toBe(false);
    });

    it('returns false when stateTransition is null', () => {
      expect(strategy.canHandle(createRuleResponse({ state_transition: null }))).toBe(false);
    });
  });

  describe('without stateTransition config (falls back to basic)', () => {
    it.each<[string, AlertEpisodeStatus, AlertEventStatus, AlertEpisodeStatus]>([
      [
        'pending',
        alertEpisodeStatus.inactive,
        alertEventStatus.breached,
        alertEpisodeStatus.pending,
      ],
      ['active', alertEpisodeStatus.pending, alertEventStatus.breached, alertEpisodeStatus.active],
      [
        'recovering',
        alertEpisodeStatus.active,
        alertEventStatus.recovered,
        alertEpisodeStatus.recovering,
      ],
      [
        'inactive',
        alertEpisodeStatus.recovering,
        alertEventStatus.recovered,
        alertEpisodeStatus.inactive,
      ],
    ])('transitions to %s', (_label, from, on, to) => {
      expectTransition({ from, on, to });
    });
  });

  describe('pendingCount of 0 (skip pending)', () => {
    const stateTransition: RuleResponse['state_transition'] = { pending_count: 0 };

    it('transitions directly to active from inactive on breach', () => {
      expectTransition({
        from: alertEpisodeStatus.inactive,
        on: alertEventStatus.breached,
        to: alertEpisodeStatus.active,
        stateTransition,
      });
    });

    it('transitions directly to active when no previous episode', () => {
      expectTransition({
        on: alertEventStatus.breached,
        to: alertEpisodeStatus.active,
        stateTransition,
      });
    });
  });

  describe('pendingCount of 1 (resolves on the first match)', () => {
    const stateTransition: RuleResponse['state_transition'] = { pending_count: 1 };

    it('transitions directly to active from inactive on breach', () => {
      expectTransition({
        from: alertEpisodeStatus.inactive,
        on: alertEventStatus.breached,
        to: alertEpisodeStatus.active,
        stateTransition,
      });
    });

    it('transitions directly to active when no previous episode', () => {
      expectTransition({
        on: alertEventStatus.breached,
        to: alertEpisodeStatus.active,
        stateTransition,
      });
    });

    it('stays pending on the first match when an unmet timeframe is ANDed', () => {
      expectTransition({
        on: alertEventStatus.breached,
        to: alertEpisodeStatus.pending,
        stateTransition: { pending_count: 1, pending_timeframe: '5m', pending_operator: 'AND' },
        expectedStatusCount: 1,
      });
    });

    it('transitions to active on the first match when an unmet timeframe is ORed', () => {
      expectTransition({
        on: alertEventStatus.breached,
        to: alertEpisodeStatus.active,
        stateTransition: { pending_count: 1, pending_timeframe: '5m', pending_operator: 'OR' },
      });
    });
  });

  describe('pendingCount threshold', () => {
    const stateTransition: RuleResponse['state_transition'] = { pending_count: 3 };

    it('enters pending with statusCount 1 from inactive', () => {
      expectTransition({
        from: alertEpisodeStatus.inactive,
        on: alertEventStatus.breached,
        to: alertEpisodeStatus.pending,
        stateTransition,
        expectedStatusCount: 1,
      });
    });

    it('enters pending with statusCount 1 when no previous episode', () => {
      expectTransition({
        on: alertEventStatus.breached,
        to: alertEpisodeStatus.pending,
        stateTransition,
        expectedStatusCount: 1,
      });
    });

    it('stays in pending when count threshold not met', () => {
      expectTransition({
        from: alertEpisodeStatus.pending,
        on: alertEventStatus.breached,
        to: alertEpisodeStatus.pending,
        stateTransition,
        statusCount: 1,
        expectedStatusCount: 2,
      });
    });

    it('transitions to active when count threshold is met', () => {
      expectTransition({
        from: alertEpisodeStatus.pending,
        on: alertEventStatus.breached,
        to: alertEpisodeStatus.active,
        stateTransition,
        statusCount: 2,
      });
    });

    it('transitions to active when count exceeds threshold', () => {
      expectTransition({
        from: alertEpisodeStatus.pending,
        on: alertEventStatus.breached,
        to: alertEpisodeStatus.active,
        stateTransition,
        statusCount: 5,
      });
    });

    it('still transitions pending to inactive on recovered event', () => {
      expectTransition({
        from: alertEpisodeStatus.pending,
        on: alertEventStatus.recovered,
        to: alertEpisodeStatus.inactive,
        stateTransition,
        statusCount: 3,
      });
    });
  });

  describe('pendingTimeframe threshold', () => {
    it('transitions to active when timeframe is met', () => {
      expectTransition({
        from: alertEpisodeStatus.pending,
        on: alertEventStatus.breached,
        to: alertEpisodeStatus.active,
        stateTransition: { pending_timeframe: '2m' },
        statusCount: 1,
        eventTimestamp: '2025-01-01T00:02:00.000Z',
        previousTimestamp: '2025-01-01T00:00:00.000Z',
      });
    });

    it('stays pending when timeframe is not met', () => {
      expectTransition({
        from: alertEpisodeStatus.pending,
        on: alertEventStatus.breached,
        to: alertEpisodeStatus.pending,
        stateTransition: { pending_timeframe: '5m' },
        statusCount: 2,
        expectedStatusCount: 3,
        eventTimestamp: '2025-01-01T00:03:00.000Z',
        previousTimestamp: '2025-01-01T00:00:00.000Z',
      });
    });

    it('uses OR to combine count and timeframe', () => {
      expectTransition({
        from: alertEpisodeStatus.pending,
        on: alertEventStatus.breached,
        to: alertEpisodeStatus.active,
        stateTransition: {
          pending_count: 5,
          pending_timeframe: '2m',
          pending_operator: 'OR',
        },
        statusCount: 1,
        eventTimestamp: '2025-01-01T00:02:00.000Z',
        previousTimestamp: '2025-01-01T00:00:00.000Z',
      });
    });

    it('uses AND to combine count and timeframe', () => {
      expectTransition({
        from: alertEpisodeStatus.pending,
        on: alertEventStatus.breached,
        to: alertEpisodeStatus.pending,
        stateTransition: {
          pending_count: 5,
          pending_timeframe: '2m',
          pending_operator: 'AND',
        },
        statusCount: 1,
        expectedStatusCount: 2,
        eventTimestamp: '2025-01-01T00:02:00.000Z',
        previousTimestamp: '2025-01-01T00:00:00.000Z',
      });
    });
  });

  describe('recoveringCount of 0 (skip recovering)', () => {
    const stateTransition: RuleResponse['state_transition'] = { recovering_count: 0 };

    it('transitions directly to inactive from active on recovered', () => {
      expectTransition({
        from: alertEpisodeStatus.active,
        on: alertEventStatus.recovered,
        to: alertEpisodeStatus.inactive,
        stateTransition,
      });
    });
  });

  describe('recoveringCount of 1 (resolves on the first recovery)', () => {
    const stateTransition: RuleResponse['state_transition'] = { recovering_count: 1 };

    it('transitions directly to inactive from active on recovered', () => {
      expectTransition({
        from: alertEpisodeStatus.active,
        on: alertEventStatus.recovered,
        to: alertEpisodeStatus.inactive,
        stateTransition,
      });
    });

    it('stays recovering on the first recovery when an unmet timeframe is ANDed', () => {
      expectTransition({
        from: alertEpisodeStatus.active,
        on: alertEventStatus.recovered,
        to: alertEpisodeStatus.recovering,
        stateTransition: {
          recovering_count: 1,
          recovering_timeframe: '5m',
          recovering_operator: 'AND',
        },
        expectedStatusCount: 1,
      });
    });
  });

  describe('recoveringCount threshold', () => {
    const stateTransition: RuleResponse['state_transition'] = { recovering_count: 3 };

    it('enters recovering with statusCount 1 from active', () => {
      expectTransition({
        from: alertEpisodeStatus.active,
        on: alertEventStatus.recovered,
        to: alertEpisodeStatus.recovering,
        stateTransition,
        expectedStatusCount: 1,
      });
    });

    it('stays recovering when count threshold not met', () => {
      expectTransition({
        from: alertEpisodeStatus.recovering,
        on: alertEventStatus.recovered,
        to: alertEpisodeStatus.recovering,
        stateTransition,
        statusCount: 1,
        expectedStatusCount: 2,
      });
    });

    it('transitions to inactive when count threshold is met', () => {
      expectTransition({
        from: alertEpisodeStatus.recovering,
        on: alertEventStatus.recovered,
        to: alertEpisodeStatus.inactive,
        stateTransition,
        statusCount: 2,
      });
    });

    it('still transitions recovering to active on breached event', () => {
      expectTransition({
        from: alertEpisodeStatus.recovering,
        on: alertEventStatus.breached,
        to: alertEpisodeStatus.active,
        stateTransition,
        statusCount: 1,
      });
    });
  });

  describe('recoveringTimeframe threshold', () => {
    it('transitions to inactive when timeframe is met', () => {
      expectTransition({
        from: alertEpisodeStatus.recovering,
        on: alertEventStatus.recovered,
        to: alertEpisodeStatus.inactive,
        stateTransition: { recovering_timeframe: '2m' },
        statusCount: 1,
        eventTimestamp: '2025-01-01T00:02:00.000Z',
        previousTimestamp: '2025-01-01T00:00:00.000Z',
      });
    });

    it('stays recovering when timeframe is not met', () => {
      expectTransition({
        from: alertEpisodeStatus.recovering,
        on: alertEventStatus.recovered,
        to: alertEpisodeStatus.recovering,
        stateTransition: { recovering_timeframe: '5m' },
        statusCount: 2,
        expectedStatusCount: 3,
        eventTimestamp: '2025-01-01T00:03:00.000Z',
        previousTimestamp: '2025-01-01T00:00:00.000Z',
      });
    });

    it('uses OR to combine count and timeframe', () => {
      expectTransition({
        from: alertEpisodeStatus.recovering,
        on: alertEventStatus.recovered,
        to: alertEpisodeStatus.inactive,
        stateTransition: {
          recovering_count: 5,
          recovering_timeframe: '2m',
          recovering_operator: 'OR',
        },
        statusCount: 1,
        eventTimestamp: '2025-01-01T00:02:00.000Z',
        previousTimestamp: '2025-01-01T00:00:00.000Z',
      });
    });

    it('uses AND to combine count and timeframe', () => {
      expectTransition({
        from: alertEpisodeStatus.recovering,
        on: alertEventStatus.recovered,
        to: alertEpisodeStatus.recovering,
        stateTransition: {
          recovering_count: 5,
          recovering_timeframe: '2m',
          recovering_operator: 'AND',
        },
        statusCount: 1,
        expectedStatusCount: 2,
        eventTimestamp: '2025-01-01T00:02:00.000Z',
        previousTimestamp: '2025-01-01T00:00:00.000Z',
      });
    });
  });

  describe('consecutive evaluations required to leave a phase', () => {
    const runUntil = ({
      stateTransition,
      from,
      on,
      until,
      maxEvaluations = 10,
    }: {
      stateTransition: RuleResponse['state_transition'];
      from?: AlertEpisodeStatus;
      on: AlertEventStatus;
      until: AlertEpisodeStatus;
      maxEvaluations?: number;
    }) => {
      let previousEpisode =
        from != null
          ? buildLatestAlertEvent({ episodeStatus: from, eventStatus: alertEventStatus.breached })
          : undefined;

      for (let evaluation = 1; evaluation <= maxEvaluations; evaluation++) {
        const result = strategy.getNextState(
          buildStrategyStateTransitionContext({ eventStatus: on, stateTransition, previousEpisode })
        );

        if (result.status === until) {
          return evaluation;
        }

        previousEpisode = buildLatestAlertEvent({
          episodeStatus: result.status,
          eventStatus: on,
          statusCount: result.statusCount,
        });
      }

      return -1;
    };

    it.each([
      [0, 1],
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
    ])('pendingCount %i becomes active on evaluation %i', (pendingCount, expected) => {
      expect(
        runUntil({
          stateTransition: { pending_count: pendingCount },
          on: alertEventStatus.breached,
          until: alertEpisodeStatus.active,
        })
      ).toBe(expected);
    });

    it.each([
      [0, 1],
      [1, 1],
      [2, 2],
      [3, 3],
      [4, 4],
    ])('recoveringCount %i becomes inactive on evaluation %i', (recoveringCount, expected) => {
      expect(
        runUntil({
          stateTransition: { recovering_count: recoveringCount },
          from: alertEpisodeStatus.active,
          on: alertEventStatus.recovered,
          until: alertEpisodeStatus.inactive,
        })
      ).toBe(expected);
    });
  });

  describe('phase with no threshold configured', () => {
    it('enters pending on first breach when only the recovering phase is configured', () => {
      expectTransition({
        on: alertEventStatus.breached,
        to: alertEpisodeStatus.pending,
        stateTransition: { recovering_count: 3 },
        expectedStatusCount: 1,
      });
    });

    it('enters recovering on first recovery when only the pending phase is configured', () => {
      expectTransition({
        from: alertEpisodeStatus.active,
        on: alertEventStatus.recovered,
        to: alertEpisodeStatus.recovering,
        stateTransition: { pending_count: 3 },
        expectedStatusCount: 1,
      });
    });
  });

  describe('combined pending and recovering thresholds', () => {
    const stateTransition: RuleResponse['state_transition'] = {
      pending_count: 2,
      recovering_count: 2,
    };

    it('applies pending threshold independently of recovering', () => {
      expectTransition({
        from: alertEpisodeStatus.pending,
        on: alertEventStatus.breached,
        to: alertEpisodeStatus.active,
        stateTransition,
        statusCount: 1,
      });
    });

    it('applies recovering threshold independently of pending', () => {
      expectTransition({
        from: alertEpisodeStatus.recovering,
        on: alertEventStatus.recovered,
        to: alertEpisodeStatus.inactive,
        stateTransition,
        statusCount: 1,
      });
    });
  });

  describe('no previous episode or status count', () => {
    it('treats status count as 0 when the previous episode is not present', () => {
      expectTransition({
        on: alertEventStatus.breached,
        to: alertEpisodeStatus.pending,
        stateTransition: { pending_count: 3 },
        expectedStatusCount: 1,
      });
    });

    it('treats status count as 1 when the previous episode is present but the status count no', () => {
      expectTransition({
        from: alertEpisodeStatus.pending,
        on: alertEventStatus.breached,
        to: alertEpisodeStatus.pending,
        stateTransition: { pending_count: 3 },
        statusCount: null,
        expectedStatusCount: 2,
      });
    });
  });

  describe('malformed duration fallback', () => {
    it('ignores an invalid pending_timeframe and evaluates count only', () => {
      expectTransition({
        from: alertEpisodeStatus.pending,
        on: alertEventStatus.breached,
        to: alertEpisodeStatus.active,
        stateTransition: { pending_count: 2, pending_timeframe: 'bad' },
        statusCount: 1,
      });
    });

    it('ignores an invalid recovering_timeframe and evaluates count only', () => {
      expectTransition({
        from: alertEpisodeStatus.recovering,
        on: alertEventStatus.recovered,
        to: alertEpisodeStatus.inactive,
        stateTransition: { recovering_count: 2, recovering_timeframe: 'bad' },
        statusCount: 1,
      });
    });
  });

  describe('unaffected transitions (same as basic)', () => {
    const stateTransition: RuleResponse['state_transition'] = {
      pending_count: 5,
      recovering_count: 5,
    };

    it.each<[string, AlertEpisodeStatus, AlertEventStatus, AlertEpisodeStatus]>([
      ['active', alertEpisodeStatus.active, alertEventStatus.breached, alertEpisodeStatus.active],
      [
        'inactive',
        alertEpisodeStatus.inactive,
        alertEventStatus.recovered,
        alertEpisodeStatus.inactive,
      ],
      [
        'inactive',
        alertEpisodeStatus.inactive,
        alertEventStatus.no_data,
        alertEpisodeStatus.inactive,
      ],
    ])('stays %s', (_label, from, on, to) => {
      expectTransition({ from, on, to, stateTransition });
    });
  });

  describe("no_data event with no_data_strategy: 'recover'", () => {
    const stateTransition: RuleResponse['state_transition'] = {
      pending_count: 3,
      recovering_count: 3,
    };

    it('transitions inactive → inactive immediately, ignoring pending gating', () => {
      expectTransition({
        from: alertEpisodeStatus.inactive,
        on: alertEventStatus.no_data,
        to: alertEpisodeStatus.inactive,
        stateTransition,
        noDataStrategy: 'recover',
      });
    });

    it('transitions pending → inactive immediately, ignoring pending gating', () => {
      expectTransition({
        from: alertEpisodeStatus.pending,
        on: alertEventStatus.no_data,
        to: alertEpisodeStatus.inactive,
        stateTransition,
        noDataStrategy: 'recover',
        statusCount: 1,
      });
    });

    it('transitions active → inactive immediately, ignoring recovery delay', () => {
      expectTransition({
        from: alertEpisodeStatus.active,
        on: alertEventStatus.no_data,
        to: alertEpisodeStatus.inactive,
        stateTransition,
        noDataStrategy: 'recover',
      });
    });

    it('transitions recovering → inactive immediately, ignoring recovery delay', () => {
      expectTransition({
        from: alertEpisodeStatus.recovering,
        on: alertEventStatus.no_data,
        to: alertEpisodeStatus.inactive,
        stateTransition,
        noDataStrategy: 'recover',
        statusCount: 1,
      });
    });
  });

  describe("no_data event with no_data_strategy: 'emit'", () => {
    const stateTransition: RuleResponse['state_transition'] = {
      pending_count: 3,
      recovering_count: 3,
    };

    it.each<[AlertEpisodeStatus]>([
      [alertEpisodeStatus.inactive],
      [alertEpisodeStatus.active],
      [alertEpisodeStatus.recovering],
    ])('transitions %s → active', (from) => {
      expectTransition({
        from,
        on: alertEventStatus.no_data,
        to: alertEpisodeStatus.active,
        stateTransition,
        noDataStrategy: 'emit',
      });
    });

    it('keeps a pending episode in pending when the consecutive-breach threshold is not yet met', () => {
      expectTransition({
        from: alertEpisodeStatus.pending,
        on: alertEventStatus.no_data,
        to: alertEpisodeStatus.pending,
        stateTransition,
        noDataStrategy: 'emit',
        statusCount: 1,
        expectedStatusCount: 2,
      });
    });

    it('advances a pending episode to active once the consecutive-breach threshold is met', () => {
      expectTransition({
        from: alertEpisodeStatus.pending,
        on: alertEventStatus.no_data,
        to: alertEpisodeStatus.active,
        stateTransition,
        noDataStrategy: 'emit',
        statusCount: 2,
      });
    });
  });
});
