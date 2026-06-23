/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import Boom from '@hapi/boom';
import type { KibanaRequest } from '@kbn/core-http-server';
import { Request } from '@kbn/core-di-server';
import { inject, injectable } from 'inversify';
import { groupBy, omit } from 'lodash';
import {
  ALERT_EPISODE_ACTION_TYPE,
  type BulkCreateAlertActionItemBody,
  type CreateAlertActionBody,
} from '@kbn/alerting-v2-schemas';
import {
  ALERT_ACTIONS_DATA_STREAM,
  type AlertAction,
} from '../../resources/datastreams/alert_actions';
import {
  ALERT_EVENTS_DATA_STREAM,
  alertEpisodeStatus,
  alertEventStatus,
  alertEventType,
  buildRuleEventDocument,
  type AlertEpisodeStatus,
  type AlertEventSeverity,
  type AlertEventStatus,
} from '../../resources/datastreams/alert_events';
import { AlertActionEventPublisher } from '../events/alert_action_event_publisher/alert_action_event_publisher';
import { queryResponseToRecords } from '../services/query_service/query_response_to_records';
import { type QueryServiceContract } from '../services/query_service/query_service';
import { QueryServiceInternalToken } from '../services/query_service/tokens';
import type { StorageServiceContract } from '../services/storage_service/storage_service';
import { StorageServiceScopedToken } from '../services/storage_service/tokens';
import type { UserServiceContract } from '../services/user_service/user_service';
import { UserService } from '../services/user_service/user_service';
import { ALERTING_V2_ERROR_CODES } from '../errors/error_codes';
import { RequestSpaceIdToken } from '../services/spaces_service/tokens';

type DeactivateAlertActionBody = Extract<
  CreateAlertActionBody,
  { action_type: typeof ALERT_EPISODE_ACTION_TYPE.DEACTIVATE }
>;

type ActivateAlertActionBody = Extract<
  CreateAlertActionBody,
  { action_type: typeof ALERT_EPISODE_ACTION_TYPE.ACTIVATE }
>;

@injectable()
export class AlertActionsClient {
  constructor(
    @inject(QueryServiceInternalToken) private readonly queryService: QueryServiceContract,
    @inject(StorageServiceScopedToken) private readonly storageService: StorageServiceContract,
    @inject(UserService) private readonly userService: UserServiceContract,
    @inject(Request) private readonly request: KibanaRequest,
    @inject(RequestSpaceIdToken) private readonly spaceId: string,
    @inject(AlertActionEventPublisher)
    private readonly eventPublisher: AlertActionEventPublisher
  ) {}

  public async createAction(params: {
    groupHash: string;
    action: CreateAlertActionBody;
  }): Promise<void> {
    const { groupHash, action } = params;

    const [userProfileUid, alertEvent] = await Promise.all([
      this.getUserProfileUid(),
      this.findLastAlertEventRecordOrThrow({
        groupHash,
        episodeId: 'episode_id' in action ? action.episode_id : undefined,
      }),
    ]);

    const alertActionDoc = this.buildAlertActionDocument({ action, alertEvent, userProfileUid });

    switch (action.action_type) {
      case ALERT_EPISODE_ACTION_TYPE.DEACTIVATE:
        await this.createDeactivateAction({ action, alertEvent, alertActionDoc });
        break;
      case ALERT_EPISODE_ACTION_TYPE.ACTIVATE:
        await this.createActivateAction({ action, alertEvent, alertActionDoc });
        break;
      default:
        await this.bulkIndexActions([alertActionDoc]);
    }

    this.eventPublisher.emitEpisodeActions(this.request, [alertActionDoc]);
  }

