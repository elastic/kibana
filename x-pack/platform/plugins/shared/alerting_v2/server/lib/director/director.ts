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
import type { RuleResponse } from '../rules_client/types';
import { queryResponseToRecords } from '../services/query_service/query_response_to_records';
import { TransitionStrategyFactory } from './strategies/strategy_resolver';
import type { ITransitionStrategy, StateTransitionResult } from './strategies/types';

interface RunDirectorParams {
  rule: RuleResponse;
  alertEvents: AlertEvent[];
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

  async run({ rule, alertEvents }: RunDirectorParams): Promise<AlertEvent[]> {
    if (alertEvents.length === 0) {
      return [];
    }

    const strategy = this.strategyFactory.getStrategy(rule);
    const groupHashes = Array.from(new Set(alertEvents.map((event) => event.group_hash)));
    const alertStateByGroupHash = await this.fetchLatestAlertStateByGroupHash(rule.id, groupHashes);

    const alertsWithNextEpisode = alertEvents.map((currentAlertEvent) =>
      this.getAlertEventWithNextEpisode({
        rule,
        currentAlertEvent,
        previousAlertEvent: alertStateByGroupHash.get(currentAlertEvent.group_hash),
        strategy,
      })
    );

    return alertsWithNextEpisode;
  }

  private async fetchLatestAlertStateByGroupHash(
    ruleId: string,
    groupHashes: string[]
  ): Promise<Map<string, LatestAlertEventState>> {
    const request = getLatestAlertEventStateQuery({ ruleId, groupHashes }).toRequest();
    const response = await this.queryService.executeQuery({
      query: request.query,
      // @ts-expect-error - the types of the composer query are not compatible with the types of the esql client
      params: request.params,
      // @ts-expect-error - the types of the composer query are not compatible with the types of the esql client
      filter: request.filter,
    });

    const records = queryResponseToRecords<LatestAlertEventState>(response);

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
