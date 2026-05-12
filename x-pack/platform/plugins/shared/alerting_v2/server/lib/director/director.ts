/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import { inject, injectable } from 'inversify';
import type { RuleResponse } from '@kbn/alerting-v2-schemas';
import type { LoggerServiceContract } from '../services/logger_service/logger_service';
import { LoggerServiceToken } from '../services/logger_service/logger_service';
import type { QueryServiceContract } from '../services/query_service/query_service';
import { QueryServiceInternalToken } from '../services/query_service/tokens';
import { getLatestAlertEventStateQuery, type LatestAlertEventState } from './queries';
import type { AlertEpisodeStatus } from '../../resources/datastreams/alert_events';
import {
  alertEpisodeStatus,
  alertEventType,
  type AlertEvent,
} from '../../resources/datastreams/alert_events';
import { TransitionStrategyFactory } from './strategies/strategy_resolver';
import type { ITransitionStrategy, StateTransitionResult } from './strategies/types';
import type { ExecutionContext } from '../execution_context';
import { emitEvent } from '../rule_executor/events';
import type { EpisodeTransitionedEvent, EpisodeTransitionKind } from '../rule_executor/events';

interface RunDirectorParams {
  rule: RuleResponse;
  alertEvents: readonly AlertEvent[];
  executionContext: ExecutionContext;
  /**
   * Identifier of the rule execution this director run belongs to. Used
   * exclusively to attach `executionUuid` to emitted events; the director's
   * domain logic does not depend on it.
   */
  executionUuid: string;
}

interface CalculateNextStateParams {
  rule: RuleResponse;
  currentAlertEvent: AlertEvent;
  previousAlertEvent?: LatestAlertEventState;
  strategy: ITransitionStrategy;
}

interface ResolveEpisodeIdParams {
  previousAlertEvent?: LatestAlertEventState;
  nextStatus: AlertEpisodeStatus;
}

@injectable()
export class DirectorService {
  constructor(
    @inject(TransitionStrategyFactory)
    private readonly strategyFactory: TransitionStrategyFactory,
    @inject(QueryServiceInternalToken) private readonly queryService: QueryServiceContract,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {}

  async run({
    rule,
    alertEvents,
    executionContext,
    executionUuid,
  }: RunDirectorParams): Promise<AlertEvent[]> {
    if (alertEvents.length === 0) {
      return [];
    }

    const strategy = this.strategyFactory.getStrategy(rule);
    executionContext.throwIfAborted();
    return this.processAlertEvents(rule, alertEvents, strategy, executionContext, executionUuid);
  }

  private async processAlertEvents(
    rule: RuleResponse,
    alertEvents: readonly AlertEvent[],
    strategy: ITransitionStrategy,
    executionContext: ExecutionContext,
    executionUuid: string
  ): Promise<AlertEvent[]> {
    const scope = executionContext.createScope();
    const groupHashes = [...new Set(alertEvents.map((e) => e.group_hash))];
    const alertStateByGroupHash = await this.fetchLatestAlertStateByGroupHash(
      rule,
      groupHashes,
      executionContext
    );

    scope.add(() => alertStateByGroupHash.clear());

    try {
      executionContext.throwIfAborted();

      return alertEvents.map((currentAlertEvent) => {
        const previousAlertEvent = alertStateByGroupHash.get(currentAlertEvent.group_hash);
        const result = this.getAlertEventWithNextEpisode({
          rule,
          currentAlertEvent,
          previousAlertEvent,
          strategy,
        });

        const transition = toEpisodeTransitionKind(
          previousAlertEvent?.last_episode_status,
          result.episode?.status
        );
        if (transition != null) {
          // Emit a domain event rather than calling a recorder. Telemetry
          // observer subscribes; future audit / debug-trace observers can
          // subscribe too without changes here.
          emitEvent<EpisodeTransitionedEvent>(executionContext, executionUuid, {
            kind: 'episode_transitioned',
            transition,
          });
        }

        return result;
      });
    } finally {
      await scope.disposeAll();
    }
  }

  private async fetchLatestAlertStateByGroupHash(
    rule: RuleResponse,
    groupHashes: string[],
    context: ExecutionContext
  ): Promise<Map<string, LatestAlertEventState>> {
    const request = getLatestAlertEventStateQuery({ ruleId: rule.id, groupHashes }).toRequest();
    const records = await this.queryService.executeQueryRows<LatestAlertEventState>({
      query: request.query,
      // @ts-expect-error - the types of the composer query are not compatible with the types of the esql client
      params: request.params,
      // @ts-expect-error - the types of the composer query are not compatible with the types of the esql client
      filter: request.filter,
      abortSignal: context.signal,
    });

    return new Map(records.map((record) => [record.group_hash, record]));
  }

  private getAlertEventWithNextEpisode({
    rule,
    currentAlertEvent,
    previousAlertEvent,
    strategy,
  }: CalculateNextStateParams): AlertEvent {
    const currentStatus = previousAlertEvent?.last_episode_status;

    const result: StateTransitionResult = strategy.getNextState({
      rule,
      alertEvent: currentAlertEvent,
      previousEpisode: previousAlertEvent,
    });

    const episodeId = this.resolveEpisodeId({
      previousAlertEvent,
      nextStatus: result.status,
    });

    if (currentStatus !== result.status) {
      this.logger.debug({
        message: `State Transition [${currentAlertEvent.group_hash}]: ${
          currentStatus ?? 'unknown'
        } -> ${result.status} (Episode: ${episodeId})`,
      });
    }

    return {
      ...currentAlertEvent,
      type: alertEventType.alert,
      episode: {
        id: episodeId,
        status: result.status,
        ...(result.statusCount != null ? { status_count: result.statusCount } : {}),
      },
    };
  }

  private resolveEpisodeId({ previousAlertEvent, nextStatus }: ResolveEpisodeIdParams): string {
    if (!previousAlertEvent) {
      return uuidV4();
    }

    const currentEpisodeStatus = previousAlertEvent.last_episode_status;
    const currentEpisodeId = previousAlertEvent.last_episode_id;

    if (currentEpisodeStatus == null) {
      return uuidV4();
    }

    const isNewLifecycle =
      currentEpisodeStatus === alertEpisodeStatus.inactive &&
      nextStatus !== alertEpisodeStatus.inactive;

    if (isNewLifecycle) {
      return uuidV4();
    }

    return currentEpisodeId ?? uuidV4();
  }
}

/**
 * Maps an episode status change to one of the RFC's
 * `transitioned_to_*` buckets. Returns `undefined` when:
 * - the status did not change (no transition), or
 * - the new status is `pending` (the RFC only tracks active/recovering/inactive).
 */
function toEpisodeTransitionKind(
  previousStatus: AlertEpisodeStatus | null | undefined,
  nextStatus: AlertEpisodeStatus | undefined
): EpisodeTransitionKind | undefined {
  if (nextStatus == null || nextStatus === previousStatus) {
    return undefined;
  }

  switch (nextStatus) {
    case alertEpisodeStatus.active:
      return 'active';
    case alertEpisodeStatus.recovering:
      return 'recovering';
    case alertEpisodeStatus.inactive:
      return 'inactive';
    default:
      return undefined;
  }
}