  /**
   * Deactivating an episode writes two documents in a single `_bulk` call:
   *
   * 1. A synthetic `.rule-events` document that records the user-initiated
   *    terminal transition (`status: recovered`, `episode.status: inactive`),
   *    so `.rule-events` reflects the deactivation immediately without waiting
   *    for the next rule run and without joining to `.alert-actions`.
   * 2. The `.alert-actions` audit document (unchanged content).
   *
   * The rule-event item is placed first in the bulk operations so it is
   * processed ahead of the audit item — preserving the design intent that the
   * UI can never lag the audit log — while saving a network round-trip. The
   * domain event is only emitted once the bulk write resolves successfully.
   *
   * Before writing, the episode's current `episode.status` is validated: only
   * `active` and `recovering` episodes can be deactivated. `pending` is not
   * user-visible (below the activation threshold) and `inactive` is already
   * terminal. Both are rejected with `INVALID_EPISODE_STATE_TRANSITION` (400).
   */
  private async createDeactivateAction(params: {
    action: DeactivateAlertActionBody;
    alertEvent: AlertEventRecord;
    alertActionDoc: AlertAction;
  }): Promise<void> {
    const { action, alertEvent, alertActionDoc } = params;

    this.assertEpisodeIsDeactivatable(alertEvent, action.action_type);

    const ruleEvent = buildRuleEventDocument({
      '@timestamp': new Date().toISOString(),
      rule: { id: alertEvent.rule_id, version: alertEvent.rule_version ?? 1 },
      group_hash: alertEvent.group_hash,
      data: parseDataJson(alertEvent.data_json),
      status: alertEventStatus.recovered,
      source: 'internal',
      type: alertEventType.alert,
      space_id: alertEvent.space_id,
      episode: { id: alertEvent.episode_id, status: alertEpisodeStatus.inactive },
      severity: alertEvent.severity ?? undefined,
    });

    await this.storageService.bulkIndexAcrossIndices({
      docs: [
        { index: ALERT_EVENTS_DATA_STREAM, doc: ruleEvent },
        { index: ALERT_ACTIONS_DATA_STREAM, doc: alertActionDoc },
      ],
      // Keep the deactivation immediately visible to the next API/UI read.
      refresh: 'wait_for',
    });
  }

  private assertEpisodeIsDeactivatable(
    alertEvent: AlertEventRecord,
    actionType: typeof ALERT_EPISODE_ACTION_TYPE.DEACTIVATE
  ): void {
    const status = alertEvent.episode_status;
    if (status === alertEpisodeStatus.active || status === alertEpisodeStatus.recovering) {
      return;
    }

    throw Boom.badRequest(
      `Cannot deactivate episode [${alertEvent.episode_id}] with status [${
        status ?? 'unknown'
      }]; only 'active' or 'recovering' episodes can be deactivated`,
      {
        code: ALERTING_V2_ERROR_CODES.INVALID_EPISODE_STATE_TRANSITION,
        details: {
          group_hash: alertEvent.group_hash,
          episode_id: alertEvent.episode_id,
          episode_status: status ?? null,
          action_type: actionType,
        },
      }
    );
  }

  /**
   * Activating an episode reopens the *same* `episode.id` and writes two
   * documents in a single `_bulk` call:
   *
   * 1. A synthetic `.rule-events` document that restores the lifecycle state
   *    the engine had observed just before the deactivate (`status` and
   *    `episode.status` copied from the pre-deactivate doc, `@timestamp` set
   *    to now). This makes `.rule-events` the source of truth again without
   *    waiting for the next rule run.
   * 2. The `.alert-actions` audit document (`action_type: activate`).
   *
   * Two preconditions are evaluated up-front. If either fails the bulk write
   * is skipped and the call rejects with `INVALID_EPISODE_STATE_TRANSITION` (400):
   *
   * - The latest `.rule-events` doc for the `group_hash` must carry
   *   `episode.status: inactive`. Any other status indicates either no
   *   user-deactivation ever happened, or a newer episode has superseded
   *   this one (the rule re-breached after deactivate).
   * - The most recent `.alert-actions` doc for that `episode.id` must be
   *   `action_type: deactivate`. This rejects natural recoveries (no audit
   *   row at all) and double-activates.
   */
  private async createActivateAction(params: {
    action: ActivateAlertActionBody;
    alertEvent: AlertEventRecord;
    alertActionDoc: AlertAction;
  }): Promise<void> {
    const { action, alertEvent, alertActionDoc } = params;

    this.assertEpisodeIsActivatable(alertEvent, action.action_type);
    await this.assertLastLifecycleActionWasDeactivate(alertEvent, action.action_type);

    const preDeactivateEvent = await this.findPreDeactivateAlertEventOrThrow({
      groupHash: alertEvent.group_hash,
      episodeId: alertEvent.episode_id,
    });

    const status = assertActiveOrRecovering(preDeactivateEvent.episode_status);

    const ruleEvent = buildRuleEventDocument({
      '@timestamp': new Date().toISOString(),
      rule: {
        id: preDeactivateEvent.rule_id,
        version: preDeactivateEvent.rule_version ?? 1,
      },
      group_hash: preDeactivateEvent.group_hash,
      data: parseDataJson(preDeactivateEvent.data_json),
      status: preDeactivateEvent.status ?? alertEventStatus.breached,
      source: 'internal',
      type: alertEventType.alert,
      space_id: preDeactivateEvent.space_id,
      episode: {
        id: preDeactivateEvent.episode_id,
        status,
        status_count: preDeactivateEvent.episode_status_count ?? undefined,
      },
      severity: preDeactivateEvent.severity ?? undefined,
    });

    await this.storageService.bulkIndexAcrossIndices({
      docs: [
        { index: ALERT_EVENTS_DATA_STREAM, doc: ruleEvent },
        { index: ALERT_ACTIONS_DATA_STREAM, doc: alertActionDoc },
      ],
      // Keep the activation immediately visible to the next API/UI read.
      refresh: 'wait_for',
    });
  }

