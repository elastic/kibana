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
import type { AlertEpisode, Policy, RuleId } from './types';

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

    const ruleIds = Array.from(new Set(dispatchableAlertEvents.map((n) => n.rule_id)));
    this.logger.debug({
      message: () =>
        `Dispatcher found ${ruleIds.length} unique rules with alert episodes to dispatch.`,
    });

    // TODO: Rule might have more than one policy attached to it
    const policies = await this.findPoliciesAttachedToRules(ruleIds);
    this.logger.debug({
      message: () =>
        `Dispatcher found ${policies.size} policies attached to rules with alert episodes to dispatch.`,
    });

    for (const alertEpisode of dispatchableAlertEvents) {
      // TODO: Rule might have more than one policy attached to it
      const policy = policies.get(alertEpisode.rule_id);
      if (!policy) {
        this.logger.debug({
          message: () =>
            `No policy found for rule ${alertEpisode.rule_id}, skipping alert episode dispatch for group_hash ${alertEpisode.group_hash} and episode_id ${alertEpisode.episode_id}.`,
        });
      }

      if (policy) {
        this.logger.debug({
          message: () =>
            `Queuing workflow alert episode for rule ${alertEpisode.rule_id}, group_hash ${alertEpisode.group_hash}, episode_id ${alertEpisode.episode_id} using policy ${policy.name}.`,
        });

        await this.storageService.bulkIndexDocs<AlertAction>({
          index: ALERT_ACTIONS_DATA_STREAM,
          docs: [
            {
              '@timestamp': new Date().toISOString(),
              group_hash: alertEpisode.group_hash,
              last_series_event_timestamp: alertEpisode.last_event_timestamp,
              actor: 'system',
              action_type: 'fire-event',
              rule_id: alertEpisode.rule_id,
              source: 'internal',
            },
          ],
        });
      }
    }

    this.logger.debug({
      message: () =>
        `Dispatcher finished processing ${dispatchableAlertEvents.length} alert episodes.`,
    });

    return { startedAt };
  }

  private async findPoliciesAttachedToRules(ruleIds: string[]): Promise<Map<RuleId, Policy>> {
    return ruleIds.reduce((acc, ruleId) => {
      acc.set(ruleId, { id: `policy-${ruleId}`, name: `policy-name-${ruleId}` });
      return acc;
    }, new Map<RuleId, Policy>());
  }
}
