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
import { omit } from 'lodash';
import {
  ALERT_EPISODE_ACTION_TYPE,
  type BulkCreateEpisodeAlertActionItemBody,
  type BulkCreateSeriesAlertActionItemBody,
  type BulkResponse,
  type CreateAlertActionBody,
  type CreateEpisodeAlertActionBody,
  type CreateSeriesAlertActionBody,
  type EpisodeAlertActionType,
} from '@kbn/alerting-v2-schemas';
import { ALERT_ACTIONS_DATA_STREAM, ALERT_EVENTS_DATA_STREAM } from '@kbn/alerting-v2-constants';
import { encodeSeriesId, type DecodedSeriesId } from '@kbn/alerting-v2-utils';
import { ALERTING_ERROR_CODES } from '../errors/error_codes';
import {
  getAlertEpisodeNotFoundMessage,
  getAlertSeriesNotFoundMessage,
  getEpisodeNotLatestMessage,
} from '../errors/alert_error_messages';
import {
  ALERT_ACTIONS_RESOURCE_KEY,
  alertActionActorType,
  type AlertActionDocument,
} from '../../resources/datastreams/alert_actions';
import { ALERT_EVENTS_RESOURCE_KEY } from '../../resources/datastreams/alert_events';
import {
  ResourceManager,
  type ResourceManagerContract,
} from '../services/resource_service/resource_manager';
import { AlertActionEventPublisher } from '../events/alert_action_event_publisher/alert_action_event_publisher';
import { type QueryServiceContract } from '../services/query_service/query_service';
import { QueryServiceInternalToken } from '../services/query_service/tokens';
import type { StorageServiceContract } from '../services/storage_service/storage_service';
import { StorageServiceScopedToken } from '../services/storage_service/tokens';
import type { UserServiceContract } from '../services/user_service/user_service';
import { UserService } from '../services/user_service/user_service';
import { RequestSpaceIdToken } from '../services/spaces_service/tokens';
import {
  loadLastEpisodeAlertEventOrThrow,
  loadLastSeriesAlertEventOrThrow,
  loadLatestAlertEventsByEpisodeId,
  loadLatestAlertEventsBySeries,
} from './context_loaders/load_latest_alert_events';
import {
  EMPTY_ALERT_ACTION_STATE,
  loadAlertActionStatesByEpisodeId,
  type AlertActionState,
} from './context_loaders/load_alert_action_states';
import {
  EMPTY_SERIES_ACTION_STATE,
  loadSeriesActionStatesBySeries,
  type SeriesActionState,
} from './context_loaders/load_series_action_states';
import type { AlertEventRecord } from './types';
import type { PreparedAction } from './handler';
import {
  ACTION_HANDLERS,
  prepareWithHandler,
  requiresActionState,
  requiresSeriesActionState,
} from './handlers';
import { decodeSeriesIdOrThrow, getSeriesNotFoundError, toDecodedSeries } from './utils/series_id';

/** A single per-item error in a bulk create alert actions response. */
type BulkAlertActionError = BulkResponse['errors'][number];

/** Structured `data` carried by alert-action precondition Boom errors. */
interface AlertActionBoomData {
  code?: string;
  details?: Record<string, unknown>;
}

/**
 * Builds a per-item bulk error keyed by the item's own identifier —
 * `series_id` for series-level items, `alert_id` for episode-level items.
 * Handler-supplied context (e.g. `alert_status`) is carried in `details`.
 */
const toBulkActionError = (
  id: string,
  error: { code: string; message: string; details?: Record<string, unknown> }
): BulkAlertActionError => ({
  id,
  error: {
    code: error.code,
    message: error.message,
    ...(error.details && Object.keys(error.details).length > 0 ? { details: error.details } : {}),
  },
});

/**
 * Converts an expected per-item precondition Boom error into a bulk-error
 * entry keyed by the item's identifier. The handler-thrown `code`/`details`
 * (e.g. `alert_status`) are preserved so a client can tell *which*
 * precondition failed; handlers without a `code` fall back to the generic
 * `INTERNAL_SERVER_ERROR`.
 */
const boomToBulkActionError = (id: string, error: Boom.Boom): BulkAlertActionError => {
  // `error.data` is `unknown` on a caught Boom; the alert-action handlers only
  // ever attach the `{ code, details }` shape, so this structural read is safe.
  const data: AlertActionBoomData =
    error.data != null && typeof error.data === 'object' ? (error.data as AlertActionBoomData) : {};

  return toBulkActionError(id, {
    code: data.code ?? ALERTING_ERROR_CODES.INTERNAL_SERVER_ERROR,
    message: error.message,
    details: data.details,
  });
};