  private assertEpisodeIsActivatable(
    alertEvent: AlertEventRecord,
    actionType: typeof ALERT_EPISODE_ACTION_TYPE.ACTIVATE
  ): void {
    const status = alertEvent.episode_status;
    if (status === alertEpisodeStatus.inactive) {
      return;
    }

    throw Boom.badRequest(
      `Cannot activate episode [${alertEvent.episode_id}] with status [${
        status ?? 'unknown'
      }]; only 'inactive' episodes (the most recently deactivated for this group) can be activated`,
      {
        code: ALERTING_V2_ERROR_CODES.INVALID_EPISODE_STATE_TRANSITION,
        details: {
          group_hash: alertEvent.group_hash,
          episode_id: alertEvent.episode_id,
          episode_status: status ?? null,
          action_type: actionType,
        },
      }
    );
  }

  /**
   * Looks at the episode's *lifecycle* audit history only — `deactivate` and
   * `activate`, ignoring orthogonal actions like `tag`, `ack`, `assign`,
   * `snooze`, etc. The most recent lifecycle action must be `deactivate` for
   * the episode to be reopenable:
   *
   * - `null` (no lifecycle action ever) → the episode reached `inactive` via
   *   the engine's natural recovery FSM; there is no user-initiated state to
   *   invert.
   * - `activate` → either a double-activate (also caught by
   *   {@link AlertActionsClient.assertEpisodeIsActivatable}) or a
   *   user-activated episode that the engine then closed naturally; neither
   *   case is reopenable.
   * - `deactivate` → the user closed this episode; reopening is meaningful.
   *
   * Non-lifecycle actions deliberately do not affect this check: tagging or
   * assigning a deactivated episode must not block reopening it.
   */
  private async assertLastLifecycleActionWasDeactivate(
    alertEvent: AlertEventRecord,
    actionType: typeof ALERT_EPISODE_ACTION_TYPE.ACTIVATE
  ): Promise<void> {
    const lastLifecycleAction = await this.findLastEpisodeLifecycleActionType(
      alertEvent.episode_id
    );

    if (lastLifecycleAction === ALERT_EPISODE_ACTION_TYPE.DEACTIVATE) {
      return;
    }

    throw Boom.badRequest(
      `Cannot activate episode [${alertEvent.episode_id}]: the most recent lifecycle action is [${
        lastLifecycleAction ?? 'none'
      }], but [deactivate] is required to invert`,
      {
        code: ALERTING_V2_ERROR_CODES.INVALID_EPISODE_STATE_TRANSITION,
        details: {
          group_hash: alertEvent.group_hash,
          episode_id: alertEvent.episode_id,
          episode_status: alertEvent.episode_status ?? null,
          action_type: actionType,
          last_lifecycle_action: lastLifecycleAction,
        },
      }
    );
  }

  private async findLastEpisodeLifecycleActionType(episodeId: string): Promise<string | null> {
    const query = esql`
      FROM ${ALERT_ACTIONS_DATA_STREAM}
      | WHERE space_id == ${this.spaceId}
          AND episode_id == ${episodeId}
          AND action_type IN (${ALERT_EPISODE_ACTION_TYPE.DEACTIVATE}, ${ALERT_EPISODE_ACTION_TYPE.ACTIVATE})
      | SORT @timestamp DESC
      | LIMIT 1
      | KEEP action_type`.toRequest();

    const records = queryResponseToRecords<{ action_type: string }>(
      await this.queryService.executeQuery({ query: query.query })
    );

    return records.length === 0 ? null : records[0].action_type;
  }

  private async findPreDeactivateAlertEventOrThrow(params: {
    groupHash: string;
    episodeId: string;
  }): Promise<AlertEventRecord> {
    const { groupHash, episodeId } = params;
    const query = esql`
      FROM ${ALERT_EVENTS_DATA_STREAM} METADATA _source
      | WHERE type == "alert" AND space_id == ${this.spaceId} AND episode.id == ${episodeId} AND (episode.status == ${alertEpisodeStatus.active} OR episode.status == ${alertEpisodeStatus.recovering})
      | SORT @timestamp DESC
      | LIMIT 1
      | EVAL data_json = JSON_EXTRACT(_source, "$.data")
      | DROP _source
      | RENAME rule.id AS rule_id, rule.version AS rule_version, episode.id AS episode_id, episode.status AS episode_status, episode.status_count AS episode_status_count
      | KEEP @timestamp, group_hash, episode_id, episode_status, episode_status_count, rule_id, rule_version, space_id, status, data_json, severity`.toRequest();

    const result = queryResponseToRecords<AlertEventRecord>(
      await this.queryService.executeQuery({ query: query.query })
    );

    if (result.length === 0) {
      throw Boom.notFound(
        `Pre-deactivate alert event for group_hash [${groupHash}] and episode_id [${episodeId}] not found`,
        {
          code: ALERTING_V2_ERROR_CODES.ALERT_EVENT_NOT_FOUND,
          details: {
            group_hash: groupHash,
            episode_id: episodeId,
          },
        }
      );
    }

    return result[0];
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
      await this.bulkIndexActions(docs);
      this.eventPublisher.emitEpisodeActions(this.request, docs);
    }

