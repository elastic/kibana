/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { inject, injectable } from 'inversify';
import moment from 'moment';
import { ALERT_ACTIONS_DATA_STREAM, type AlertAction } from '../../resources/alert_actions';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
import { queryResponseToRecords } from '../services/query_service/query_response_to_records';
import type { QueryServiceContract } from '../services/query_service/query_service';
import { QueryServiceInternalToken } from '../services/query_service/tokens';
import type { StorageServiceContract } from '../services/storage_service/storage_service';
import { StorageServiceInternalToken } from '../services/storage_service/tokens';
import { LOOKBACK_WINDOW_MINUTES } from './constants';
import { getAlertEpisodeSuppressionsQuery, getDispatchableAlertEventsQuery } from './queries';
import type {
  AlertEpisode,
  AlertEpisodeSuppression,
  DispatcherExecutionParams,
  DispatcherExecutionResult,
} from './types';
import { withDispatcherSpan } from './with_dispatcher_span';

export interface DispatcherServiceContract {
  run(params: DispatcherExecutionParams): Promise<DispatcherExecutionResult>;
}

@injectable()
export class DispatcherService implements DispatcherServiceContract {
  constructor(
    @inject(QueryServiceInternalToken) private readonly queryService: QueryServiceContract,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(StorageServiceInternalToken) private readonly storageService: StorageServiceContract
  ) {}

  public async run({
    previousStartedAt = new Date(),
  }: DispatcherExecutionParams): Promise<DispatcherExecutionResult> {
    const startedAt = new Date();

    const alertEpisodes = await withDispatcherSpan('dispatcher:fetch-alert-episodes', () =>
      this.fetchAlertEpisodes(previousStartedAt)
    );
    const suppressions = await withDispatcherSpan('dispatcher:fetch-suppressions', () =>
      this.fetchAlertEpisodeSuppressions(alertEpisodes)
    );

    const suppressedEpisodes = alertEpisodes.filter((episode) =>
      suppressions.some(
        (s) =>
          s.should_suppress &&
          s.rule_id === episode.rule_id &&
          s.group_hash === episode.group_hash &&
          (s.episode_id == null || s.episode_id === episode.episode_id)
      )
    );
    const nonSuppressedEpisodes = alertEpisodes.filter(
      (episode) => !suppressedEpisodes.includes(episode)
    );

    this.logger.info({
      message: `Dispatcher processed ${alertEpisodes.length} alert episodes: ${suppressedEpisodes.length} suppressed, ${nonSuppressedEpisodes.length} not suppressed`,
    });

    const now = new Date().toISOString();
    const toFireEventAction = (alertEpisode: AlertEpisode, isSuppressed: boolean): AlertAction => ({
      '@timestamp': now,
      group_hash: alertEpisode.group_hash,
      last_series_event_timestamp: alertEpisode.last_event_timestamp,
      actor: 'system',
      action_type: isSuppressed ? 'suppress' : 'fire',
      rule_id: alertEpisode.rule_id,
      source: 'internal',
    });

    await withDispatcherSpan('dispatcher:bulk-index-actions', () =>
      this.storageService.bulkIndexDocs<AlertAction>({
        index: ALERT_ACTIONS_DATA_STREAM,
        docs: [
          ...suppressedEpisodes.map((episode) => toFireEventAction(episode, true)),
          ...nonSuppressedEpisodes.map((episode) => toFireEventAction(episode, false)),
        ],
      })
    );

    return { startedAt };
  }

  private async fetchAlertEpisodeSuppressions(
    alertEpisodes: AlertEpisode[]
  ): Promise<AlertEpisodeSuppression[]> {
    if (alertEpisodes.length === 0) {
      return [];
    }

    const result = await this.queryService.executeQuery({
      query: getAlertEpisodeSuppressionsQuery(alertEpisodes).query,
    });

    return queryResponseToRecords<AlertEpisodeSuppression>(result);
  }

  private async fetchAlertEpisodes(previousStartedAt: Date): Promise<AlertEpisode[]> {
    const lookback = moment(previousStartedAt)
      .subtract(LOOKBACK_WINDOW_MINUTES, 'minutes')
      .toISOString();

    const result = await this.queryService.executeQuery({
      query: getDispatchableAlertEventsQuery().query,
      filter: {
        range: {
          '@timestamp': {
            gte: lookback,
          },
        },
      },
    });

    return queryResponseToRecords<AlertEpisode>(result);
  }
}
