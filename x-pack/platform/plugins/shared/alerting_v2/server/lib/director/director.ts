/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidV4 } from 'uuid';
import { inject, injectable } from 'inversify';
import type { LoggerServiceContract } from '../services/logger_service/logger_service';
import { LoggerServiceToken } from '../services/logger_service/logger_service';
import type { QueryServiceContract } from '../services/query_service/query_service';
import { QueryServiceInternalToken } from '../services/query_service/tokens';
import { getLatestAlertEventStateQuery, type LatestAlertEventState } from './queries';
import type { AlertEpisodeStatus } from '../../resources/alert_events';
import { alertEpisodeStatus, type AlertEvent } from '../../resources/alert_events';
import { TransitionStrategyFactory } from './strategies/strategy_resolver';
import type { ITransitionStrategy } from './strategies/types';
import type { ExecutionContext } from '../cancellation';

interface RunDirectorParams {
  ruleId: string;
  alertEvents: AsyncIterable<AlertEvent[]>;
  executionContext: ExecutionContext;
}

interface CalculateNextStateParams {
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

  async *run({
    ruleId,
    alertEvents,
    executionContext,
  }: RunDirectorParams): AsyncIterable<AlertEvent[]> {
    const strategy = this.strategyFactory.getStrategy();

    for await (const batch of alertEvents) {
      executionContext.throwIfAborted();

      const processedBatch = await this.processBatch(ruleId, batch, strategy, executionContext);

      if (processedBatch.length > 0) {
        yield processedBatch;
      }
    }
  }

  private async processBatch(
    ruleId: string,
    alertEvents: AlertEvent[],
    strategy: ITransitionStrategy,
    executionContext: ExecutionContext
  ): Promise<AlertEvent[]> {
    const scope = executionContext.createScope();
    const groupHashes = [...new Set(alertEvents.map((e) => e.group_hash))];
    const alertStateByGroupHash = await this.fetchLatestAlertStateByGroupHash(
      ruleId,
      groupHashes,
      executionContext
    );
    scope.add(() => alertStateByGroupHash.clear());

    try {
      executionContext.throwIfAborted();

      return alertEvents.map((currentAlertEvent) =>
        this.getAlertEventWithNextEpisode({
          currentAlertEvent,
          previousAlertEvent: alertStateByGroupHash.get(currentAlertEvent.group_hash),
          strategy,
        })
      );
    } finally {
      await scope.disposeAll();
    }
  }

  private async fetchLatestAlertStateByGroupHash(
    ruleId: string,
    groupHashes: string[],
    context: ExecutionContext
  ): Promise<Map<string, LatestAlertEventState>> {
    const request = getLatestAlertEventStateQuery({ ruleId, groupHashes }).toRequest();
    const rowBatchStream = this.queryService.executeQueryStream<LatestAlertEventState>({
      query: request.query,
      // @ts-expect-error - the types of the composer query are not compatible with the types of the esql client
      params: request.params,
      // @ts-expect-error - the types of the composer query are not compatible with the types of the esql client
      filter: request.filter,
      abortSignal: context.signal,
    });

    // Collect all rows from the batch stream (small result set for state lookup)
    const records: LatestAlertEventState[] = [];
    for await (const batch of rowBatchStream) {
      context.throwIfAborted();

      for (const row of batch) {
        records.push(row);
      }
    }

    return new Map(records.map((record) => [record.group_hash, record]));
  }

  private getAlertEventWithNextEpisode({
    currentAlertEvent,
    previousAlertEvent,
    strategy,
  }: CalculateNextStateParams): AlertEvent {
    const currentStatus = previousAlertEvent?.last_episode_status;

    const nextStatus = strategy.getNextState({
      currentAlertEpisodeStatus: currentStatus,
      alertEventStatus: currentAlertEvent.status,
    });

    const episodeId = this.resolveEpisodeId({
      previousAlertEvent,
      nextStatus,
    });

    if (currentStatus !== nextStatus) {
      this.logger.debug({
        message: `State Transition [${currentAlertEvent.group_hash}]: ${
          currentStatus ?? 'unknown'
        } -> ${nextStatus} (Episode: ${episodeId})`,
      });
    }

    return {
      ...currentAlertEvent,
      episode: {
        id: episodeId,
        status: nextStatus,
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
