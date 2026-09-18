/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import { noDataStrategy } from '@kbn/alerting-v2-schemas';
import type {
  AlertEpisodeStatus,
  AlertEventStatus,
} from '../../../resources/datastreams/alert_events';
import { alertEpisodeStatus, alertEventStatus } from '../../../resources/datastreams/alert_events';
import type { RuleResponse } from '../../rules_client/types';
import { parseDurationToMs } from '../../duration';
import { ALERTING_LOG_CODES } from '../../errors/error_codes';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../../services/logger_service/logger_service';
import { BasicTransitionStrategy } from './basic_strategy';
import type { StateTransitionContext, StateTransitionResult } from './types';
import type { LatestAlertEventState } from '../queries';

const DEFAULT_STATUS_COUNT = 1;

/** No time has been spent in a status that is being entered on this evaluation. */
const NO_ELAPSED_TIME = 0;

/** No evaluation has been counted yet towards a status that is being entered. */
const NO_STATUS_COUNT = 0;

type Operator = NonNullable<NonNullable<RuleResponse['state_transition']>['pending_operator']>;
const DEFAULT_OPERATOR: Operator = 'OR';

interface ThresholdConfig {
  operator: Operator;
  count?: number;
  timeframeMs?: number;
}

/** How far the episode has progressed through a phase, and where that phase leads. */
interface StateTransitionOptions {
  currentStatusCount: number;
  elapsedMs: number;
  successStatus: AlertEpisodeStatus;
  stayStatus: AlertEpisodeStatus;
}

/**
 * Evaluates whether a count-based threshold is met.
 *
 * - If no count is configured, the threshold is always considered met.
 * - Otherwise, the current count must be >= the configured count.
 */
const isCountThresholdMet = (currentCount: number, threshold?: number): boolean => {
  if (threshold == null) {
    return true;
  }

  return currentCount >= threshold;
};

/**
 * Evaluates whether a timeframe-based threshold is met.
 *
 * - If no timeframe is configured, the threshold is always considered met.
 * - Otherwise, the elapsed time must be >= the configured timeframe.
 */
const isTimeframeThresholdMet = (elapsedMs: number, thresholdMs?: number): boolean => {
  if (thresholdMs == null) {
    return true;
  }

  return elapsedMs >= thresholdMs;
};

/**
 * Evaluates whether a combined (count + timeframe) threshold is met,
 * taking the operator into account.
 *
 * - AND: both count and timeframe must be met.
 * - OR:  either count or timeframe is sufficient.
 *
 * When only one dimension is configured, the operator is irrelevant;
 * the single dimension decides.
 */
const isThresholdMet = (
  currentCount: number,
  elapsedMs: number,
  config: ThresholdConfig
): boolean => {
  const countMet = isCountThresholdMet(currentCount, config.count);
  const timeframeMet = isTimeframeThresholdMet(elapsedMs, config.timeframeMs);

  const hasCount = config.count != null;
  const hasTimeframe = config.timeframeMs != null;

  if (hasCount && hasTimeframe) {
    return config.operator === 'AND' ? countMet && timeframeMet : countMet || timeframeMet;
  }

  if (hasCount) {
    return countMet;
  }

  if (hasTimeframe) {
    return timeframeMet;
  }

  // No thresholds configured — always met (behave like basic).
  return true;
};

/**
 * A transition strategy that extends the basic state machine with
 * configurable count (and future timeframe) thresholds for the
 * `pending → active` and `recovering → inactive` transitions.
 *
 * - pending count of 0 means skip pending entirely (inactive → active).
 * - recovering count of 0 means skip recovering entirely (active → inactive).
 * - the evaluation that enters a phase is the first match in that phase, so a
 *   count of 1 is already satisfied there and resolves without waiting a run.
 * - When no threshold is configured for a phase, the strategy behaves
 *   identically to the basic strategy for that phase.
 */
@injectable()
export class CountTimeframeStrategy extends BasicTransitionStrategy {
  override readonly name = 'count_timeframe';

  private readonly logger: LoggerServiceContract;

  constructor(@inject(LoggerServiceToken) loggerService: LoggerServiceContract) {
    super();
    this.logger = loggerService.forSubsystem('director');
  }

  override canHandle(rule: RuleResponse): boolean {
    return rule.state_transition != null && Object.keys(rule.state_transition).length > 0;
  }

