/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicTransitionStrategy } from './basic_strategy';
import { alertEpisodeStatus, alertEventStatus } from '../../../resources/alert_events';

describe('BasicTransitionStrategy', () => {
  let strategy: BasicTransitionStrategy;

  beforeEach(() => {
    strategy = new BasicTransitionStrategy();
  });

  it('has name "basic"', () => {
    expect(strategy.name).toBe('basic');
  });

  describe('state transitions from inactive', () => {
    const currentState = alertEpisodeStatus.inactive;

    it('transitions to pending on breached event', () => {
      const result = strategy.getNextState({
        currentAlertEpisodeStatus: currentState,
        alertEventStatus: alertEventStatus.breached,
      });
      expect(result).toBe(alertEpisodeStatus.pending);
    });

    it('stays inactive on recovered event', () => {
      const result = strategy.getNextState({
        currentAlertEpisodeStatus: currentState,
        alertEventStatus: alertEventStatus.recovered,
      });
      expect(result).toBe(alertEpisodeStatus.inactive);
    });

    it('stays inactive on no_data event', () => {
      const result = strategy.getNextState({
        currentAlertEpisodeStatus: currentState,
        alertEventStatus: alertEventStatus.no_data,
      });
      expect(result).toBe(alertEpisodeStatus.inactive);
    });
  });

  describe('state transitions from pending', () => {
    const currentState = alertEpisodeStatus.pending;

    it('transitions to active on breached event', () => {
      const result = strategy.getNextState({
        currentAlertEpisodeStatus: currentState,
        alertEventStatus: alertEventStatus.breached,
      });
      expect(result).toBe(alertEpisodeStatus.active);
    });

    it('transitions to inactive on recovered event', () => {
      const result = strategy.getNextState({
        currentAlertEpisodeStatus: currentState,
        alertEventStatus: alertEventStatus.recovered,
      });
      expect(result).toBe(alertEpisodeStatus.inactive);
    });

    it('transitions to inactive on no_data event', () => {
      const result = strategy.getNextState({
        currentAlertEpisodeStatus: currentState,
        alertEventStatus: alertEventStatus.no_data,
      });
      expect(result).toBe(alertEpisodeStatus.pending);
    });
  });

  describe('state transitions from active', () => {
    const currentState = alertEpisodeStatus.active;

    it('stays active on breached event', () => {
      const result = strategy.getNextState({
        currentAlertEpisodeStatus: currentState,
        alertEventStatus: alertEventStatus.breached,
      });
      expect(result).toBe(alertEpisodeStatus.active);
    });

    it('transitions to recovering on recovered event', () => {
      const result = strategy.getNextState({
        currentAlertEpisodeStatus: currentState,
        alertEventStatus: alertEventStatus.recovered,
      });
      expect(result).toBe(alertEpisodeStatus.recovering);
    });

    it('transitions to inactive on no_data event', () => {
      const result = strategy.getNextState({
        currentAlertEpisodeStatus: currentState,
        alertEventStatus: alertEventStatus.no_data,
      });
      expect(result).toBe(alertEpisodeStatus.active);
    });
  });

  describe('state transitions from recovering', () => {
    const currentState = alertEpisodeStatus.recovering;

    it('transitions to active on breached event', () => {
      const result = strategy.getNextState({
        currentAlertEpisodeStatus: currentState,
        alertEventStatus: alertEventStatus.breached,
      });
      expect(result).toBe(alertEpisodeStatus.active);
    });

    it('transitions to inactive on recovered event', () => {
      const result = strategy.getNextState({
        currentAlertEpisodeStatus: currentState,
        alertEventStatus: alertEventStatus.recovered,
      });
      expect(result).toBe(alertEpisodeStatus.inactive);
    });

    it('transitions to inactive on no_data event', () => {
      const result = strategy.getNextState({
        currentAlertEpisodeStatus: currentState,
        alertEventStatus: alertEventStatus.no_data,
      });
      expect(result).toBe(alertEpisodeStatus.recovering);
    });
  });

  describe('defensive fallbacks', () => {
    it('returns inactive for unknown current state', () => {
      const result = strategy.getNextState({
        // @ts-expect-error - unknown state testing
        currentAlertEpisodeStatus: 'unknown_state',
        alertEventStatus: alertEventStatus.breached,
      });

      expect(result).toBe(alertEpisodeStatus.inactive);
    });

    it('returns current state for unknown event status', () => {
      const result = strategy.getNextState({
        currentAlertEpisodeStatus: alertEpisodeStatus.active,
        // @ts-expect-error - unknown state testing
        alertEventStatus: 'unknown_event',
      });
      expect(result).toBe(alertEpisodeStatus.active);
    });
  });
});
