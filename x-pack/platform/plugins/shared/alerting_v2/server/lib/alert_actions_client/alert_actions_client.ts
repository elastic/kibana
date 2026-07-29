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
  type BulkCreateAlertActionItemBody,
  type BulkResponse,
  type CreateAlertActionBody,
} from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_ERROR_CODES } from '../errors/error_codes';
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
import type { PreparedAction } from './handler';
import { ACTION_HANDLERS, prepareWithHandler } from './handlers';

/** A single per-item error in a bulk create alert actions response. */
type BulkAlertActionError = BulkResponse['errors'][number];

/** Structured `data` carried by alert-action precondition Boom errors. */
interface AlertActionBoomData {
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Builds a per-item bulk error for the action the caller submitted.
 *
 * Alert-action errors use the shared `{ id, error }` bulk shape so every bulk
 * endpoint speaks the same wire contract. `group_hash` is the item's
 * identifier, so it maps onto `id`; the optional `episode_id` — plus any
 * handler-supplied context (e.g. `episode_status`) — is carried in `details`,
 * which keeps the coarse `code` traceable to the exact submission.
 */
const toBulkAlertActionError = (
  action: BulkCreateAlertActionItemBody,
  error: { code: string; message: string; details?: Record<string, unknown> }
): BulkAlertActionError => {
  const episodeId = 'episode_id' in action ? action.episode_id : undefined;
  const details = {
    ...(episodeId ? { episode_id: episodeId } : {}),
    ...error.details,
  };

  return {
    id: action.group_hash,
    error: {
      code: error.code,
      message: error.message,
      ...(Object.keys(details).length > 0 ? { details } : {}),
    },
  };
};

/**
 * Converts an expected per-item precondition Boom error into a bulk-error
 * entry. The handler-thrown `code`/`details` (e.g. `episode_status`) are
 * preserved so a client can tell *which* precondition failed. When a handler
 * throws without attaching a `code`, fall back to the generic
 * `INTERNAL_SERVER_ERROR` — precondition failures span multiple action kinds,
 * so we must not assume a specific one (e.g. an episode state-transition).
 */
const preconditionErrorToItem = (
  action: BulkCreateAlertActionItemBody,
  error: Boom.Boom
): BulkAlertActionError => {
  // `error.data` is `unknown` on a caught Boom; the alert-action handlers only
  // ever attach the `{ code, details }` shape, so this structural read is safe.
  const data: AlertActionBoomData =
    error.data != null && typeof error.data === 'object' ? (error.data as AlertActionBoomData) : {};

  return toBulkAlertActionError(action, {
    code: data.code ?? ALERTING_V2_ERROR_CODES.INTERNAL_SERVER_ERROR,
    message: error.message,
    details: data.details,
  });
};

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

