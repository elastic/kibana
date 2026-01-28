/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { PluginStart } from '@kbn/core-di';
import { Request } from '@kbn/core-di-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import { esql } from '@kbn/esql-language';
import type { SecurityPluginStart } from '@kbn/security-plugin/server';
import { inject, injectable, optional } from 'inversify';
import { omit } from 'lodash';
import { ALERT_ACTIONS_DATA_STREAM, type AlertAction } from '../../resources/alert_actions';
import { ALERT_EVENTS_DATA_STREAM } from '../../resources/alert_events';
import type {
  BulkCreateAlertActionItemData,
  CreateAlertActionData,
} from '../../routes/schemas/alert_action_schema';
import { queryResponseToRecords } from '../services/query_service/query_response_to_records';
import { QueryService, type QueryServiceContract } from '../services/query_service/query_service';
import type { StorageServiceContract } from '../services/storage_service/storage_service';
import { StorageServiceScopedToken } from '../services/storage_service/tokens';

@injectable()
export class AlertActionsClient {
  constructor(
    @inject(Request) private readonly request: KibanaRequest,
    @inject(QueryService) private readonly queryService: QueryServiceContract,
    @inject(StorageServiceScopedToken) private readonly storageService: StorageServiceContract,
    @optional() @inject(PluginStart('security')) private readonly security?: SecurityPluginStart
  ) {}

  public async createAction(params: {
    groupHash: string;
    action: CreateAlertActionData;
  }): Promise<void> {
    const [username, alertEvent] = await Promise.all([
      this.getUserName(),
      this.findLastAlertEventOrThrow({
        groupHash: params.groupHash,
        episodeId: 'episode_id' in params.action ? params.action.episode_id : undefined,
      }),
    ]);

    await this.storageService.bulkIndexDocs({
      index: ALERT_ACTIONS_DATA_STREAM,
      docs: [
        this.buildAlertActionDocument({
          action: params.action,
          alertEvent,
          username,
        }),
      ],
    });
  }

  public async createBulkActions(
    actions: BulkCreateAlertActionItemData[]
  ): Promise<{ processed: number; total: number }> {
    const username = await this.getUserName();

    let whereClause = esql.exp`TRUE`;
    for (const action of actions) {
      whereClause = esql.exp`${whereClause} OR (group_hash == ${action.group_hash} AND ${
        'episode_id' in action ? esql.exp`episode_id == ${action.episode_id}` : esql.exp`true`
      })`;
    }

    const query = esql`
      FROM ${ALERT_EVENTS_DATA_STREAM}
      | WHERE type == "alert" AND (${whereClause})
      | STATS 
        last_event_timestamp = MAX(@timestamp), 
        last_episode_id = LAST(episode_id, @timestamp),
        rule_id = VALUES(rule.id)
        BY group_hash
      | KEEP last_event_timestamp, rule_id, group_hash, last_episode_id
      | RENAME last_event_timestamp AS @timestamp, last_episode_id AS episode_id
    `;

    const result = queryResponseToRecords<AlertEventRecord>(
      await this.queryService.executeQuery({ query: query.print() })
    );

    const docs = actions
      .map((action) => {
        // we might want to optimize this lookup with a Map if we expect large bulk sizes
        const matchingAlertEventRecord = result.find(
          (record) =>
            record.group_hash === action.group_hash &&
            ('episode_id' in action ? record.episode_id === action.episode_id : true)
        );

        if (matchingAlertEventRecord) {
          return this.buildAlertActionDocument({
            action,
            alertEvent: matchingAlertEventRecord,
            username,
          });
        }
      })
      .filter((doc): doc is AlertAction => doc !== undefined);

    if (docs.length > 0) {
      await this.storageService.bulkIndexDocs({ index: ALERT_ACTIONS_DATA_STREAM, docs });
    }

    return { processed: docs.length, total: actions.length };
  }

  private async getUserName(): Promise<string | null> {
    return this.security?.authc.getCurrentUser(this.request)?.username ?? null;
  }

  private buildAlertActionDocument(params: {
    action: CreateAlertActionData;
    alertEvent: AlertEventRecord;
    username: string | null;
  }): AlertAction {
    const { action, alertEvent, username } = params;
    const actionData = omit(action, ['episode_id', 'action_type']);

    return {
      '@timestamp': new Date().toISOString(),
      actor: username,
      action_type: action.action_type,
      last_series_event_timestamp: alertEvent['@timestamp'],
      rule_id: alertEvent.rule_id,
      group_hash: alertEvent.group_hash,
      episode_id: alertEvent.episode_id,
      ...actionData,
    };
  }

  private async findLastAlertEventOrThrow(params: {
    groupHash: string;
    episodeId?: string;
  }): Promise<AlertEventRecord> {
    const { groupHash, episodeId } = params;
    const query = esql`
      FROM ${ALERT_EVENTS_DATA_STREAM}
      | WHERE group_hash == ${groupHash} AND ${
      episodeId ? esql.exp`episode_id == ${episodeId}` : esql.exp`true`
    }
      | SORT @timestamp DESC
      | RENAME rule.id AS rule_id
      | KEEP @timestamp, group_hash, episode_id, rule_id
      | LIMIT 1`;

    const result = queryResponseToRecords<AlertEventRecord>(
      await this.queryService.executeQuery({ query: query.print() })
    );

    if (result.length === 0) {
      throw Boom.notFound(
        `Alert event with group_hash [${groupHash}] and episode_id [${episodeId}] not found`
      );
    }

    return result[0];
  }
}

interface AlertEventRecord {
  '@timestamp': string;
  group_hash: string;
  episode_id: string;
  rule_id: string;
}
