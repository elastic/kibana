/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicTransitionStrategy } from './basic_strategy';
import {
  alertEpisodeStatus,
  alertEventStatus,
  type AlertEpisodeStatus,
  type AlertEventStatus,
} from '../../../resources/alert_events';
import { createAlertEvent } from '../../rule_executor/test_utils';
import { createRuleResponse } from '../../test_utils';
import type { StateTransitionContext } from './types';
import type { LatestAlertEventState } from '../queries';

const buildCtx = (
  episodeStatus: AlertEpisodeStatus | null | undefined,
  eventStatus: AlertEventStatus
): StateTransitionContext => ({
  rule: createRuleResponse(),
  alertEvent: createAlertEvent({ status: eventStatus }),
  ...(episodeStatus !== undefined
    ? {
        previousEpisode: {
          last_status: eventStatus,
          last_episode_id: 'episode-1',
          last_episode_status: episodeStatus,
          last_episode_status_count: null,
          last_episode_timestamp: '2025-01-01T00:00:00.000Z',
          group_hash: 'hash-1',
        } as LatestAlertEventState,
      }
    : {}),
});

describe('BasicTransitionStrategy', () => {
  let strategy: BasicTransitionStrategy;

  beforeEach(() => {
    strategy = new BasicTransitionStrategy();
  });

  it('has name "basic"', () => {
    expect(strategy.name).toBe('basic');
  });

  describe('canHandle', () => {
    it('returns true for any rule (acts as fallback)', () => {
      expect(strategy.canHandle(createRuleResponse())).toBe(true);
      expect(strategy.canHandle(createRuleResponse({ stateTransition: { pendingCount: 3 } }))).toBe(
        true
      );
    });
  });

  describe('no previous episode', () => {
    it('returns pending when there is no previous episode', () => {
      const result = strategy.getNextState(buildCtx(undefined, alertEventStatus.breached));
      expect(result).toEqual({ status: alertEpisodeStatus.pending });
    });

    it('returns pending when previous episode status is null', () => {
      const result = strategy.getNextState(buildCtx(null, alertEventStatus.breached));
      expect(result).toEqual({ status: alertEpisodeStatus.pending });
    });

    it('returns pending when the current state is unknown', () => {
      const result = strategy.getNextState(
        // @ts-expect-error - unknown state testing
        buildCtx('unknown_state', alertEventStatus.breached)
      );
      expect(result).toEqual({ status: alertEpisodeStatus.pending });
    });
  });

  describe('state transitions from inactive', () => {
    const currentState = alertEpisodeStatus.inactive;

    it('transitions to pending on breached event', () => {
      const result = strategy.getNextState(buildCtx(currentState, alertEventStatus.breached));
      expect(result).toEqual({ status: alertEpisodeStatus.pending });
    });

    it('stays inactive on recovered event', () => {
      const result = strategy.getNextState(buildCtx(currentState, alertEventStatus.recovered));
      expect(result).toEqual({ status: alertEpisodeStatus.inactive });
    });

    it('stays inactive on no_data event', () => {
      const result = strategy.getNextState(buildCtx(currentState, alertEventStatus.no_data));
      expect(result).toEqual({ status: alertEpisodeStatus.inactive });
    });
  });

  describe('state transitions from pending', () => {
    const currentState = alertEpisodeStatus.pending;

    it('transitions to active on breached event', () => {
      const result = strategy.getNextState(buildCtx(currentState, alertEventStatus.breached));
      expect(result).toEqual({ status: alertEpisodeStatus.active });
    });

    it('transitions to inactive on recovered event', () => {
      const result = strategy.getNextState(buildCtx(currentState, alertEventStatus.recovered));
      expect(result).toEqual({ status: alertEpisodeStatus.inactive });
    });

    it('stays pending on no_data event', () => {
      const result = strategy.getNextState(buildCtx(currentState, alertEventStatus.no_data));
      expect(result).toEqual({ status: alertEpisodeStatus.pending });
    });
  });

  describe('state transitions from active', () => {
    const currentState = alertEpisodeStatus.active;

    it('stays active on breached event', () => {
      const result = strategy.getNextState(buildCtx(currentState, alertEventStatus.breached));
      expect(result).toEqual({ status: alertEpisodeStatus.active });
    });

    it('transitions to recovering on recovered event', () => {
      const result = strategy.getNextState(buildCtx(currentState, alertEventStatus.recovered));
      expect(result).toEqual({ status: alertEpisodeStatus.recovering });
    });

    it('stays active on no_data event', () => {
      const result = strategy.getNextState(buildCtx(currentState, alertEventStatus.no_data));
      expect(result).toEqual({ status: alertEpisodeStatus.active });
    });
  });

  describe('state transitions from recovering', () => {
    const currentState = alertEpisodeStatus.recovering;

    it('transitions to active on breached event', () => {
      const result = strategy.getNextState(buildCtx(currentState, alertEventStatus.breached));
      expect(result).toEqual({ status: alertEpisodeStatus.active });
    });

    it('transitions to inactive on recovered event', () => {
      const result = strategy.getNextState(buildCtx(currentState, alertEventStatus.recovered));
      expect(result).toEqual({ status: alertEpisodeStatus.inactive });
    });

    it('stays recovering on no_data event', () => {
      const result = strategy.getNextState(buildCtx(currentState, alertEventStatus.no_data));
      expect(result).toEqual({ status: alertEpisodeStatus.recovering });
    });
  });

  describe('defensive fallbacks', () => {
    it('returns pending for unknown current state', () => {
      const result = strategy.getNextState(
        // @ts-expect-error - unknown state testing
        buildCtx('unknown_state', alertEventStatus.breached)
      );
      expect(result).toEqual({ status: alertEpisodeStatus.pending });
    });

    it('returns current state for unknown event status', () => {
      const result = strategy.getNextState(
        // @ts-expect-error - unknown event status testing
        buildCtx(alertEpisodeStatus.active, 'unknown_event')
      );
      expect(result).toEqual({ status: alertEpisodeStatus.active });
    });
  });
});
