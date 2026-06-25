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
  type AlertEvent,
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

/**
 * Prepared write payload for one alert action. The audit `.alert-actions` doc
 * is always present; lifecycle actions (`deactivate` / `activate`) additionally
 * carry the synthetic `.rule-events` doc that flips `episode.status` so the UI
 * sees the new state without waiting for the next rule run.
 *
 * Producing this struct is side-effect-free — preconditions are evaluated and
 * docs are built, but nothing is indexed and no domain event is emitted until
 * the caller hands the batch to {@link AlertActionsClient.persistPreparedActions}
 * and then `eventPublisher.emitEpisodeActions`.
 */
interface PreparedAction {
  alertActionDoc: AlertAction;
  ruleEvent?: AlertEvent;
}

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
      this.getUserProfileUid(),
      this.findLastAlertEventRecordOrThrow({
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
      case ALERT_EPISODE_ACTION_TYPE.DEACTIVATE:
        return this.prepareDeactivateAction({ action, alertEvent, alertActionDoc });
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
        return { alertActionDoc };
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
   * Builds the docs that record a user-initiated deactivate:
   *
   * 1. A synthetic `.rule-events` document that records the terminal
   *    transition (`status: recovered`, `episode.status: inactive`), so the
   *    next read sees the deactivation immediately without waiting for the
   *    next rule run and without joining to `.alert-actions`.
   * 2. The `.alert-actions` audit document (unchanged content).
   *
   * Before building, the episode's current `episode.status` is validated:
   * only `active` and `recovering` episodes can be deactivated. `pending` is
   * not user-visible (below the activation threshold) and `inactive` is
   * already terminal. Both are rejected with `INVALID_EPISODE_STATE_TRANSITION`
   * (400). No I/O happens here; persistence is the caller's responsibility
   * via {@link AlertActionsClient.persistPreparedActions}.
   */
  private prepareDeactivateAction(params: {
    action: DeactivateAlertActionBody;
    alertEvent: AlertEventRecord;
    alertActionDoc: AlertAction;
  }): PreparedAction {
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

    return { alertActionDoc, ruleEvent };
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

    const records = queryResponseToRecords<AlertEventRecord>(
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
      this.getUserProfileUid(),
      this.findLatestAlertEventRecordsForBulk(actions),
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

  /**
   * Resolves the latest alert event for every group_hash referenced in a
   * bulk request, in a single ES|QL round-trip. Returns the same rich
   * shape as {@link AlertActionsClient.findLastAlertEventRecordOrThrow}
   * (`episode_status`, `episode_status_count`, `data_json`, `severity`,
   * `status`, `rule_version`, …) so the lifecycle prep helpers can run
   * directly on the result without per-item refetches.
   *
   * Items targeting a specific `episode_id` whose group's latest event
   * belongs to a different episode are filtered out by the caller via
   * `groupRecords.find((r) => r.episode_id === action.episode_id)` —
   * matching the silent-skip semantics the bulk path has always had for
   * non-latest-episode targeting.
   */
  private async findLatestAlertEventRecordsForBulk(
    actions: BulkCreateAlertActionItemBody[]
  ): Promise<AlertEventRecord[]> {
    if (actions.length === 0) {
      return [];
    }

    let whereClause = esql.exp`FALSE`;
    for (const action of actions) {
      whereClause = esql.exp`${whereClause} OR (group_hash == ${action.group_hash} AND ${
        'episode_id' in action ? esql.exp`episode.id == ${action.episode_id}` : esql.exp`TRUE`
      })`;
    }

    const query = esql`
      FROM ${ALERT_EVENTS_DATA_STREAM} METADATA _source
      | WHERE type == "alert" AND space_id == ${this.spaceId} AND (${whereClause})
      | EVAL data_json = JSON_EXTRACT(_source, "$.data")
      | DROP _source
      | STATS
          last_ts = MAX(@timestamp),
          last_episode_id = LAST(episode.id, @timestamp),
          last_episode_status = LAST(episode.status, @timestamp),
          last_episode_status_count = LAST(episode.status_count, @timestamp),
          last_data_json = LAST(data_json, @timestamp),
          last_severity = LAST(severity, @timestamp),
          last_status = LAST(status, @timestamp),
          last_rule_id = LAST(rule.id, @timestamp),
          last_rule_version = LAST(rule.version, @timestamp)
        BY group_hash, space_id
      | RENAME last_ts AS @timestamp,
          last_episode_id AS episode_id,
          last_episode_status AS episode_status,
          last_episode_status_count AS episode_status_count,
          last_data_json AS data_json,
          last_severity AS severity,
          last_status AS status,
          last_rule_id AS rule_id,
          last_rule_version AS rule_version
      | KEEP @timestamp, group_hash, episode_id, episode_status, episode_status_count, rule_id, rule_version, space_id, status, data_json, severity
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

/** Builds `(episode_id == "e1" OR episode_id == "e2" OR …)` for `.alert-actions`. */
const buildEpisodeIdsInClause = (episodeIds: readonly string[]) => {
  let clause = esql.exp`FALSE`;
  for (const episodeId of episodeIds) {
    clause = esql.exp`${clause} OR episode_id == ${episodeId}`;
  }
  return clause;
};

/** Builds `(episode.id == "e1" OR episode.id == "e2" OR …)` for `.rule-events`. */
const buildEpisodeDotIdInClause = (episodeIds: readonly string[]) => {
  let clause = esql.exp`FALSE`;
  for (const episodeId of episodeIds) {
    clause = esql.exp`${clause} OR episode.id == ${episodeId}`;
  }
  return clause;
};
