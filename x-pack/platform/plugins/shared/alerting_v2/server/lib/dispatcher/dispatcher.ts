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

    const alertEpisodes = await this.fetchAlertEpisodes(previousStartedAt);

    const suppressions = await this.fetchAlertEpisodeSuppressions(alertEpisodes);

    const now = new Date().toISOString();
    await this.storageService.bulkIndexDocs<AlertAction>({
      index: ALERT_ACTIONS_DATA_STREAM,
      docs: alertEpisodes.map((alertEpisode) => ({
        '@timestamp': now,
        group_hash: alertEpisode.group_hash,
        last_series_event_timestamp: alertEpisode.last_event_timestamp,
        actor: 'system',
        action_type: 'fire-event',
        rule_id: alertEpisode.rule_id,
        source: 'internal',
      })),
    });

    return { startedAt };
  }

  private async fetchAlertEpisodeSuppressions(
    alertEpisodes: AlertEpisode[]
  ): Promise<AlertEpisodeSuppression[]> {
    return queryResponseToRecords<AlertEpisodeSuppression>(
      await this.queryService.executeQuery({
        query: getAlertEpisodeSuppressionsQuery(alertEpisodes).query,
      })
    );
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
