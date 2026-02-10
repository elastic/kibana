/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { esql } from '@kbn/esql-language';
import { inject, injectable } from 'inversify';
import { groupBy, omit } from 'lodash';
import { ALERT_ACTIONS_DATA_STREAM, type AlertAction } from '../../resources/alert_actions';
import { ALERT_EVENTS_DATA_STREAM } from '../../resources/alert_events';
import type {
  BulkCreateAlertActionItemBody,
  CreateAlertActionBody,
} from '../../routes/schemas/alert_action_schema';
import { queryResponseToRecords } from '../services/query_service/query_response_to_records';
import type { QueryServiceContract } from '../services/query_service/query_service';
import { QueryServiceScopedToken } from '../services/query_service/tokens';
import type { StorageServiceContract } from '../services/storage_service/storage_service';
import { StorageServiceScopedToken } from '../services/storage_service/tokens';
import type { UserServiceContract } from '../services/user_service/user_service';
import { UserService } from '../services/user_service/user_service';

@injectable()
export class AlertActionsClient {
  constructor(
    @inject(QueryServiceScopedToken) private readonly queryService: QueryServiceContract,
    @inject(StorageServiceScopedToken) private readonly storageService: StorageServiceContract,
    @inject(UserService) private readonly userService: UserServiceContract
  ) {}

  public async createAction(params: {
    groupHash: string;
    action: CreateAlertActionBody;
  }): Promise<void> {
    const [userProfileUid, alertEvent] = await Promise.all([
      this.getUserProfileUid(),
      this.findLastAlertEventRecordOrThrow({
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
          userProfileUid,
        }),
      ],
    });
  }

  public async createBulkActions(
    actions: BulkCreateAlertActionItemBody[]
  ): Promise<{ processed: number; total: number }> {
    const [userProfileUid, records] = await Promise.all([
      this.getUserProfileUid(),
      this.fetchLastAlertEventRecordsForActions(actions),
    ]);

    const recordsByGroupHash = groupBy(records, 'group_hash');
    const docs = actions
      .map((action) => {
        const groupRecords = recordsByGroupHash[action.group_hash];
        if (!groupRecords) {
          return;
        }

        const matchingAlertEventRecord =
          'episode_id' in action
            ? groupRecords.find((record) => record.episode_id === action.episode_id)
            : groupRecords[0];

        if (matchingAlertEventRecord) {
          return this.buildAlertActionDocument({
            action,
            alertEvent: matchingAlertEventRecord,
            userProfileUid,
          });
        }
      })
      .filter((doc): doc is AlertAction => doc !== undefined);

    if (docs.length > 0) {
      await this.storageService.bulkIndexDocs({ index: ALERT_ACTIONS_DATA_STREAM, docs });
    }

    return { processed: docs.length, total: actions.length };
  }

  private async fetchLastAlertEventRecordsForActions(
    actions: BulkCreateAlertActionItemBody[]
  ): Promise<AlertEventRecord[]> {
    let whereClause = esql.exp`TRUE`;
    for (const action of actions) {
      whereClause = esql.exp`${whereClause} OR (group_hash == ${action.group_hash} AND ${
        'episode_id' in action ? esql.exp`episode.id == ${action.episode_id}` : esql.exp`TRUE`
      })`;
    }

    const query = esql`
      FROM ${ALERT_EVENTS_DATA_STREAM}
      | WHERE type == "alert" AND (${whereClause})
      | STATS
        last_event_timestamp = MAX(@timestamp),
        last_episode_id = LAST(episode.id, @timestamp),
        rule_id = VALUES(rule.id)
        BY group_hash
      | KEEP last_event_timestamp, rule_id, group_hash, last_episode_id
      | RENAME last_event_timestamp AS @timestamp, last_episode_id AS episode_id
    `.toRequest();

    return queryResponseToRecords<AlertEventRecord>(
      await this.queryService.executeQuery({ query: query.query })
    );
  }

  private async getUserProfileUid(): Promise<string | null> {
    return this.userService.getCurrentUserProfileUid();
  }

  private buildAlertActionDocument(params: {
    action: CreateAlertActionBody;
    alertEvent: AlertEventRecord;
    userProfileUid: string | null;
  }): AlertAction {
    const { action, alertEvent, userProfileUid } = params;
    const actionData = omit(action, ['episode_id', 'action_type']);

    return {
      '@timestamp': new Date().toISOString(),
      actor: userProfileUid,
      action_type: action.action_type,
      last_series_event_timestamp: alertEvent['@timestamp'],
      rule_id: alertEvent.rule_id,
      group_hash: alertEvent.group_hash,
      episode_id: alertEvent.episode_id,
      ...actionData,
    };
  }

  private async findLastAlertEventRecordOrThrow(params: {
    groupHash: string;
    episodeId?: string;
  }): Promise<AlertEventRecord> {
    const { groupHash, episodeId } = params;
    const query = esql`
      FROM ${ALERT_EVENTS_DATA_STREAM}
      | WHERE type == "alert" AND group_hash == ${groupHash} AND ${
      episodeId ? esql.exp`episode.id == ${episodeId}` : esql.exp`true`
    }
      | SORT @timestamp DESC
      | RENAME rule.id AS rule_id, episode.id AS episode_id
      | KEEP @timestamp, group_hash, episode_id, rule_id
      | LIMIT 1`.toRequest();

    const result = queryResponseToRecords<AlertEventRecord>(
      await this.queryService.executeQuery({ query: query.query })
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
