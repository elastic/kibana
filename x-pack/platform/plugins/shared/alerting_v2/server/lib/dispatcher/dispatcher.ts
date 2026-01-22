/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { ESQLSearchResponse } from '@kbn/es-types';
import { set } from '@kbn/safer-lodash-set';
import { inject, injectable } from 'inversify';
import moment from 'moment';
import { ALERT_ACTIONS_DATA_STREAM } from '../../resources/alert_actions';
import { EsServiceScopedToken } from '../services/es_service/tokens';
import {
  LoggerServiceToken,
  type LoggerServiceContract,
} from '../services/logger_service/logger_service';
import type { StorageServiceContract } from '../services/storage_service/storage_service';
import { StorageServiceScopedToken } from '../services/storage_service/tokens';
import type { AlertEpisode, RuleId, Policy } from './types';

@injectable()
export class DispatcherService {
  constructor(
    @inject(EsServiceScopedToken) private readonly esClient: ElasticsearchClient,
    @inject(LoggerServiceToken) private readonly logger: LoggerServiceContract,
    @inject(StorageServiceScopedToken) private readonly storageService: StorageServiceContract
  ) {}

  public async run({ previousStartedAt = new Date() }: { previousStartedAt?: Date } = {}) {
    const startedAt = new Date();

    const result = await this.esClient.esql.query({
      query: `FROM .alerts-events*,.alerts-actions* METADATA _index 
        | where @timestamp >= ${moment(previousStartedAt).subtract(10, 'minutes').toISOString()}
        | EVAL rule_id = COALESCE(rule.id, rule_id)
        | STATS
          last_fire = MAX(last_series_event_timestamp) WHERE _index LIKE ".ds-.alerts-actions-*" AND action_type == "fire-event",
          last_event_timestamp = MAX(@timestamp) WHERE _index LIKE ".ds-.alerts-events-*" and type == "alert"
            BY rule_id, group_hash, episode_id, episode_status
        | WHERE last_fire IS NULL OR last_event_timestamp > last_fire`,
    });

    const next = toRecords<AlertEpisode>({ columns: result.columns, values: result.values });
    this.logger.info({
      message: () => `Dispatcher found ${next.length} alert episodes to dispatch.`,
    });

    const nextRuleIds = Array.from(new Set(next.map((n) => n.rule_id)));
    this.logger.info({
      message: () =>
        `Dispatcher found ${nextRuleIds.length} unique rules with alert episodes to dispatch.`,
    });

    const policies = await this.findPoliciesAttachedToRules(nextRuleIds);
    this.logger.info({
      message: () =>
        `Dispatcher found ${policies.size} policies attached to rules with alert episodes to dispatch.`,
    });

    for (const alertEpisode of next) {
      const policy = policies.get(alertEpisode.rule_id);
      if (!policy) {
        this.logger.info({
          message: () =>
            `No policy found for rule ${alertEpisode.rule_id}, skipping alert episode dispatch for group_hash ${alertEpisode.group_hash} and episode_id ${alertEpisode.episode_id}.`,
        });
      }

      if (policy) {
        this.logger.info({
          message: () =>
            `Queuing workflow alert episode for rule ${alertEpisode.rule_id}, group_hash ${alertEpisode.group_hash}, episode_id ${alertEpisode.episode_id} using policy ${policy.name}.`,
        });
      }

      await this.storageService.bulkIndexDocs({
        index: ALERT_ACTIONS_DATA_STREAM,
        docs: [
          {
            '@timestamp': new Date().toISOString(),
            group_hash: alertEpisode.group_hash,
            last_series_event_timestamp: alertEpisode.last_event_timestamp,
            actor: 'system',
            action_type: 'fire-event',
            episode_id: alertEpisode.episode_id,
            rule_id: alertEpisode.rule_id,
            source: 'internal',
          },
        ],
      });
    }

    this.logger.info({
      message: () => `Dispatcher finished processing ${next} alert episodes.`,
    });

    return { startedAt };
  }

  private async findPoliciesAttachedToRules(ruleIds: string[]): Promise<Map<RuleId, Policy>> {
    return ruleIds.reduce((acc, ruleId) => {
      acc.set(ruleId, { id: `policy-${ruleId}`, name: `policy-name for rule ${ruleId}` });
      return acc;
    }, new Map<RuleId, Policy>());
  }
}

function toRecords<T extends Record<string, any>>(response: ESQLSearchResponse): T[] {
  const objects: T[] = [];

  if (response.columns.length === 0 || response.values.length === 0) {
    return [];
  }

  for (const row of response.values) {
    const object: T = {} as T;

    for (const [columnIndex, value] of row.entries()) {
      const columnName = response.columns[columnIndex]?.name;

      if (columnName) {
        set(object, columnName.split('.'), value);
      }
    }

    objects.push(object);
  }

  return objects;
}
