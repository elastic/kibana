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
import { buildEpisodeDotIdInClause, buildEpisodeIdsInClause } from './utils/esql_clauses';
import {
  bulkLoadLatestAlertEvents,
  loadLastAlertEventOrThrow,
  toAlertEventRecords,
} from './context_loaders/load_latest_alert_events';
import type { AlertEventRecord } from './types';
import type { PreparedAction } from './handler';
import { prepareWithHandler } from './handlers';

type ActivateAlertActionBody = Extract<
  CreateAlertActionBody,
  { action_type: typeof ALERT_EPISODE_ACTION_TYPE.ACTIVATE }
>;

/**
 * The two pieces of data {@link AlertActionsClient.prepareActivateAction}
 * needs that aren't already on the alert event itself. We fetch these
 * in bulk (one ES|QL each, regardless of how many `activate` items the
 * caller submitted) and hand the resulting maps down so the prep helper
 * stays purely synchronous.
 */
interface ActivateContext {
  lastLifecycleActionType: string | null;
  preDeactivateEvent: AlertEventRecord | null;
}

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
      this.userService.getCurrentUserProfileUid(),
      loadLastAlertEventOrThrow({
        queryService: this.queryService,
        spaceId: this.spaceId,
        groupHash,
        episodeId: 'episode_id' in action ? action.episode_id : undefined,
      }),
    ]);

    // For `activate` we need two extra reads (last lifecycle action, pre-
    // deactivate event). Fetch them in parallel via the same batched ES|QL
    // helpers the bulk path uses — passing an array of size 1 — so the
    // single and bulk routes share one definition of "how do I look this
    // up" and the prep helper itself stays purely synchronous.
    const activateContextByEpisodeId =
      action.action_type === ALERT_EPISODE_ACTION_TYPE.ACTIVATE
        ? await this.fetchActivateContexts([alertEvent.episode_id])
        : new Map<string, ActivateContext>();

    const prepared = this.prepareAction({
      action,
      alertEvent,
      userProfileUid,
      activateContextByEpisodeId,
    });

    await this.persistPreparedActions([prepared]);
    this.eventPublisher.emitEpisodeActions(this.request, [prepared.alertActionDoc]);
  }

  /**
   * Builds the writable payload for a single action. Pure / read-only and
   * **synchronous** — preconditions are evaluated and the docs are
   * constructed, but nothing is indexed and no domain event is emitted.
   * Throws on precondition failure with the same Boom error each route
   * surface relies on.
   *
   * Shared between {@link AlertActionsClient.createAction} (which lets the
   * throw bubble back to the route) and
   * {@link AlertActionsClient.createBulkActions} (which converts expected
   * Boom 400 / 404 rejections into silent skips so the rest of the batch
   * still gets persisted). All I/O the prep would have needed has already
   * happened by the time this is called.
   */
  private prepareAction(params: {
    action: CreateAlertActionBody;
    alertEvent: AlertEventRecord;
    userProfileUid: string | null;
    activateContextByEpisodeId: ReadonlyMap<string, ActivateContext>;
  }): PreparedAction {
    const { action, alertEvent, userProfileUid, activateContextByEpisodeId } = params;
    const alertActionDoc = this.buildAlertActionDocument({ action, alertEvent, userProfileUid });

    switch (action.action_type) {
      case ALERT_EPISODE_ACTION_TYPE.ACTIVATE:
        return this.prepareActivateAction({
          action,
          alertEvent,
          alertActionDoc,
          activateContext: activateContextByEpisodeId.get(alertEvent.episode_id) ?? {
            lastLifecycleActionType: null,
            preDeactivateEvent: null,
          },
        });
      default:
        return prepareWithHandler(
          { action, alertEvent },
          { alertActionDoc, userProfileUid, context: undefined }
        );
    }
  }

  /**
   * Persists a batch of prepared actions in a single ES `_bulk` round-trip.
   * `bulkIndexAcrossIndices` is used uniformly so audit-only batches and
   * mixed audit + synthetic `.rule-events` batches share one code path. The
   * `wait_for` refresh ensures the next API/UI read sees the new state.
   */
  private async persistPreparedActions(prepared: readonly PreparedAction[]): Promise<void> {
    if (prepared.length === 0) {
      return;
    }

    const docs = prepared.flatMap(({ alertActionDoc, ruleEvent }) =>
      ruleEvent
        ? [
            { index: ALERT_EVENTS_DATA_STREAM, doc: ruleEvent },
            { index: ALERT_ACTIONS_DATA_STREAM, doc: alertActionDoc },
          ]
        : [{ index: ALERT_ACTIONS_DATA_STREAM, doc: alertActionDoc }]
    );

    await this.storageService.bulkIndexAcrossIndices({
      docs,
      refresh: 'wait_for',
    });
  }

  /**
   * Builds the docs that record a user-initiated activate (reopen). Both
   * docs share the *same* `episode.id` as the pre-existing inactive episode:
   *
   * 1. A synthetic `.rule-events` document that restores the lifecycle state
   *    the engine had observed just before the deactivate (`status` and
   *    `episode.status` copied from the pre-deactivate doc, `@timestamp` set
   *    to now). This makes `.rule-events` the source of truth again without
   *    waiting for the next rule run.
   * 2. The `.alert-actions` audit document (`action_type: activate`).
   *
   * Two preconditions are evaluated up-front. If either fails the call
   * rejects with `INVALID_EPISODE_STATE_TRANSITION` (400):
   *
   * - The latest `.rule-events` doc for the `group_hash` must carry
   *   `episode.status: inactive`. Any other status indicates either no
   *   user-deactivation ever happened, or a newer episode has superseded
   *   this one (the rule re-breached after deactivate).
   * - The most recent *lifecycle* `.alert-actions` doc for that `episode.id`
   *   must be `action_type: deactivate`. This rejects natural recoveries
   *   (no audit row at all) and double-activates.
   *
   * No I/O is performed here; persistence is the caller's responsibility
   * via {@link AlertActionsClient.persistPreparedActions}.
   */
  private prepareActivateAction(params: {
    action: ActivateAlertActionBody;
    alertEvent: AlertEventRecord;
    alertActionDoc: AlertAction;
    activateContext: ActivateContext;
  }): PreparedAction {
    const { action, alertEvent, alertActionDoc, activateContext } = params;

    this.assertEpisodeIsActivatable(alertEvent, action.action_type);
    this.assertLastLifecycleActionWasDeactivate(
      alertEvent,
      action.action_type,
      activateContext.lastLifecycleActionType
    );

    const preDeactivateEvent = this.requirePreDeactivateEvent(
      alertEvent,
      activateContext.preDeactivateEvent
    );

    const status = assertActiveOrRecovering(preDeactivateEvent.episode_status);

    const ruleEvent = buildRuleEventDocument({
      '@timestamp': new Date().toISOString(),
      rule: {
        id: preDeactivateEvent.rule_id,
        version: preDeactivateEvent.rule_version ?? 1,
      },
      group_hash: preDeactivateEvent.group_hash,
      data: preDeactivateEvent.data_json,
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

    return { alertActionDoc, ruleEvent };
  }

  private requirePreDeactivateEvent(
    alertEvent: AlertEventRecord,
    preDeactivateEvent: AlertEventRecord | null
  ): AlertEventRecord {
    if (preDeactivateEvent !== null) {
      return preDeactivateEvent;
    }

    throw Boom.notFound(
      `Pre-deactivate alert event for group_hash [${alertEvent.group_hash}] and episode_id [${alertEvent.episode_id}] not found`,
      {
        code: ALERTING_V2_ERROR_CODES.ALERT_EVENT_NOT_FOUND,
        details: {
          group_hash: alertEvent.group_hash,
          episode_id: alertEvent.episode_id,
        },
      }
    );
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
  private assertLastLifecycleActionWasDeactivate(
    alertEvent: AlertEventRecord,
    actionType: typeof ALERT_EPISODE_ACTION_TYPE.ACTIVATE,
    lastLifecycleAction: string | null
  ): void {
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

  /**
   * Bundles the two batched activate-precondition lookups into one helper
   * so single + bulk paths share the same shape: one map of
   * {@link ActivateContext} keyed by `episode_id`. Both underlying queries
   * are issued in parallel; both accept arbitrarily many episode_ids in one
   * ES|QL round-trip.
   */
  private async fetchActivateContexts(
    episodeIds: readonly string[]
  ): Promise<Map<string, ActivateContext>> {
    if (episodeIds.length === 0) {
      return new Map();
    }

    const [lifecycleByEpisodeId, preDeactivateByEpisodeId] = await Promise.all([
      this.findLastEpisodeLifecycleActionTypes(episodeIds),
      this.findPreDeactivateAlertEvents(episodeIds),
    ]);

    const contexts = new Map<string, ActivateContext>();
    for (const episodeId of episodeIds) {
      contexts.set(episodeId, {
        lastLifecycleActionType: lifecycleByEpisodeId.get(episodeId) ?? null,
        preDeactivateEvent: preDeactivateByEpisodeId.get(episodeId) ?? null,
      });
    }
    return contexts;
  }

  /**
   * Batched variant of "what is the most recent lifecycle action for this
   * episode". One ES|QL with `STATS … BY episode_id` covers every episode
   * the caller cares about. Missing entries in the returned map mean "no
   * lifecycle action ever observed for that episode" (i.e. natural recovery
   * with no user audit row).
   */
  private async findLastEpisodeLifecycleActionTypes(
    episodeIds: readonly string[]
  ): Promise<Map<string, string>> {
    if (episodeIds.length === 0) {
      return new Map();
    }

    const episodeIdsClause = buildEpisodeIdsInClause(episodeIds);

    const query = esql`
      FROM ${ALERT_ACTIONS_DATA_STREAM}
      | WHERE space_id == ${this.spaceId}
          AND (${episodeIdsClause})
          AND action_type IN (${ALERT_EPISODE_ACTION_TYPE.DEACTIVATE}, ${ALERT_EPISODE_ACTION_TYPE.ACTIVATE})
      | STATS last_action_type = LAST(action_type, @timestamp) BY episode_id
      | KEEP episode_id, last_action_type`.toRequest();

    const records = queryResponseToRecords<{ episode_id: string; last_action_type: string }>(
      await this.queryService.executeQuery({ query: query.query })
    );

    return new Map(records.map((record) => [record.episode_id, record.last_action_type]));
  }

  /**
   * Batched variant of "what is the latest active/recovering rule event for
   * this episode". One ES|QL with `STATS … BY episode.id` produces one row
   * per episode that has at least one such event; episodes with none are
   * absent from the returned map and rejected by
   * {@link AlertActionsClient.requirePreDeactivateEvent}.
   */
  private async findPreDeactivateAlertEvents(
    episodeIds: readonly string[]
  ): Promise<Map<string, AlertEventRecord>> {
    if (episodeIds.length === 0) {
      return new Map();
    }

    const episodeIdsClause = buildEpisodeDotIdInClause(episodeIds);

    const query = esql`
      FROM ${ALERT_EVENTS_DATA_STREAM} METADATA _source
      | WHERE type == "alert" AND space_id == ${this.spaceId} AND (${episodeIdsClause}) AND (episode.status == ${alertEpisodeStatus.active} OR episode.status == ${alertEpisodeStatus.recovering})
      | EVAL data_json = JSON_EXTRACT(_source, "$.data")
      | DROP _source
      | STATS
          last_ts = MAX(@timestamp),
          last_episode_status = LAST(episode.status, @timestamp),
          last_episode_status_count = LAST(episode.status_count, @timestamp),
          last_data_json = LAST(data_json, @timestamp),
          last_severity = LAST(severity, @timestamp),
          last_status = LAST(status, @timestamp),
          last_rule_id = LAST(rule.id, @timestamp),
          last_rule_version = LAST(rule.version, @timestamp),
          last_group_hash = LAST(group_hash, @timestamp),
          last_space_id = LAST(space_id, @timestamp)
        BY episode.id
      | RENAME last_ts AS @timestamp,
          episode.id AS episode_id,
          last_episode_status AS episode_status,
          last_episode_status_count AS episode_status_count,
          last_data_json AS data_json,
          last_severity AS severity,
          last_status AS status,
          last_rule_id AS rule_id,
          last_rule_version AS rule_version,
          last_group_hash AS group_hash,
          last_space_id AS space_id
      | KEEP @timestamp, group_hash, episode_id, episode_status, episode_status_count, rule_id, rule_version, space_id, status, data_json, severity`.toRequest();

    const records = toAlertEventRecords(
      await this.queryService.executeQuery({ query: query.query })
    );

    return new Map(records.map((record) => [record.episode_id, record]));
  }

  /**
   * Bulk equivalent of {@link AlertActionsClient.createAction}. Each item is
   * dispatched through the same {@link AlertActionsClient.prepareAction}
   * helper as the single route, so lifecycle actions (`deactivate` /
   * `activate`) get their preconditions and synthetic `.rule-events` doc
   * just like in the single-route flow.
   *
   * Per-item failure handling matches the existing bulk UX: if an item's
   * latest alert event cannot be located (404) or its lifecycle precondition
   * fails (400), the item is silently skipped — it does not count toward
   * `processed`, no doc is written, and no event is emitted for it. Any
   * other error (5xx, ES outage, …) bubbles up and fails the whole batch
   * so the caller sees the real problem instead of a misleadingly silent
   * "0 processed" response.
   *
   * Successful items are written in a single ES `_bulk` round-trip via
   * {@link AlertActionsClient.persistPreparedActions} and emitted as a
   * single batch of domain events. Bulk requests that contain only audit
   * actions (e.g. `ack` / `tag` / `snooze`) keep the previous one-call
   * behaviour; bulk requests with mixed lifecycle + audit items still
   * write everything in one round-trip thanks to `bulkIndexAcrossIndices`.
   */
  public async createBulkActions(
    actions: BulkCreateAlertActionItemBody[]
  ): Promise<{ processed: number; total: number }> {
    // Stage 1: resolve the user identity + the latest alert event per group
    // referenced in the batch. Two ES|QL queries, in parallel, regardless of
    // batch size.
    const [userProfileUid, latestEvents] = await Promise.all([
      this.userService.getCurrentUserProfileUid(),
      bulkLoadLatestAlertEvents({
        queryService: this.queryService,
        spaceId: this.spaceId,
        actions,
      }),
    ]);

    const recordsByGroupHash = groupBy(latestEvents, 'group_hash');
    const resolvedAlertEvents = this.resolveAlertEventsForActions(actions, recordsByGroupHash);

    // Stage 2: if any action is an `activate`, fetch its precondition data
    // for *every* such episode in two more batched ES|QL queries (last
    // lifecycle action + pre-deactivate event, in parallel). Pure non-
    // lifecycle batches skip this stage entirely.
    const activateEpisodeIds = collectActivateEpisodeIds(resolvedAlertEvents);
    const activateContextByEpisodeId = await this.fetchActivateContexts(activateEpisodeIds);

    // Stage 3: synchronous per-action prep. The `try/catch` here is the
    // *only* place per-item precondition errors are tolerated — Boom 400 /
    // 404 become silent skips (preserving the bulk UX), anything else
    // propagates and fails the whole batch loudly.
    const prepared: PreparedAction[] = [];
    for (const { action, alertEvent } of resolvedAlertEvents) {
      try {
        prepared.push(
          this.prepareAction({
            action,
            alertEvent,
            userProfileUid,
            activateContextByEpisodeId,
          })
        );
      } catch (error) {
        if (
          Boom.isBoom(error) &&
          (error.output.statusCode === 400 || error.output.statusCode === 404)
        ) {
          continue;
        }
        throw error;
      }
    }

    if (prepared.length === 0) {
      return { processed: 0, total: actions.length };
    }

    await this.persistPreparedActions(prepared);
    this.eventPublisher.emitEpisodeActions(
      this.request,
      prepared.map((p) => p.alertActionDoc)
    );

    return { processed: prepared.length, total: actions.length };
  }

  /**
   * Pairs each bulk item with the {@link AlertEventRecord} it should write
   * against. Items whose group has no event, or whose targeted `episode_id`
   * is not the group's latest episode, are silently dropped — same skip
   * semantics the bulk path has always had for `ack` / `tag` / etc.
   */
  private resolveAlertEventsForActions(
    actions: readonly BulkCreateAlertActionItemBody[],
    recordsByGroupHash: Record<string, AlertEventRecord[]>
  ): Array<{ action: BulkCreateAlertActionItemBody; alertEvent: AlertEventRecord }> {
    const resolved: Array<{
      action: BulkCreateAlertActionItemBody;
      alertEvent: AlertEventRecord;
    }> = [];
    for (const action of actions) {
      const groupRecords = recordsByGroupHash[action.group_hash];
      if (!groupRecords || groupRecords.length === 0) {
        continue;
      }
      const alertEvent =
        'episode_id' in action
          ? groupRecords.find((record) => record.episode_id === action.episode_id)
          : groupRecords[0];
      if (!alertEvent) {
        continue;
      }
      resolved.push({ action, alertEvent });
    }
    return resolved;
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
}

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

/**
 * Walks the already-resolved (action, latest alert event) pairs and returns
 * the de-duplicated set of `episode_id`s referenced by `activate` items —
 * exactly the input the batched activate-precondition fetchers need.
 */
const collectActivateEpisodeIds = (
  resolved: ReadonlyArray<{
    action: BulkCreateAlertActionItemBody;
    alertEvent: AlertEventRecord;
  }>
): string[] => {
  const episodeIds = new Set<string>();
  for (const { action, alertEvent } of resolved) {
    if (action.action_type === ALERT_EPISODE_ACTION_TYPE.ACTIVATE) {
      episodeIds.add(alertEvent.episode_id);
    }
  }
  return Array.from(episodeIds);
};