/**
 * Per-item rejections a bulk request absorbs into `errors[]`. Anything else
 * thrown while preparing an item is a real failure and aborts the batch.
 */
const EXPECTED_BULK_ITEM_STATUS_CODES = new Set([400, 404, 409]);

/**
 * Lifecycle actions (`activate` / `deactivate`) write a synthetic
 * `.rule-events` doc with `@timestamp` set at ingest time; applied to a superseded episode
 * that doc would make the old episode the group's latest and hijack the
 * director's group-level state machine, so they are guarded to the latest
 * episode of the series. The other episode actions are pure audit records
 * and may target any existing episode.
 */
/**
 * The action body fields as stored on the document: a snooze keeps its expiry
 * under `expiry`, and a tag clear (`tags: null`) is stored as the empty set so
 * the state projection reads it like any other replacement.
 */
const toStorageActionData = (action: CreateAlertActionBody) => {
  if (action.action_type === ALERT_EPISODE_ACTION_TYPE.SNOOZE) {
    return {
      ...omit(action, ['series_id', 'alert_id', 'action_type', 'snoozed_until']),
      expiry: action.snoozed_until,
    };
  }
  if (action.action_type === ALERT_EPISODE_ACTION_TYPE.TAG) {
    return { ...omit(action, ['series_id', 'alert_id', 'action_type']), tags: action.tags ?? [] };
  }
  return omit(action, ['series_id', 'alert_id', 'action_type']);
};

const isLifecycleActionType = (actionType: EpisodeAlertActionType): boolean =>
  actionType === ALERT_EPISODE_ACTION_TYPE.ACTIVATE ||
  actionType === ALERT_EPISODE_ACTION_TYPE.DEACTIVATE;

@injectable()
export class AlertActionsClient {
  constructor(
    @inject(QueryServiceInternalToken) private readonly queryService: QueryServiceContract,
    @inject(StorageServiceScopedToken) private readonly storageService: StorageServiceContract,
    @inject(UserService) private readonly userService: UserServiceContract,
    @inject(Request) private readonly request: KibanaRequest,
    @inject(RequestSpaceIdToken) private readonly spaceId: string,
    @inject(AlertActionEventPublisher)
    private readonly eventPublisher: AlertActionEventPublisher,
    @inject(ResourceManager) private readonly resourceManager: ResourceManagerContract
  ) {}

  /**
   * Creates a series-level action (`snooze` / `unsnooze`) for the
   * series identified by `seriesId`, which is decoded before any lookup: a
   * malformed id is a 400 and an id of another space is a 404. The series' latest event is still
   * resolved — it fills `rule_id`, `source` and `last_series_event_timestamp`
   * on the audit doc — but the persisted `.alert-actions` document carries
   * `alert_id: null` and the emitted domain event `episodeId: null`: the action
   * targets the series as a whole, not whichever episode happened to be current.
   */
  public async createSeriesAction(params: {
    seriesId: string;
    action: CreateSeriesAlertActionBody;
  }): Promise<void> {
    const { seriesId, action } = params;
    const series = decodeSeriesIdOrThrow(seriesId);
    if (!this.isInRequestSpace(series)) {
      throw getSeriesNotFoundError(seriesId);
    }

    const [userProfileUid, alertEvent, seriesActionStates] = await Promise.all([
      this.userService.getCurrentUserProfileUid(),
      loadLastSeriesAlertEventOrThrow({
        queryService: this.queryService,
        spaceId: this.spaceId,
        seriesId,
        series,
      }),
      this.loadSeriesActionStates(requiresSeriesActionState(action.action_type) ? [series] : []),
    ]);

    const prepared = this.prepareAction({
      action,
      alertEvent,
      userProfileUid,
      docAlertId: null,
      seriesActionState:
        seriesActionStates.get(encodeSeriesId(series) ?? seriesId) ?? EMPTY_SERIES_ACTION_STATE,
    });

    await this.persistPreparedActions([prepared]);
    this.eventPublisher.emitEpisodeActions(this.request, [prepared.alertActionDoc]);
  }

