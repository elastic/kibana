/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicTransitionStrategy } from './basic_strategy';
import { alertEpisodeStatus, alertEventStatus } from '../../../resources/alert_events';
import { createRuleResponse } from '../../test_utils';
import { buildLatestAlertEvent, buildStrategyStateTransitionContext } from '../test_utils';

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
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.breached,
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.pending });
    });

    it('returns pending when previous episode status is null', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.breached,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: null,
            eventStatus: alertEventStatus.breached,
          }),
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.pending });
    });

    it('returns pending when the current state is unknown', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.breached,
          previousEpisode: {
            ...buildLatestAlertEvent({
              episodeStatus: alertEpisodeStatus.pending,
              eventStatus: alertEventStatus.breached,
            }),
            // @ts-expect-error - unknown state testing
            last_episode_status: 'unknown_state',
          },
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.pending });
    });
  });

  describe('state transitions from inactive', () => {
    const currentState = alertEpisodeStatus.inactive;

    it('transitions to pending on breached event', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.breached,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: currentState,
            eventStatus: alertEventStatus.breached,
          }),
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.pending });
    });

    it('stays inactive on recovered event', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.recovered,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: currentState,
            eventStatus: alertEventStatus.recovered,
          }),
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.inactive });
    });

    it('stays inactive on no_data event', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.no_data,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: currentState,
            eventStatus: alertEventStatus.no_data,
          }),
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.inactive });
    });
  });

  describe('state transitions from pending', () => {
    const currentState = alertEpisodeStatus.pending;

    it('transitions to active on breached event', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.breached,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: currentState,
            eventStatus: alertEventStatus.breached,
          }),
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.active });
    });

    it('transitions to inactive on recovered event', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.recovered,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: currentState,
            eventStatus: alertEventStatus.recovered,
          }),
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.inactive });
    });

    it('stays pending on no_data event', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.no_data,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: currentState,
            eventStatus: alertEventStatus.no_data,
          }),
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.pending });
    });
  });

  describe('state transitions from active', () => {
    const currentState = alertEpisodeStatus.active;

    it('stays active on breached event', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.breached,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: currentState,
            eventStatus: alertEventStatus.breached,
          }),
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.active });
    });

    it('transitions to recovering on recovered event', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.recovered,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: currentState,
            eventStatus: alertEventStatus.recovered,
          }),
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.recovering });
    });

    it('stays active on no_data event', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.no_data,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: currentState,
            eventStatus: alertEventStatus.no_data,
          }),
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.active });
    });
  });

  describe('state transitions from recovering', () => {
    const currentState = alertEpisodeStatus.recovering;

    it('transitions to active on breached event', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.breached,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: currentState,
            eventStatus: alertEventStatus.breached,
          }),
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.active });
    });

    it('transitions to inactive on recovered event', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.recovered,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: currentState,
            eventStatus: alertEventStatus.recovered,
          }),
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.inactive });
    });

    it('stays recovering on no_data event', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.no_data,
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: currentState,
            eventStatus: alertEventStatus.no_data,
          }),
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.recovering });
    });
  });

  describe('defensive fallbacks', () => {
    it('returns pending for unknown current state', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          eventStatus: alertEventStatus.breached,
          previousEpisode: {
            ...buildLatestAlertEvent({
              episodeStatus: alertEpisodeStatus.pending,
              eventStatus: alertEventStatus.breached,
            }),
            // @ts-expect-error - unknown state testing
            last_episode_status: 'unknown_state',
          },
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.pending });
    });

    it('returns current state for unknown event status', () => {
      const result = strategy.getNextState(
        buildStrategyStateTransitionContext({
          // @ts-expect-error - unknown event status testing
          eventStatus: 'unknown_event',
          previousEpisode: buildLatestAlertEvent({
            episodeStatus: alertEpisodeStatus.active,
            eventStatus: alertEventStatus.breached,
          }),
        })
      );
      expect(result).toEqual({ status: alertEpisodeStatus.active });
    });
  });
});
