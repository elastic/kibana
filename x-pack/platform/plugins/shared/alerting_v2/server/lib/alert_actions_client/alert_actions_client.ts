/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import { ALERT_EVENTS_DATA_STREAM } from '../../resources/datastreams/alert_events';
import { AlertActionEventPublisher } from '../events/alert_action_event_publisher/alert_action_event_publisher';
import { type QueryServiceContract } from '../services/query_service/query_service';
import { QueryServiceInternalToken } from '../services/query_service/tokens';
import type { StorageServiceContract } from '../services/storage_service/storage_service';
import { StorageServiceScopedToken } from '../services/storage_service/tokens';
import type { UserServiceContract } from '../services/user_service/user_service';
import { UserService } from '../services/user_service/user_service';
import { RequestSpaceIdToken } from '../services/spaces_service/tokens';
import {
  bulkLoadLatestAlertEvents,
  loadLastAlertEventOrThrow,
} from './context_loaders/load_latest_alert_events';
import type { AlertEventRecord } from './types';
import type { HandlerItem, HandlerServices, PreparedAction } from './handler';
import { activateHandler } from './handlers/activate';
import { prepareWithHandler } from './handlers';

type ActivateAlertActionBody = Extract<
  CreateAlertActionBody,
  { action_type: typeof ALERT_EPISODE_ACTION_TYPE.ACTIVATE }
>;

/**
 * Per-episode activate context as produced by `activateHandler.loadContext`.
 * Extracted here so the orchestrator can hand it to `prepareWithHandler`
 * for activate items without re-deriving the lookup shape from the
 * handler's TCtx.
 */
type ActivateContextByEpisodeId = Awaited<
  ReturnType<NonNullable<typeof activateHandler.loadContext>>
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
      this.userService.getCurrentUserProfileUid(),
      loadLastAlertEventOrThrow({
        queryService: this.queryService,
        spaceId: this.spaceId,
        groupHash,
        episodeId: 'episode_id' in action ? action.episode_id : undefined,
      }),
    ]);

    // Lifecycle handlers may declare a `loadContext` that needs I/O
    // (currently just `activate`, which fetches the last lifecycle audit
    // doc + the pre-deactivate rule event). Drive the same loader the
    // bulk path uses — a one-element item list — so single and bulk
    // routes share one preload definition and `prepareAction` stays
    // synchronous.
    const activateContextByEpisodeId = await this.loadActivateContext(
      action.action_type === ALERT_EPISODE_ACTION_TYPE.ACTIVATE ? [{ action, alertEvent }] : []
    );

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
    activateContextByEpisodeId: ActivateContextByEpisodeId;
  }): PreparedAction {
    const { action, alertEvent, userProfileUid, activateContextByEpisodeId } = params;
    const alertActionDoc = this.buildAlertActionDocument({ action, alertEvent, userProfileUid });

    // Step 7 replaces the per-action `context` branch with the
    // registry-driven `loadContextPerHandler` so the orchestrator stops
    // naming individual action types entirely.
    const context =
      action.action_type === ALERT_EPISODE_ACTION_TYPE.ACTIVATE
        ? activateContextByEpisodeId
        : undefined;

    return prepareWithHandler({ action, alertEvent }, { alertActionDoc, userProfileUid, context });
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
   * Delegates to {@link activateHandler.loadContext}. Centralises the
   * "build the per-episode context map for activate items" step both
   * `createAction` and `createBulkActions` need, while keeping the
   * actual ES|QL work next to the rest of the activate logic. Empty
   * input short-circuits inside the handler; the orchestrator does not
   * need to special-case it.
   *
   * Step 7 replaces this with a registry-driven `loadContextPerHandler`
   * call so the orchestrator stops naming `activate` directly.
   */
  private async loadActivateContext(
    items: ReadonlyArray<HandlerItem<ActivateAlertActionBody>>
  ): Promise<ActivateContextByEpisodeId> {
    const services: HandlerServices = { queryService: this.queryService, spaceId: this.spaceId };
    return activateHandler.loadContext!(items, services);
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

    // Stage 2: any handler whose `loadContext` needs I/O (currently
    // just `activate`) gets to preload its per-item context in one
    // batched call. Pure non-lifecycle batches go through with an
    // empty map; the handler short-circuits on empty input.
    const activateContextByEpisodeId = await this.loadActivateContext(
      collectActivateItems(resolvedAlertEvents)
    );

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
 * Walks the already-resolved (action, latest alert event) pairs and
 * returns the items whose `action_type` is `activate` — exactly the
 * input the handler's `loadContext` needs. The handler is responsible
 * for deduplicating by `episode_id` (currently via its `collectEpisodeIds`).
 */
const collectActivateItems = (
  resolved: ReadonlyArray<{
    action: BulkCreateAlertActionItemBody;
    alertEvent: AlertEventRecord;
  }>
): Array<HandlerItem<ActivateAlertActionBody>> => {
  const items: Array<HandlerItem<ActivateAlertActionBody>> = [];
  for (const { action, alertEvent } of resolved) {
    if (action.action_type === ALERT_EPISODE_ACTION_TYPE.ACTIVATE) {
      items.push({ action, alertEvent });
    }
  }
  return items;
};