  /**
   * Creates an episode-level action (`ack` / `unack` / `assign` /
   * `activate` / `deactivate`) for the episode identified by `episodeId`.
   * The episode's own latest event provides the audit anchors, including
   * `group_hash` — the caller never supplies it.
   *
   * Lifecycle actions additionally require the episode to be the latest of
   * its series (see {@link isLifecycleActionType}); a superseded episode is
   * rejected with a 409 `ALERT_EPISODE_NOT_LATEST`.
   */
  public async createEpisodeAction(params: {
    episodeId: string;
    action: CreateEpisodeAlertActionBody;
  }): Promise<void> {
    const { episodeId, action } = params;

    const [userProfileUid, alertEvent, actionStates] = await Promise.all([
      this.userService.getCurrentUserProfileUid(),
      loadLastEpisodeAlertEventOrThrow({
        queryService: this.queryService,
        spaceId: this.spaceId,
        episodeId,
      }),
      this.loadActionStates(requiresActionState(action.action_type) ? [episodeId] : []),
    ]);

    if (isLifecycleActionType(action.action_type)) {
      const latestEpisodeId = await this.loadLatestEpisodeIdOfSeries(alertEvent);

      if (latestEpisodeId !== episodeId) {
        throw Boom.conflict(getEpisodeNotLatestMessage(episodeId, alertEvent.group_hash), {
          code: ALERTING_ERROR_CODES.ALERT_EPISODE_NOT_LATEST,
          details: { alert_id: episodeId, group_hash: alertEvent.group_hash },
        });
      }
    }

    const prepared = this.prepareAction({
      action,
      alertEvent,
      userProfileUid,
      docAlertId: alertEvent.episode_id,
      alertActionState: actionStates.get(episodeId) ?? EMPTY_ALERT_ACTION_STATE,
    });

    await this.persistPreparedActions([prepared]);
    this.eventPublisher.emitEpisodeActions(this.request, [prepared.alertActionDoc]);
  }

  /**
   * Resolves the ack / assignee / tags of the alerts whose actions are
   * preconditioned. Issued alongside the alert-event lookups rather than
   * after them: both only need the ids the caller already supplied.
   */
  private loadActionStates(episodeIds: readonly string[]): Promise<Map<string, AlertActionState>> {
    return loadAlertActionStatesByEpisodeId({
      queryService: this.queryService,
      spaceId: this.spaceId,
      episodeIds,
    });
  }

  /** Whether a decoded series id belongs to the space of the current request. */
  private isInRequestSpace(series: DecodedSeriesId): boolean {
    return series.space_id === this.spaceId;
  }

  /**
   * Resolves the snooze of the series whose actions are preconditioned, keyed
   * by the canonical series id. A series is identified by its owner and hash,
   * so another rule's snooze on a shared `group_hash` is never read.
   */
  private loadSeriesActionStates(
    series: readonly DecodedSeriesId[]
  ): Promise<Map<string, SeriesActionState>> {
    return loadSeriesActionStatesBySeries({
      queryService: this.queryService,
      spaceId: this.spaceId,
      series,
    });
  }

  /**
   * Resolves the id of the latest episode of the series `alertEvent` belongs
   * to. The series is the event's owner plus its `group_hash`, not the hash
   * alone: another rule sharing the hash must not decide which episode is
   * the latest. An event without an owner has no series to compare against.
   */
  private async loadLatestEpisodeIdOfSeries(
    alertEvent: AlertEventRecord
  ): Promise<string | undefined> {
    const latestEpisodeIds = await this.loadLatestEpisodeIdsBySeries([alertEvent]);
    return latestEpisodeIds.get(alertEvent);
  }

  /**
   * Resolves, in one query, the latest episode id of every series the given
   * events belong to. The result is keyed by the event object itself, so
   * callers look up an event's own series without recomputing identities.
   */
  private async loadLatestEpisodeIdsBySeries(
    alertEvents: readonly AlertEventRecord[]
  ): Promise<Map<AlertEventRecord, string>> {
    const seriesByEvent = new Map<AlertEventRecord, DecodedSeriesId>();
    alertEvents.forEach((alertEvent) => {
      const series = toDecodedSeries(alertEvent);
      if (series) {
        seriesByEvent.set(alertEvent, series);
      }
    });

    const latestEvents = await loadLatestAlertEventsBySeries({
      queryService: this.queryService,
      spaceId: this.spaceId,
      series: [...seriesByEvent.values()],
    });

    const latestEpisodeIds = new Map<AlertEventRecord, string>();
    seriesByEvent.forEach((series, alertEvent) => {
      const seriesId = encodeSeriesId(series);
      const latest = seriesId ? latestEvents.get(seriesId) : undefined;
      if (latest) {
        latestEpisodeIds.set(alertEvent, latest.episode_id);
      }
    });

    return latestEpisodeIds;
  }

