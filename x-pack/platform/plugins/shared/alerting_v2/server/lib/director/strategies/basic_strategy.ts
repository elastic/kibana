/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable } from 'inversify';
import type { AlertEventStatus } from '../../../resources/alert_events';
import { alertEpisodeStatus, type AlertEpisodeStatus } from '../../../resources/alert_events';
import type { RuleResponse } from '../../rules_client/types';
import type { ITransitionStrategy, StateTransitionContext, StateTransitionResult } from './types';

@injectable()
export class BasicTransitionStrategy implements ITransitionStrategy {
  readonly name: string = 'basic';

  protected readonly stateMachine: Record<
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
      no_data: alertEpisodeStatus.pending,
    },
    [alertEpisodeStatus.active]: {
      breached: alertEpisodeStatus.active,
      recovered: alertEpisodeStatus.recovering,
      no_data: alertEpisodeStatus.active,
    },
    [alertEpisodeStatus.recovering]: {
      breached: alertEpisodeStatus.active,
      recovered: alertEpisodeStatus.inactive,
      no_data: alertEpisodeStatus.recovering,
    },
  };

  canHandle(_rule: RuleResponse): boolean {
    return true;
  }

  getNextState({ alertEvent, previousEpisode }: StateTransitionContext): StateTransitionResult {
    const currentAlertEpisodeStatus = previousEpisode?.last_episode_status;

    if (!currentAlertEpisodeStatus) {
      return { status: alertEpisodeStatus.pending };
    }

    const stateRules = this.stateMachine[currentAlertEpisodeStatus];

    if (!stateRules) {
      return { status: alertEpisodeStatus.pending };
    }

    const nextState = stateRules[alertEvent.status];

    return { status: nextState ?? currentAlertEpisodeStatus ?? alertEpisodeStatus.pending };
  }
}
