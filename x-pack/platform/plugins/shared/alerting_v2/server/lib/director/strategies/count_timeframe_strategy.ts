/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { injectable } from 'inversify';
import type { StateTransition } from '@kbn/alerting-v2-schemas';
import type { AlertEpisodeStatus } from '../../../resources/alert_events';
import { alertEpisodeStatus } from '../../../resources/alert_events';
import type { RuleResponse } from '../../rules_client/types';
import { parseDurationToMs } from '../../duration';
import { BasicTransitionStrategy } from './basic_strategy';
import type { StateTransitionContext, StateTransitionResult } from './types';
import type { LatestAlertEventState } from '../queries';

const DEFAULT_STATUS_COUNT = 1;

type Operator = 'AND' | 'OR';

interface ThresholdConfig {
  operator: Operator;
  count?: number;
  timeframeMs?: number;
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
 * - When no threshold is configured for a phase, the strategy behaves
 *   identically to the basic strategy for that phase.
 */
@injectable()
export class CountTimeframeStrategy extends BasicTransitionStrategy {
  override readonly name = 'count_timeframe';

  override canHandle(rule: RuleResponse): boolean {
    return rule.stateTransition != null;
  }

  override getNextState(ctx: StateTransitionContext): StateTransitionResult {
    const { rule, previousEpisode, alertEvent } = ctx;
    const stateTransition = rule.stateTransition;
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

    // --- Handle pending count of 0: skip pending, go directly to active ---
    if (this.shouldSkipPending(stateTransition, basicResult.status)) {
      return { status: alertEpisodeStatus.active, statusCount: DEFAULT_STATUS_COUNT };
    }

    // --- Handle recovering count of 0: skip recovering, go directly to inactive ---
    if (this.shouldSkipRecovering(stateTransition, basicResult.status)) {
      return { status: alertEpisodeStatus.inactive, statusCount: DEFAULT_STATUS_COUNT };
    }

    // --- Pending → Active threshold ---
    if (this.isPendingToActiveTransition(currentEpisodeStatus, basicResult.status)) {
      return this.getNextStateTransition({
        currentStatusCount,
        elapsedMs,
        operator: stateTransition.pendingOperator ?? 'OR',
        count: stateTransition.pendingCount,
        timeframeMs: stateTransition.pendingTimeframe
          ? parseDurationToMs(stateTransition.pendingTimeframe)
          : undefined,
        successStatus: alertEpisodeStatus.active,
        stayStatus: alertEpisodeStatus.pending,
      });
    }

    // --- Recovering → Inactive threshold ---
    if (this.isRecoveringToInactiveTransition(currentEpisodeStatus, basicResult.status)) {
      return this.getNextStateTransition({
        currentStatusCount,
        elapsedMs,
        operator: stateTransition.recoveringOperator ?? 'OR',
        count: stateTransition.recoveringCount,
        timeframeMs: stateTransition.recoveringTimeframe
          ? parseDurationToMs(stateTransition.recoveringTimeframe)
          : undefined,
        successStatus: alertEpisodeStatus.inactive,
        stayStatus: alertEpisodeStatus.recovering,
      });
    }

    // --- Changing to pending for the first time ---
    if (
      this.isChangingStatus(currentEpisodeStatus, basicResult.status, alertEpisodeStatus.pending)
    ) {
      return { status: alertEpisodeStatus.pending, statusCount: DEFAULT_STATUS_COUNT };
    }

    // --- Changing to recovering for the first time ---
    if (
      this.isChangingStatus(currentEpisodeStatus, basicResult.status, alertEpisodeStatus.recovering)
    ) {
      return { status: alertEpisodeStatus.recovering, statusCount: DEFAULT_STATUS_COUNT };
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
    stateTransition: NonNullable<StateTransition>,
    nextStatus: AlertEpisodeStatus
  ): boolean {
    return stateTransition.pendingCount === 0 && nextStatus === alertEpisodeStatus.pending;
  }

  private shouldSkipRecovering(
    stateTransition: NonNullable<StateTransition>,
    nextStatus: AlertEpisodeStatus
  ): boolean {
    return stateTransition.recoveringCount === 0 && nextStatus === alertEpisodeStatus.recovering;
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

  private getNextStateTransition({
    currentStatusCount,
    elapsedMs,
    operator,
    count,
    timeframeMs,
    successStatus,
    stayStatus,
  }: {
    currentStatusCount: number;
    elapsedMs: number;
    operator: Operator;
    count?: number;
    timeframeMs?: number;
    successStatus: AlertEpisodeStatus;
    stayStatus: AlertEpisodeStatus;
  }): StateTransitionResult {
    const nextCount = currentStatusCount + 1;
    const config: ThresholdConfig = { operator, count, timeframeMs };

    if (isThresholdMet(nextCount, elapsedMs, config)) {
      return { status: successStatus, statusCount: DEFAULT_STATUS_COUNT };
    }

    return { status: stayStatus, statusCount: nextCount };
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
