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
import { alertEpisodeStatus, type AlertEvent } from '../../resources/datastreams/alert_events';
import { TransitionStrategyFactory } from './strategies/strategy_resolver';
import type { ITransitionStrategy, StateTransitionResult } from './strategies/types';
import type { ExecutionContext } from '../execution_context';

interface RunDirectorParams {
  rule: RuleResponse;
  alertEvents: readonly AlertEvent[];
  executionContext: ExecutionContext;
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

interface ResolveEpisodeIdResult {
  readonly episodeId: string;
  readonly isNew: boolean;
}

export interface DirectorRunStats {
  readonly newEpisodeCount: number;
}

export interface DirectorRunResult {
  readonly alertEvents: AlertEvent[];
  readonly stats: DirectorRunStats;
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
  }: RunDirectorParams): Promise<DirectorRunResult> {
    if (alertEvents.length === 0) {
      return { alertEvents: [], stats: { newEpisodeCount: 0 } };
    }

    const strategy = this.strategyFactory.getStrategy(rule);
    executionContext.throwIfAborted();
    return this.processAlertEvents(rule, alertEvents, strategy, executionContext);
  }

  private async processAlertEvents(
    rule: RuleResponse,
    alertEvents: readonly AlertEvent[],
    strategy: ITransitionStrategy,
    executionContext: ExecutionContext
  ): Promise<DirectorRunResult> {
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

      let newEpisodeCount = 0;
      const processed = alertEvents.map((currentAlertEvent) => {
        const { alertEvent, isNewEpisode } = this.getAlertEventWithNextEpisode({
          rule,
          currentAlertEvent,
          previousAlertEvent: alertStateByGroupHash.get(currentAlertEvent.group_hash),
          strategy,
        });

        if (isNewEpisode) {
          newEpisodeCount += 1;
        }

        return alertEvent;
      });

      return { alertEvents: processed, stats: { newEpisodeCount } };
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
  }: CalculateNextStateParams): { alertEvent: AlertEvent; isNewEpisode: boolean } {
    const currentStatus = previousAlertEvent?.last_episode_status;

    const result: StateTransitionResult = strategy.getNextState({
      rule,
      alertEvent: currentAlertEvent,
      previousEpisode: previousAlertEvent,
    });

    const { episodeId, isNew } = this.resolveEpisodeId({
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
      alertEvent: {
        ...currentAlertEvent,
        episode: {
          id: episodeId,
          status: result.status,
          ...(result.statusCount != null ? { status_count: result.statusCount } : {}),
        },
      },
      isNewEpisode: isNew,
    };
  }

  private resolveEpisodeId({
    previousAlertEvent,
    nextStatus,
  }: ResolveEpisodeIdParams): ResolveEpisodeIdResult {
    if (!previousAlertEvent) {
      return { episodeId: uuidV4(), isNew: true };
    }

    const currentEpisodeStatus = previousAlertEvent.last_episode_status;
    const currentEpisodeId = previousAlertEvent.last_episode_id;

    if (currentEpisodeStatus == null) {
      return { episodeId: uuidV4(), isNew: true };
    }

    const isNewLifecycle =
      currentEpisodeStatus === alertEpisodeStatus.inactive &&
      nextStatus !== alertEpisodeStatus.inactive;

    if (isNewLifecycle) {
      return { episodeId: uuidV4(), isNew: true };
    }

    if (currentEpisodeId == null) {
      return { episodeId: uuidV4(), isNew: true };
    }

    return { episodeId: currentEpisodeId, isNew: false };
  }
}
