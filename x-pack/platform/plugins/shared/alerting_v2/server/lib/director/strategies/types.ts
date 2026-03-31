/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertEpisodeStatus, AlertEvent } from '../../../resources/alert_events';
import type { RuleResponse } from '../../rules_client/types';
import type { LatestAlertEventState } from '../queries';

export interface StateTransitionContext {
  rule: RuleResponse;
  alertEvent: AlertEvent;
  previousEpisode?: LatestAlertEventState;
}

export interface StateTransitionResult {
  status: AlertEpisodeStatus;
  statusCount?: number;
}

export interface ITransitionStrategy {
  /** Unique identifier for this strategy, used for logging and debugging. */
  name: string;

  /**
   * Determines whether this strategy is applicable for the given rule.
   * The {@link TransitionStrategyFactory} iterates registered strategies
   * and selects the first one whose `canHandle` returns `true`.
   */
  canHandle(rule: RuleResponse): boolean;

  /**
   * Computes the next episode status (and optional status count) for an
   * alert event, given the rule configuration and the previous episode state.
   */
  getNextState(ctx: StateTransitionContext): StateTransitionResult;
}

export const TransitionStrategyToken = Symbol.for('TransitionStrategy');
