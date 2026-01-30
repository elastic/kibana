/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable } from 'inversify';
import type { AlertEventStatus } from '../../../resources/alert_events';
import { alertEpisodeStatus, type AlertEpisodeStatus } from '../../../resources/alert_events';
import type { ITransitionStrategy, TransitionContext } from './types';

@injectable()
export class BasicTransitionStrategy implements ITransitionStrategy {
  readonly name = 'basic';

  private readonly stateMachine: Record<
    AlertEpisodeStatus,
    Record<AlertEventStatus, AlertEpisodeStatus>
  > = {
    [alertEpisodeStatus.inactive]: {
      breached: alertEpisodeStatus.pending,
      recovered: alertEpisodeStatus.inactive,
      no_data: alertEpisodeStatus.inactive,
    },
    [alertEpisodeStatus.pending]: {
      breached: alertEpisodeStatus.active,
      recovered: alertEpisodeStatus.inactive,
      no_data: alertEpisodeStatus.inactive,
    },
    [alertEpisodeStatus.active]: {
      breached: alertEpisodeStatus.active,
      recovered: alertEpisodeStatus.recovering,
      no_data: alertEpisodeStatus.inactive,
    },
    [alertEpisodeStatus.recovering]: {
      breached: alertEpisodeStatus.active,
      recovered: alertEpisodeStatus.inactive,
      no_data: alertEpisodeStatus.inactive,
    },
  };

  getNextState({
    currentAlertEpisodeStatus,
    alertEventStatus,
  }: TransitionContext): AlertEpisodeStatus {
    const stateRules = this.stateMachine[currentAlertEpisodeStatus];
    const nextState = stateRules[alertEventStatus];

    return nextState ?? currentAlertEpisodeStatus ?? alertEpisodeStatus.inactive;
  }
}