  override getNextState(ctx: StateTransitionContext): StateTransitionResult {
    const { rule, previousEpisode, alertEvent } = ctx;
    const stateTransition = rule.state_transition;
    const currentEpisodeStatus = previousEpisode?.last_episode_status;
    const currentStatusCount = this.getCurrentStatusCount(previousEpisode);
    const currentEpisodeTimestamp = previousEpisode?.last_episode_timestamp;
    const alertEventTimestamp = alertEvent['@timestamp'];

    const elapsedMs = this.getElapsedMs(alertEventTimestamp, currentEpisodeTimestamp);

    // Delegate to the inherited basic state machine to get the "natural" next state.
    const basicResult = super.getNextState(ctx);

    if (!stateTransition) {
      return basicResult;
    }

    if (
      alertEvent.status === alertEventStatus.no_data &&
      rule.no_data_strategy === noDataStrategy.recover
    ) {
      return basicResult;
    }

    // --- Handle pending count of 0: skip pending, go directly to active ---
    if (this.shouldSkipPending(stateTransition, basicResult.status)) {
      return { status: alertEpisodeStatus.active };
    }

    // --- Handle recovering count of 0: skip recovering, go directly to inactive ---
    if (this.shouldSkipRecovering(stateTransition, basicResult.status)) {
      return { status: alertEpisodeStatus.inactive };
    }

    // --- Pending → Active threshold ---
    if (this.isPendingToActiveTransition(currentEpisodeStatus, basicResult.status)) {
      return this.getNextStateTransition(this.getPendingThreshold(rule, stateTransition), {
        currentStatusCount,
        elapsedMs,
        successStatus: alertEpisodeStatus.active,
        stayStatus: alertEpisodeStatus.pending,
      });
    }

    // --- Recovering → Inactive threshold ---
    if (this.isRecoveringToInactiveTransition(currentEpisodeStatus, basicResult.status)) {
      return this.getNextStateTransition(this.getRecoveringThreshold(rule, stateTransition), {
        currentStatusCount,
        elapsedMs,
        successStatus: alertEpisodeStatus.inactive,
        stayStatus: alertEpisodeStatus.recovering,
      });
    }

    // --- Changing to pending for the first time ---
    if (
      this.isChangingStatus(currentEpisodeStatus, basicResult.status, alertEpisodeStatus.pending)
    ) {
      // Only count actual breaches (and intentional no_data+emit) as a match. Recovered and
      // non-emitting no_data events enter pending without threshold evaluation to avoid
      // false active alerts.
      if (!this.isBreachEvent(alertEvent.status, rule.no_data_strategy)) {
        return { status: alertEpisodeStatus.pending, statusCount: DEFAULT_STATUS_COUNT };
      }
      return this.getFirstEntryStateTransition(this.getPendingThreshold(rule, stateTransition), {
        successStatus: alertEpisodeStatus.active,
        stayStatus: alertEpisodeStatus.pending,
      });
    }

    // --- Changing to recovering for the first time ---
    if (
      this.isChangingStatus(currentEpisodeStatus, basicResult.status, alertEpisodeStatus.recovering)
    ) {
      return this.getFirstEntryStateTransition(this.getRecoveringThreshold(rule, stateTransition), {
        successStatus: alertEpisodeStatus.inactive,
        stayStatus: alertEpisodeStatus.recovering,
      });
    }

    return basicResult;
  }

  private getCurrentStatusCount(previousEpisode?: LatestAlertEventState): number {
    if (!previousEpisode) {
      return 0;
    }

    return previousEpisode.last_episode_status_count ?? DEFAULT_STATUS_COUNT;
  }

  private shouldSkipPending(
    stateTransition: NonNullable<RuleResponse['state_transition']>,
    nextStatus: AlertEpisodeStatus
  ): boolean {
    return stateTransition.pending_count === 0 && nextStatus === alertEpisodeStatus.pending;
  }

  private shouldSkipRecovering(
    stateTransition: NonNullable<RuleResponse['state_transition']>,
    nextStatus: AlertEpisodeStatus
  ): boolean {
    return stateTransition.recovering_count === 0 && nextStatus === alertEpisodeStatus.recovering;
  }

