/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable } from 'inversify';
import type { AlertEventStatus } from '../../../resources/datastreams/alert_events';
import {
  alertEpisodeStatus,
  alertEventStatus,
  type AlertEpisodeStatus,
} from '../../../resources/datastreams/alert_events';
import type { RuleResponse } from '../../rules_client/types';
import type { ITransitionStrategy, StateTransitionContext, StateTransitionResult } from './types';

/**
 * Static transitions for non-`no_data` events. The `no_data` column is
 * computed dynamically based on `rule.no_data_strategy` — see
 * {@link BasicTransitionStrategy.getNextState}.
 *
 * `no_data` rule events always carry "no signal about cpu", so the transition
 * decision belongs to the rule's no-data policy, not the FSM table.
 */
type DeterministicEventStatus = Exclude<AlertEventStatus, 'no_data'>;

@injectable()
export class BasicTransitionStrategy implements ITransitionStrategy {
  readonly name: string = 'basic';

  protected readonly stateMachine: Record<
    AlertEpisodeStatus,
    Record<DeterministicEventStatus, AlertEpisodeStatus>
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
    [alertEpisodeStatus.no_data]: {
      breached: alertEpisodeStatus.pending,
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

    if (alertEvent.status === alertEventStatus.no_data) {
      return { status: this.getNextStatusForNoData(rule, currentAlertEpisodeStatus) };
    }

    const stateRules = this.stateMachine[currentAlertEpisodeStatus];

    if (!stateRules) {
      return { status: alertEpisodeStatus.pending };
    }

    const nextState = stateRules[alertEvent.status as DeterministicEventStatus];

    return { status: nextState ?? currentAlertEpisodeStatus ?? alertEpisodeStatus.pending };
  }

  private getNextStatusForNoData(
    rule: RuleResponse,
    currentStatus: AlertEpisodeStatus
  ): AlertEpisodeStatus {
    if (rule.no_data_strategy === 'emit') {
      return alertEpisodeStatus.no_data;
    }
    // for all other no_data_strategy types return the last known episode status
    return currentStatus;
  }
}
