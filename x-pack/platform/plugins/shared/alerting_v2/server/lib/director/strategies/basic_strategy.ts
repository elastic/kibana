/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable } from 'inversify';
import {
  alertEpisodeStatus,
  type AlertEpisodeStatus,
  type AlertEventStatus,
} from '../../../resources/datastreams/alert_events';
import type { RuleResponse } from '../../rules_client/types';
import type { ITransitionStrategy, StateTransitionContext, StateTransitionResult } from './types';

@injectable()
export class BasicTransitionStrategy implements ITransitionStrategy {
  readonly name: string = 'basic';

  // Deterministic transitions for `breached` and `recovered`.
  // The `no_data` transition depends on the rule's no_data_strategy,
  // and it is determined per-strategy in getStateMachine below.
  protected readonly baseTransitions: Record<
    AlertEpisodeStatus,
    { breached: AlertEpisodeStatus; recovered: AlertEpisodeStatus }
  > = {
    [alertEpisodeStatus.inactive]: {
      breached: alertEpisodeStatus.pending,
      recovered: alertEpisodeStatus.inactive,
    },
    [alertEpisodeStatus.pending]: {
      breached: alertEpisodeStatus.active,
      recovered: alertEpisodeStatus.inactive,
    },
    [alertEpisodeStatus.active]: {
      breached: alertEpisodeStatus.active,
      recovered: alertEpisodeStatus.recovering,
    },
    [alertEpisodeStatus.recovering]: {
      breached: alertEpisodeStatus.active,
      recovered: alertEpisodeStatus.inactive,
    },
  };

  canHandle(_rule: RuleResponse): boolean {
    return true;
  }

  getNextState({
    rule,
    alertEvent,
    previousEpisode,
  }: StateTransitionContext): StateTransitionResult {
    const currentAlertEpisodeStatus = previousEpisode?.last_episode_status;

    if (!currentAlertEpisodeStatus) {
      return { status: alertEpisodeStatus.pending };
    }

    const stateRules = this.getStateMachine(rule.no_data_strategy, currentAlertEpisodeStatus);

    if (!stateRules) {
      return { status: alertEpisodeStatus.pending };
    }

    const nextState = stateRules[alertEvent.status];

    return { status: nextState ?? currentAlertEpisodeStatus ?? alertEpisodeStatus.pending };
  }

  private getStateMachine(
    noDataStrategy: RuleResponse['no_data_strategy'],
    currentStatus: AlertEpisodeStatus
  ): Record<AlertEventStatus, AlertEpisodeStatus> | undefined {
    const base = this.baseTransitions[currentStatus];
    if (!base) {
      return undefined;
    }

    // for all other no_data_strategy types return the last known episode status
    let noData: AlertEpisodeStatus = currentStatus;
    if (noDataStrategy === 'emit') {
      noData = alertEpisodeStatus.active;
    } else if (noDataStrategy === 'recover') {
      noData = base.recovered;
    }

    return { breached: base.breached, recovered: base.recovered, no_data: noData };
  }
}