  /**
   * Builds the writable payload for a single action. Pure / read-only
   * and **synchronous** — preconditions are evaluated and the docs are
   * constructed, but nothing is indexed and no domain event is emitted.
   * Throws on precondition failure with the same Boom error each route
   * surface relies on.
   *
   * Shared between the single-action paths (which let the throw bubble
   * back to the route) and the bulk paths (which convert the Boom
   * rejections in {@link EXPECTED_BULK_ITEM_STATUS_CODES} into per-item
   * `errors[]` entries so the rest of the batch still gets persisted).
   * All I/O the prep would have needed has already happened by the time
   * this is called.
   */
  private prepareAction(params: {
    action: CreateAlertActionBody;
    alertEvent: AlertEventRecord;
    userProfileUid: string | null;
    /**
     * `alert_id` to persist on the audit doc: the resolved event's episode
     * id for episode-scoped actions, `null` for series-scoped actions.
     */
    docAlertId: string | null;
    /** Current state of the targeted alert, for the preconditioned episode actions. */
    alertActionState?: AlertActionState;
    /** Current snooze of the targeted series, for the preconditioned series actions. */
    seriesActionState?: SeriesActionState;
  }): PreparedAction {
    const {
      action,
      alertEvent,
      userProfileUid,
      docAlertId,
      alertActionState = EMPTY_ALERT_ACTION_STATE,
      seriesActionState = EMPTY_SERIES_ACTION_STATE,
    } = params;
    const alertActionDoc = this.buildAlertActionDocument({
      action,
      alertEvent,
      userProfileUid,
      docAlertId,
    });

    return prepareWithHandler(
      { action, alertEvent, alertActionDoc, alertActionState, seriesActionState },
      ACTION_HANDLERS
    );
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

    // Docs omit `@timestamp`, so the ingest pipelines must be in place before writing.
    await Promise.all([
      this.resourceManager.ensureResourceReady(ALERT_ACTIONS_RESOURCE_KEY),
      this.resourceManager.ensureResourceReady(ALERT_EVENTS_RESOURCE_KEY),
    ]);

    await this.storageService.bulkIndexDocsAcrossIndices({
      docs,
      refresh: 'wait_for',
    });
  }

