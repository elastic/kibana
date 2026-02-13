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
import { getDispatchableAlertEventsQuery } from './queries';
import type { AlertEpisode, DispatcherExecutionParams, DispatcherExecutionResult } from './types';

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
    abortController,
  }: DispatcherExecutionParams): Promise<DispatcherExecutionResult> {
    const startedAt = new Date();
    const lookback = moment(previousStartedAt)
      .subtract(LOOKBACK_WINDOW_MINUTES, 'minutes')
      .toISOString();

    this.logger.debug({
      message: () => `Dispatcher started. Looking for alert episodes since ${lookback}`,
    });

    const { query } = getDispatchableAlertEventsQuery();

    const result = await this.queryService.executeQuery({
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
