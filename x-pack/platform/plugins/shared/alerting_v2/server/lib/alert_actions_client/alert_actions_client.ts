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
  type AlertEpisodeActionType,
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
import type { HandlerItem, PreparedAction } from './handler';
import { ACTION_HANDLERS, loadContextPerHandler, prepareWithHandler } from './handlers';

type ResolvedItem = HandlerItem<CreateAlertActionBody>;
type ContextByActionType = Partial<Record<AlertEpisodeActionType, unknown>>;

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

    const contextByType = await this.loadHandlerContexts([{ action, alertEvent }]);
    const prepared = this.prepareAction({ action, alertEvent, userProfileUid, contextByType });

    await this.persistPreparedActions([prepared]);
    this.eventPublisher.emitEpisodeActions(this.request, [prepared.alertActionDoc]);
  }

  /**
   * Builds the writable payload for a single action. Pure / read-only
   * and **synchronous** — preconditions are evaluated and the docs are
   * constructed, but nothing is indexed and no domain event is emitted.
   * Throws on precondition failure with the same Boom error each route
   * surface relies on.
   *
   * Shared between {@link AlertActionsClient.createAction} (which lets
   * the throw bubble back to the route) and
   * {@link AlertActionsClient.createBulkActions} (which converts
   * expected Boom 400 / 404 rejections into silent skips so the rest of
   * the batch still gets persisted). All I/O the prep would have needed
   * has already happened by the time this is called — including any
   * handler's `loadContext` preload, surfaced through `contextByType`.
   */
  private prepareAction(params: {
    action: CreateAlertActionBody;
    alertEvent: AlertEventRecord;
    userProfileUid: string | null;
    contextByType: ContextByActionType;
  }): PreparedAction {
    const { action, alertEvent, userProfileUid, contextByType } = params;
    const alertActionDoc = this.buildAlertActionDocument({ action, alertEvent, userProfileUid });

    return prepareWithHandler(
      { action, alertEvent },
      { alertActionDoc, userProfileUid, context: contextByType[action.action_type] },
      ACTION_HANDLERS
    );
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
   * Asks every handler that has a `loadContext` to preload its
   * per-item context, grouping items by `action_type` so each handler
   * sees only the inputs it cares about. The result is a sparse map
   * keyed by `action_type` and consumed by {@link prepareAction} via
   * `contextByType[action.action_type]` — the orchestrator never names
   * an individual handler directly.
   *
   * Handlers without a `loadContext` (the audit-only ones, plus
   * `deactivate`) get an `undefined` entry, which `prepareWithHandler`
   * forwards through as `ctx.context: undefined`.
   */
  private async loadHandlerContexts(items: readonly ResolvedItem[]): Promise<ContextByActionType> {
    const itemsByType = groupItemsByActionType(items);
    return loadContextPerHandler(
      itemsByType,
      {
        queryService: this.queryService,
        spaceId: this.spaceId,
      },
      ACTION_HANDLERS
    );
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

    // Stage 2: registry-driven preload. Each handler's `loadContext`
    // (if defined) sees only the items routed to it; handlers without
    // a preload contribute no I/O. Pure audit-only batches issue zero
    // extra round-trips.
    const contextByType = await this.loadHandlerContexts(resolvedAlertEvents);

    // Stage 3: synchronous per-action prep. The `try/catch` here is
    // the *only* place per-item precondition errors are tolerated —
    // Boom 400 / 404 become silent skips (preserving the bulk UX),
    // anything else propagates and fails the whole batch loudly.
    const prepared: PreparedAction[] = [];
    for (const { action, alertEvent } of resolvedAlertEvents) {
      try {
        prepared.push(this.prepareAction({ action, alertEvent, userProfileUid, contextByType }));
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
 * Buckets resolved items by `action_type` into the exact shape
 * `loadContextPerHandler` expects: a sparse record from `action_type` to
 * the list of items routed to that handler. Empty buckets are simply
 * absent — handlers without items in this batch are not invoked.
 */
const groupItemsByActionType = (
  items: readonly ResolvedItem[]
): Partial<Record<AlertEpisodeActionType, ResolvedItem[]>> => {
  const result: Partial<Record<AlertEpisodeActionType, ResolvedItem[]>> = {};
  for (const item of items) {
    const bucket = result[item.action.action_type] ?? [];
    bucket.push(item);
    result[item.action.action_type] = bucket;
  }
  return result;
};