  /**
   * Bulk equivalent of {@link AlertActionsClient.createSeriesAction}: every
   * `series_id` is decoded up front (a malformed one fails the whole request
   * with a 400), then one latest-event query covers every series of the
   * request's space and one snooze-state query covers the preconditioned
   * items. Series that don't exist, or belong to another space, and failed
   * preconditions get a per-item `errors[]` entry; `alert_id: null` on every
   * persisted audit doc and `episodeId: null` on every emitted domain event.
   */
  public async createBulkSeriesActions(
    items: BulkCreateSeriesAlertActionItemBody[]
  ): Promise<BulkResponse> {
    const decodedItems = items.map((item) => {
      const series = decodeSeriesIdOrThrow(item.series_id);
      return { item, series, inRequestSpace: this.isInRequestSpace(series) };
    });
    const requestSpaceItems = decodedItems.filter(({ inRequestSpace }) => inRequestSpace);

    const [userProfileUid, latestEvents, seriesActionStates] = await Promise.all([
      this.userService.getCurrentUserProfileUid(),
      loadLatestAlertEventsBySeries({
        queryService: this.queryService,
        spaceId: this.spaceId,
        series: requestSpaceItems.map(({ series }) => series),
      }),
      this.loadSeriesActionStates(
        requestSpaceItems
          .filter(({ item }) => requiresSeriesActionState(item.action_type))
          .map(({ series }) => series)
      ),
    ]);

    const errors: BulkAlertActionError[] = [];
    const prepared: PreparedAction[] = [];

    for (const { item, series, inRequestSpace } of decodedItems) {
      const canonicalSeriesId = inRequestSpace ? encodeSeriesId(series) : null;
      const alertEvent = canonicalSeriesId ? latestEvents.get(canonicalSeriesId) : undefined;

      if (!alertEvent) {
        errors.push(
          toBulkActionError(item.series_id, {
            code: ALERTING_ERROR_CODES.ALERT_GROUP_NOT_FOUND,
            message: getAlertSeriesNotFoundMessage(item.series_id),
            details: { series_id: item.series_id },
          })
        );
        continue;
      }

      try {
        prepared.push(
          this.prepareAction({
            action: item,
            alertEvent,
            userProfileUid,
            docAlertId: null,
            seriesActionState:
              seriesActionStates.get(canonicalSeriesId ?? '') ?? EMPTY_SERIES_ACTION_STATE,
          })
        );
      } catch (error) {
        if (Boom.isBoom(error) && EXPECTED_BULK_ITEM_STATUS_CODES.has(error.output.statusCode)) {
          errors.push(boomToBulkActionError(item.series_id, error));
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
   * Bulk equivalent of {@link AlertActionsClient.createEpisodeAction}: one
   * latest-event query for every episode referenced in the batch, one
   * action-state query for the preconditioned items, plus — for lifecycle
   * items only — one latest-event query over their series to enforce the
   * latest-episode guard. Missing or superseded episodes and failed
   * preconditions are reported per item; the rest of the batch still runs.
   */
  public async createBulkEpisodeActions(
    items: BulkCreateEpisodeAlertActionItemBody[]
  ): Promise<BulkResponse> {
    const [userProfileUid, episodeEvents, actionStates] = await Promise.all([
      this.userService.getCurrentUserProfileUid(),
      loadLatestAlertEventsByEpisodeId({
        queryService: this.queryService,
        spaceId: this.spaceId,
        episodeIds: items.map((item) => item.alert_id),
      }),
      this.loadActionStates(
        items.filter((item) => requiresActionState(item.action_type)).map((item) => item.alert_id)
      ),
    ]);

    const eventByEpisodeId = new Map(episodeEvents.map((event) => [event.episode_id, event]));

    // Latest-episode guard for lifecycle items: resolve the latest episode of
    // every series a lifecycle item points at (see isLifecycleActionType).
    const lifecycleEvents = items
      .filter((item) => isLifecycleActionType(item.action_type))
      .map((item) => eventByEpisodeId.get(item.alert_id))
      .filter((event): event is AlertEventRecord => event !== undefined);
    const latestEpisodeIdByEvent = await this.loadLatestEpisodeIdsBySeries(lifecycleEvents);

    const errors: BulkAlertActionError[] = [];
    const prepared: PreparedAction[] = [];

    for (const item of items) {
      const alertEvent = eventByEpisodeId.get(item.alert_id);

      if (!alertEvent) {
        errors.push(
          toBulkActionError(item.alert_id, {
            code: ALERTING_ERROR_CODES.ALERT_EPISODE_NOT_FOUND,
            message: getAlertEpisodeNotFoundMessage(item.alert_id),
          })
        );
        continue;
      }

      if (
        isLifecycleActionType(item.action_type) &&
        latestEpisodeIdByEvent.get(alertEvent) !== item.alert_id
      ) {
        errors.push(
          toBulkActionError(item.alert_id, {
            code: ALERTING_ERROR_CODES.ALERT_EPISODE_NOT_LATEST,
            message: getEpisodeNotLatestMessage(item.alert_id, alertEvent.group_hash),
            details: { alert_id: item.alert_id, group_hash: alertEvent.group_hash },
          })
        );
        continue;
      }

      try {
        prepared.push(
          this.prepareAction({
            action: item,
            alertEvent,
            userProfileUid,
            docAlertId: alertEvent.episode_id,
            alertActionState: actionStates.get(item.alert_id) ?? EMPTY_ALERT_ACTION_STATE,
          })
        );
      } catch (error) {
        if (Boom.isBoom(error) && EXPECTED_BULK_ITEM_STATUS_CODES.has(error.output.statusCode)) {
          errors.push(boomToBulkActionError(item.alert_id, error));
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

  private buildAlertActionDocument(params: {
    action: CreateAlertActionBody;
    alertEvent: AlertEventRecord;
    userProfileUid: string | null;
    docAlertId: string | null;
  }): AlertActionDocument {
    const { action, alertEvent, userProfileUid, docAlertId } = params;
    const storageActionData = toStorageActionData(action);

    return {
      actor: {
        type: alertActionActorType.user,
        ...(userProfileUid != null ? { profile_uid: userProfileUid } : {}),
      },
      action_type: action.action_type,
      last_series_event_timestamp: alertEvent['@timestamp'],
      rule_id: alertEvent.rule_id,
      source: alertEvent.source,
      group_hash: alertEvent.group_hash,
      alert_id: docAlertId,
      space_id: alertEvent.space_id,
      ...storageActionData,
    };
  }
}
