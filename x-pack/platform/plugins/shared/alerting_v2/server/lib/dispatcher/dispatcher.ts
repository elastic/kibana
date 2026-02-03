/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { inject, injectable } from 'inversify';
import moment from 'moment';
import { ALERT_ACTIONS_DATA_STREAM, type AlertAction } from '../../resources/alert_actions';
import { EsServiceScopedToken } from '../services/es_service/tokens';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
import { queryResponseToRecords } from '../services/query_service/query_response_to_records';
import type { StorageServiceContract } from '../services/storage_service/storage_service';
import { StorageServiceInternalToken } from '../services/storage_service/tokens';
import { LOOKBACK_WINDOW_MINUTES } from './constants';
import { getDispatchableAlertEventsQuery } from './queries';
import type { AlertEpisode } from './types';

export interface DispatcherServiceContract {
  run({ previousStartedAt }: { previousStartedAt?: Date }): Promise<{ startedAt: Date }>;
}

@injectable()
export class DispatcherService implements DispatcherServiceContract {
  constructor(
    @inject(EsServiceScopedToken) private readonly esClient: ElasticsearchClient,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(StorageServiceInternalToken) private readonly storageService: StorageServiceContract
  ) {}

  public async run({ previousStartedAt = new Date() }: { previousStartedAt?: Date } = {}) {
    const startedAt = new Date();
    const { query } = getDispatchableAlertEventsQuery();

    // TODO: Use QueryService as soon as it uses esClient instead of data plugin client
    const result = await this.esClient.esql.query({
      query,
      filter: {
        range: {
          '@timestamp': {
            gte: moment(previousStartedAt)
              .subtract(LOOKBACK_WINDOW_MINUTES, 'minutes')
              .toISOString(),
          },
        },
      },
    });

    const dispatchableAlertEvents = queryResponseToRecords<AlertEpisode>({
      columns: result.columns,
      values: result.values,
    });
    this.logger.debug({
      message: () =>
        `Dispatcher found ${dispatchableAlertEvents.length} alert episodes to dispatch.`,
    });

    const ruleIds = Array.from(new Set(dispatchableAlertEvents.map((event) => event.rule_id)));
    this.logger.debug({
      message: () =>
        `Dispatcher found ${ruleIds.length} unique rules with alert episodes to dispatch.`,
    });

    // TODO:
    // Fetch policies associated to ruleIds to determine how to dispatch each alert episode
    // Suppress dispatchable alert events based on policies
    // Log suppressed alert events
    // Call policy defined workflow to dispatch alert events
    // insert fire-event for non-suppressed alert events

    const now = new Date().toISOString();
    await this.storageService.bulkIndexDocs<AlertAction>({
      index: ALERT_ACTIONS_DATA_STREAM,
      docs: dispatchableAlertEvents.map((alertEpisode) => ({
        '@timestamp': now,
        group_hash: alertEpisode.group_hash,
        last_series_event_timestamp: alertEpisode.last_event_timestamp,
        actor: 'system',
        action_type: 'fire-event',
        rule_id: alertEpisode.rule_id,
        source: 'internal',
      })),
    });

    this.logger.debug({
      message: () =>
        `Dispatcher finished processing ${dispatchableAlertEvents.length} alert episodes.`,
    });

    return { startedAt };
  }
}
