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
  name: string;
  canHandle(rule: RuleResponse): boolean;
  getNextState(ctx: StateTransitionContext): StateTransitionResult;
}

export const TransitionStrategyToken = Symbol.for('TransitionStrategy');
