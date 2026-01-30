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
import { queryResponseToRecords } from '../services/query_service/query_response_to_records';
import { TransitionStrategyResolver } from './strategies/strategy_resolver';
import type { ITransitionStrategy } from './strategies/types';

interface RunDirectorParams {
  ruleId: string;
  alertEvents: AlertEvent[];
}

interface CalculateNextStateParams {
  currentAlertEvent: AlertEvent;
  previousAlertEvent?: LatestAlertEventState;
  strategy: ITransitionStrategy;
}

@injectable()
export class DirectorService {
  constructor(
    @inject(TransitionStrategyResolver)
    private readonly strategyResolver: TransitionStrategyResolver,
    @inject(QueryServiceInternalToken) private readonly queryService: QueryServiceContract,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract
  ) {}

  async run({ ruleId, alertEvents }: RunDirectorParams): Promise<AlertEvent[]> {
    if (alertEvents.length === 0) {
      return [];
    }

    const strategy = this.strategyResolver.resolve();
    const groupHashes = alertEvents.map((event) => event.group_hash);
    const stateByGroupHash = await this.fetchLatestStateByGroupHash(ruleId, groupHashes);

    const enrichedEvents = alertEvents.map((currentAlertEvent) =>
      this.calculateNextState({
        currentAlertEvent,
        previousAlertEvent: stateByGroupHash.get(currentAlertEvent.group_hash),
        strategy,
      })
    );

    return enrichedEvents;
  }

  private async fetchLatestStateByGroupHash(
    ruleId: string,
    groupHashes: string[]
  ): Promise<Map<string, LatestAlertEventState>> {
    const request = getLatestAlertEventStateQuery({ ruleId, groupHashes }).toRequest();
    const response = await this.queryService.executeQuery({
      query: request.query,
      params: request.params,
      filter: request.filter,
    });

    const records = queryResponseToRecords<LatestAlertEventState>(response);

    return new Map(records.map((record) => [record.group_hash, record]));
  }

  private calculateNextState({
    currentAlertEvent,
    previousAlertEvent,
    strategy,
  }: CalculateNextStateParams): AlertEvent {
    const currentStatus = previousAlertEvent?.last_episode_status ?? alertEpisodeStatus.inactive;
    const nextStatus = strategy.getNextState({
      currentAlertEpisodeStatus: currentStatus,
      alertEventStatus: currentAlertEvent.status,
    });

    const episodeId = this.resolveEpisodeId(previousAlertEvent, nextStatus);

    if (currentStatus !== nextStatus) {
      this.logger.debug({
        message: `State Transition [${currentAlertEvent.group_hash}]: ${currentStatus} -> ${nextStatus} (Episode: ${episodeId})`,
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

  private resolveEpisodeId(
    previousAlertEvent: LatestAlertEventState | undefined,
    nextStatus: AlertEpisodeStatus
  ): string {
    const wasInactive =
      !previousAlertEvent || previousAlertEvent.last_episode_status === alertEpisodeStatus.inactive;

    const isNowInactive = nextStatus === alertEpisodeStatus.inactive;

    if (wasInactive && !isNowInactive) {
      return uuidV4();
    }

    return previousAlertEvent?.last_episode_id ?? uuidV4();
  }
}