  private isPendingToActiveTransition(
    currentStatus: AlertEpisodeStatus | undefined | null,
    nextStatus: AlertEpisodeStatus
  ): boolean {
    return currentStatus === alertEpisodeStatus.pending && nextStatus === alertEpisodeStatus.active;
  }

  private isRecoveringToInactiveTransition(
    currentStatus: AlertEpisodeStatus | undefined | null,
    nextStatus: AlertEpisodeStatus
  ): boolean {
    return (
      currentStatus === alertEpisodeStatus.recovering && nextStatus === alertEpisodeStatus.inactive
    );
  }

  private isChangingStatus(
    currentStatus: AlertEpisodeStatus | undefined | null,
    nextStatus: AlertEpisodeStatus,
    targetStatus: AlertEpisodeStatus
  ): boolean {
    return nextStatus === targetStatus && currentStatus !== targetStatus;
  }

  private isBreachEvent(
    eventStatus: AlertEventStatus,
    noDataStrategyValue: RuleResponse['no_data_strategy']
  ): boolean {
    if (eventStatus === alertEventStatus.breached) return true;
    if (eventStatus === alertEventStatus.no_data) {
      return noDataStrategyValue === noDataStrategy.emit;
    }
    return false;
  }

  private getPendingThreshold(
    rule: RuleResponse,
    stateTransition: NonNullable<RuleResponse['state_transition']>
  ): ThresholdConfig {
    return {
      operator: stateTransition.pending_operator ?? DEFAULT_OPERATOR,
      count: stateTransition.pending_count,
      timeframeMs: this.safeParseDurationToMs(
        stateTransition.pending_timeframe,
        rule.id,
        'pending_timeframe'
      ),
    };
  }

  private getRecoveringThreshold(
    rule: RuleResponse,
    stateTransition: NonNullable<RuleResponse['state_transition']>
  ): ThresholdConfig {
    return {
      operator: stateTransition.recovering_operator ?? DEFAULT_OPERATOR,
      count: stateTransition.recovering_count,
      timeframeMs: this.safeParseDurationToMs(
        stateTransition.recovering_timeframe,
        rule.id,
        'recovering_timeframe'
      ),
    };
  }

  private getNextStateTransition(
    config: ThresholdConfig,
    { currentStatusCount, elapsedMs, successStatus, stayStatus }: StateTransitionOptions
  ): StateTransitionResult {
    const nextCount = currentStatusCount + 1;

    if (isThresholdMet(nextCount, elapsedMs, config)) {
      return { status: successStatus };
    }

    return { status: stayStatus, statusCount: nextCount };
  }

  private getFirstEntryStateTransition(
    config: ThresholdConfig,
    { successStatus, stayStatus }: Pick<StateTransitionOptions, 'successStatus' | 'stayStatus'>
  ): StateTransitionResult {
    if (config.count == null && config.timeframeMs == null) {
      return { status: stayStatus, statusCount: DEFAULT_STATUS_COUNT };
    }

    return this.getNextStateTransition(config, {
      currentStatusCount: NO_STATUS_COUNT,
      elapsedMs: NO_ELAPSED_TIME,
      successStatus,
      stayStatus,
    });
  }

  /**
   * Safely parses a duration string to milliseconds.
   * Returns `undefined` when the value is malformed so that
   * the timeframe dimension is simply ignored instead of
   * blowing up the entire state transition evaluation.
   */
  private safeParseDurationToMs(
    value: string | undefined,
    ruleId: string,
    resource: 'pending_timeframe' | 'recovering_timeframe'
  ): number | undefined {
    if (!value) {
      return undefined;
    }

    try {
      return parseDurationToMs(value);
    } catch {
      this.logger.warn({
        message: 'Rule state transition timeframe is invalid',
        code: ALERTING_LOG_CODES.DIRECTOR_TIMEFRAME_INVALID,
        labels: { rule_id: ruleId, resource },
      });
      return undefined;
    }
  }

  private getElapsedMs(currentTimestamp?: string, previousTimestamp?: string | null): number {
    if (!currentTimestamp || !previousTimestamp) {
      return 0;
    }

    const currentMs = Date.parse(currentTimestamp);
    const previousMs = Date.parse(previousTimestamp);

    if (Number.isNaN(currentMs) || Number.isNaN(previousMs)) {
      return 0;
    }

    return Math.max(0, currentMs - previousMs);
  }
}
