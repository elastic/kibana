/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertEventStatus, AlertEpisodeStatus } from '../../../resources/alert_events';

export interface TransitionContext {
  currentAlertEpisodeStatus: AlertEpisodeStatus;
  alertEventStatus: AlertEventStatus;
}

export interface ITransitionStrategy {
  name: string;
  getNextState(ctx: TransitionContext): AlertEpisodeStatus;
}