    return { processed: docs.length, total: actions.length };
  }

  private async bulkIndexActions(docs: readonly AlertAction[]): Promise<void> {
    await this.storageService.bulkIndexDocs({
      index: ALERT_ACTIONS_DATA_STREAM,
      docs,
      // this ensures that the action is immediately visible to the user in the UI
      refresh: 'wait_for',
    });
  }

  private async fetchLastAlertEventRecordsForActions(
    actions: BulkCreateAlertActionItemBody[]
  ): Promise<AlertEventRecord[]> {
    let whereClause = esql.exp`FALSE`;
    for (const action of actions) {
      whereClause = esql.exp`${whereClause} OR (group_hash == ${action.group_hash} AND ${
        'episode_id' in action ? esql.exp`episode.id == ${action.episode_id}` : esql.exp`TRUE`
      })`;
    }

    const query = esql`
      FROM ${ALERT_EVENTS_DATA_STREAM}
      | WHERE type == "alert" AND space_id == ${this.spaceId} AND (${whereClause})
      | STATS
        last_event_timestamp = MAX(@timestamp),
        last_episode_id = LAST(episode.id, @timestamp),
        rule_id = VALUES(rule.id)
        BY group_hash, space_id
      | KEEP last_event_timestamp, rule_id, group_hash, last_episode_id, space_id
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
      space_id: alertEvent.space_id,
      ...actionData,
    };
  }

  private async findLastAlertEventRecordOrThrow(params: {
    groupHash: string;
    episodeId?: string;
  }): Promise<AlertEventRecord> {
    const { groupHash, episodeId } = params;
    const query = esql`
      FROM ${ALERT_EVENTS_DATA_STREAM} METADATA _source
      | WHERE type == "alert" AND space_id == ${this.spaceId} AND group_hash == ${groupHash} AND ${
      episodeId ? esql.exp`episode.id == ${episodeId}` : esql.exp`true`
    }
      | SORT @timestamp DESC
      | LIMIT 1
      | EVAL data_json = JSON_EXTRACT(_source, "$.data")
      | DROP _source
      | RENAME rule.id AS rule_id, rule.version AS rule_version, episode.id AS episode_id, episode.status AS episode_status
      | KEEP @timestamp, group_hash, episode_id, episode_status, rule_id, rule_version, space_id, data_json, severity`.toRequest();

    const result = queryResponseToRecords<AlertEventRecord>(
      await this.queryService.executeQuery({ query: query.query })
    );

    if (result.length === 0) {
      throw Boom.notFound(
        `Alert event with group_hash [${groupHash}] and episode_id [${episodeId}] not found`,
        {
          code: ALERTING_V2_ERROR_CODES.ALERT_EVENT_NOT_FOUND,
          details: {
            group_hash: groupHash,
            ...(episodeId ? { episode_id: episodeId } : {}),
          },
        }
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
  space_id: string;
  rule_version?: number;
  data_json?: string | null;
  severity?: AlertEventSeverity | null;
  episode_status?: AlertEpisodeStatus | null;
  status?: AlertEventStatus;
  episode_status_count?: number | null;
}

const parseDataJson = (raw: string | null | undefined): Record<string, unknown> => {
  if (typeof raw !== 'string' || raw.length === 0) {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // Malformed JSON — fall through to empty data.
  }
  return {};
};

/**
 * The pre-deactivate ESQL filter restricts to `episode.status` ∈
 * {active, recovering}, so the parsed value should always be one of these
 * two. Treat any other value as data corruption and reject before writing
 * a malformed restored event.
 */
const assertActiveOrRecovering = (
  status: AlertEpisodeStatus | null | undefined
): typeof alertEpisodeStatus.active | typeof alertEpisodeStatus.recovering => {
  if (status === alertEpisodeStatus.active || status === alertEpisodeStatus.recovering) {
    return status;
  }
  throw new Error(
    `Pre-deactivate event has unexpected episode_status [${
      status ?? 'unknown'
    }]; expected 'active' or 'recovering'`
  );
};