    const prepared = this.prepareAction({ action, alertEvent, userProfileUid });

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
   * expected Boom 400 / 404 rejections into per-item `errors[]` entries so
   * the rest of the batch still gets persisted). All I/O the prep would have
   * needed has already happened by the time this is called.
   */
  private prepareAction(params: {
    action: CreateAlertActionBody;
    alertEvent: AlertEventRecord;
    userProfileUid: string | null;
  }): PreparedAction {
    const { action, alertEvent, userProfileUid } = params;
    const alertActionDoc = this.buildAlertActionDocument({ action, alertEvent, userProfileUid });

    return prepareWithHandler({ action, alertEvent, alertActionDoc }, ACTION_HANDLERS);
  }

  /**
   * Persists a batch of prepared actions in a single ES `_bulk` round-trip.
   * `bulkIndexDocsAcrossIndices` is used uniformly so audit-only batches and
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

    await this.storageService.bulkIndexDocsAcrossIndices({
      docs,
      refresh: 'wait_for',
    });
  }

  /**
   * Bulk equivalent of {@link AlertActionsClient.createAction}. Each item is
   * dispatched through the same {@link AlertActionsClient.prepareAction}
   * helper as the single route, so lifecycle actions (`deactivate` /
   * `activate`) get their preconditions and synthetic `.rule-events` doc
   * just like in the single-route flow.
   *
   * Two-tier per-item failure handling:
   * - A missing group (`ALERT_GROUP_NOT_FOUND`), a superseded episode
   *   (`ALERT_EPISODE_NOT_FOUND`), or a lifecycle precondition conflict
   *   (Boom 400/404, e.g. `INVALID_EPISODE_STATE_TRANSITION`) is recorded in
   *   the `errors[]` array and the rest of the batch still runs. Alert
   *   actions are append-only event records with nothing to roll back, so
   *   reporting per item beats aborting the whole batch on a stale selection.
   * - Any other error (5xx, ES outage, …) propagates and fails the whole
   *   batch so the caller sees the real problem.
   *
   * Successful items are written in a single ES `_bulk` round-trip via
   * {@link AlertActionsClient.persistPreparedActions} and emitted as a single
   * batch of domain events, then reported as `affected_count`.
   */
  public async createBulkActions(actions: BulkCreateAlertActionItemBody[]): Promise<BulkResponse> {
    // Stage 1: resolve the user identity + the latest alert event per group
    // referenced in the batch. Two queries, in parallel, regardless of
    // batch size.
    const [userProfileUid, latestEvents] = await Promise.all([
      this.userService.getCurrentUserProfileUid(),
      bulkLoadLatestAlertEvents({
        queryService: this.queryService,
        spaceId: this.spaceId,
        actions,
      }),
    ]);

    const latestEventsByGroupHash = groupBy(latestEvents, (event) => event.group_hash);
    const { resolved, errors: pairingErrors } = this.pairActionsWithLatestEvents(
      actions,
      latestEventsByGroupHash
    );

    const errors: BulkAlertActionError[] = [...pairingErrors];
    const prepared: PreparedAction[] = [];

    for (const { action, alertEvent } of resolved) {
      try {
        prepared.push(this.prepareAction({ action, alertEvent, userProfileUid }));
      } catch (error) {
        if (
          Boom.isBoom(error) &&
          (error.output.statusCode === 400 || error.output.statusCode === 404)
        ) {
          errors.push(preconditionErrorToItem(action, error));
          continue;
        }
        throw error;
      }
    }

    if (prepared.length > 0) {
      await this.persistPreparedActions(prepared);
      this.eventPublisher.emitEpisodeActions(
        this.request,
        prepared.map((p) => p.alertActionDoc)
      );
    }

    return { affected_count: prepared.length, errors };
  }

  /**
   * Pairs each bulk item with the {@link AlertEventRecord} it should write
   * against. Items whose group has no event (`ALERT_GROUP_NOT_FOUND`), or
   * whose targeted `episode_id` is not the group's latest episode
   * (`ALERT_EPISODE_NOT_FOUND`), are returned as per-item errors instead of
   * being silently dropped, so the caller learns which items were skipped
   * and why.
   */
  private pairActionsWithLatestEvents(
    actions: readonly BulkCreateAlertActionItemBody[],
    latestEventsByGroupHash: Record<string, AlertEventRecord[]>
  ): {
    resolved: Array<{ action: BulkCreateAlertActionItemBody; alertEvent: AlertEventRecord }>;
    errors: BulkAlertActionError[];
  } {
    const resolved: Array<{
      action: BulkCreateAlertActionItemBody;
      alertEvent: AlertEventRecord;
    }> = [];
    const errors: BulkAlertActionError[] = [];

    for (const action of actions) {
      // The loader groups `STATS … BY group_hash, space_id`, so each
      // bucket is length-≤1: at most one "latest" row per group.
      const [alertEvent] = latestEventsByGroupHash[action.group_hash] ?? [];

      if (!alertEvent) {
        errors.push(
          toBulkAlertActionError(action, {
            code: ALERTING_V2_ERROR_CODES.ALERT_GROUP_NOT_FOUND,
            message: `No alert event found for group [${action.group_hash}]`,
          })
        );
        continue;
      }

      // Supersession guard: an item that narrowed to a specific `episode_id`
      // must not be paired with a newer episode of the same group. Mirrors
      // the activate handler's "cannot act on a superseded episode"
      // precondition, reported per item for the bulk path.
      if ('episode_id' in action && alertEvent.episode_id !== action.episode_id) {
        errors.push(
          toBulkAlertActionError(action, {
            code: ALERTING_V2_ERROR_CODES.ALERT_EPISODE_NOT_FOUND,
            message: `Episode [${action.episode_id}] is not the latest episode for group [${action.group_hash}]`,
          })
        );
        continue;
      }

      resolved.push({ action, alertEvent });
    }

    return { resolved, errors };
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
