/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { esql } from '@elastic/esql';
import Boom from '@hapi/boom';
import { ALERT_EPISODE_ACTION_TYPE, type CreateAlertActionBody } from '@kbn/alerting-v2-schemas';
import { ALERT_ACTIONS_DATA_STREAM } from '../../../resources/datastreams/alert_actions';
import {
  ALERT_EVENTS_DATA_STREAM,
  alertEpisodeStatus,
  alertEventStatus,
  alertEventType,
  buildRuleEventDocument,
  type AlertEpisodeStatus,
} from '../../../resources/datastreams/alert_events';
import { ALERTING_V2_ERROR_CODES } from '../../errors/error_codes';
import { queryResponseToRecords } from '../../services/query_service/query_response_to_records';
import { toAlertEventRecords } from '../context_loaders/load_latest_alert_events';
import type { QueryServiceContract } from '../../services/query_service/query_service';
import type { ActionHandler, HandlerItem, HandlerServices } from '../handler';
import type { AlertEventRecord } from '../types';
import { buildEpisodeDotIdInClause, buildEpisodeIdsInClause } from '../utils/esql_clauses';

type ActivateAlertActionBody = Extract<
  CreateAlertActionBody,
  { action_type: typeof ALERT_EPISODE_ACTION_TYPE.ACTIVATE }
>;

/**
 * Per-episode context the activate handler needs at `prepare` time:
 *
 * - `lastLifecycleActionType` — the most recent `deactivate`/`activate`
 *   audit doc for the episode (ignoring `tag`/`ack`/`assign`/etc.). `null`
 *   means the episode has never been user-deactivated or user-activated.
 * - `preDeactivateEvent` — the latest engine-emitted `.rule-events`
 *   document for the episode that observed `episode.status: active` or
 *   `recovering`. The synthetic rule event the activate writes is a copy
 *   of this row with `@timestamp` advanced to now, so the engine state
 *   the user is restoring is captured deterministically.
 */
interface ActivateContext {
  lastLifecycleActionType: string | null;
  preDeactivateEvent: AlertEventRecord | null;
}

/**
 * The handler's TCtx: a per-episode lookup. `loadContext` returns one
 * entry per episode_id present in `items`; `prepare` reads its episode's
 * entry off this map.
 */
type ActivateContextByEpisodeId = ReadonlyMap<string, ActivateContext>;

const collectEpisodeIds = (
  items: ReadonlyArray<HandlerItem<ActivateAlertActionBody>>
): string[] => {
  const ids = new Set<string>();
  for (const { alertEvent } of items) {
    ids.add(alertEvent.episode_id);
  }
  return Array.from(ids);
};

/**
 * Batched lifecycle lookup: for every episode_id, returns the most
 * recent `deactivate`/`activate` audit row (the discriminator that
 * decides whether the episode is a candidate for reopening). Episodes
 * with no lifecycle audit row are absent from the returned map.
 */
const findLastEpisodeLifecycleActionTypes = async ({
  queryService,
  spaceId,
  episodeIds,
}: {
  queryService: QueryServiceContract;
  spaceId: string;
  episodeIds: readonly string[];
}): Promise<Map<string, string>> => {
  if (episodeIds.length === 0) {
    return new Map();
  }

  const episodeIdsClause = buildEpisodeIdsInClause(episodeIds);

  const query = esql`
      FROM ${ALERT_ACTIONS_DATA_STREAM}
      | WHERE space_id == ${spaceId}
          AND (${episodeIdsClause})
          AND action_type IN (${ALERT_EPISODE_ACTION_TYPE.DEACTIVATE}, ${ALERT_EPISODE_ACTION_TYPE.ACTIVATE})
      | STATS last_action_type = LAST(action_type, @timestamp) BY episode_id
      | KEEP episode_id, last_action_type`.toRequest();

  const records = queryResponseToRecords<{ episode_id: string; last_action_type: string }>(
    await queryService.executeQuery({ query: query.query })
  );

  return new Map(records.map((record) => [record.episode_id, record.last_action_type]));
};

/**
 * Batched pre-deactivate lookup: for every episode_id, returns the
 * latest engine-emitted `.rule-events` document that observed an
 * `active`/`recovering` `episode.status`. The handler writes a synthetic
 * copy of this row (with `@timestamp` advanced to now) so the post-
 * activate engine view matches the pre-deactivate one.
 *
 * Episodes with no qualifying row are absent from the returned map and
 * are rejected at `prepare` time with `ALERT_EVENT_NOT_FOUND` (404).
 */
const findPreDeactivateAlertEvents = async ({
  queryService,
  spaceId,
  episodeIds,
}: {
  queryService: QueryServiceContract;
  spaceId: string;
  episodeIds: readonly string[];
}): Promise<Map<string, AlertEventRecord>> => {
  if (episodeIds.length === 0) {
    return new Map();
  }

  const episodeIdsClause = buildEpisodeDotIdInClause(episodeIds);

  const query = esql`
      FROM ${ALERT_EVENTS_DATA_STREAM} METADATA _source
      | WHERE type == "alert" AND space_id == ${spaceId} AND (${episodeIdsClause}) AND (episode.status == ${alertEpisodeStatus.active} OR episode.status == ${alertEpisodeStatus.recovering})
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

  const records = toAlertEventRecords(await queryService.executeQuery({ query: query.query }));

  return new Map(records.map((record) => [record.episode_id, record]));
};

/**
 * Only `inactive` episodes can be reopened: any other status indicates
 * the engine is still observing the alert (so user activation would
 * fight the engine's next emit) or the episode has not yet reached the
 * activation threshold.
 */
const assertEpisodeIsActivatable = (alertEvent: AlertEventRecord): void => {
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
        action_type: ALERT_EPISODE_ACTION_TYPE.ACTIVATE,
      },
    }
  );
};

/**
 * The episode's most recent *lifecycle* audit doc must be `deactivate`
 * for reopening to be meaningful:
 *
 * - `null` (no lifecycle action) → the episode reached `inactive` via
 *   the engine's natural recovery FSM; there is no user-initiated state
 *   to invert.
 * - `activate` → either a double-activate (also caught by the episode-
 *   status precondition) or a user-activated episode that the engine
 *   then closed naturally; neither case is reopenable.
 * - `deactivate` → the user closed this episode; reopening is meaningful.
 *
 * Non-lifecycle actions deliberately do not affect this check.
 */
const assertLastLifecycleActionWasDeactivate = (
  alertEvent: AlertEventRecord,
  lastLifecycleAction: string | null
): void => {
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
        action_type: ALERT_EPISODE_ACTION_TYPE.ACTIVATE,
        last_lifecycle_action: lastLifecycleAction,
      },
    }
  );
};

const requirePreDeactivateEvent = (
  alertEvent: AlertEventRecord,
  preDeactivateEvent: AlertEventRecord | null
): AlertEventRecord => {
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
};

/**
 * The pre-deactivate ESQL filter restricts `episode.status` to
 * {active, recovering}, so the parsed value should always be one of
 * these two. Treat any other value as data corruption — emitting a
 * synthetic event with a different status would silently corrupt
 * episode state.
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
 * Handler for the user-initiated activate (reopen) action. Produces:
 *
 * 1. A synthetic `.rule-events` document that restores the engine
 *    state observed just before the deactivate (`status` and
 *    `episode.status` copied off the pre-deactivate doc, `@timestamp`
 *    advanced to now) so subsequent reads see the reopened state
 *    without waiting for the next rule run.
 * 2. The `.alert-actions` audit document already built by the
 *    orchestrator (`alertActionDoc` — unchanged).
 *
 * Three preconditions are evaluated up-front; failures throw Boom
 * 400 / 404 carrying `INVALID_EPISODE_STATE_TRANSITION` or
 * `ALERT_EVENT_NOT_FOUND`. `loadContext` runs the two batched ES|QL
 * lookups (one round-trip each, in parallel) so `prepare` stays
 * synchronous regardless of how many activate items the bulk batch
 * contained.
 */
export const activateHandler: ActionHandler<ActivateAlertActionBody, ActivateContextByEpisodeId> = {
  actionType: ALERT_EPISODE_ACTION_TYPE.ACTIVATE,

  loadContext: async (items, { queryService, spaceId }: HandlerServices) => {
    const episodeIds = collectEpisodeIds(items);
    if (episodeIds.length === 0) {
      return new Map();
    }

    const [lifecycleByEpisodeId, preDeactivateByEpisodeId] = await Promise.all([
      findLastEpisodeLifecycleActionTypes({ queryService, spaceId, episodeIds }),
      findPreDeactivateAlertEvents({ queryService, spaceId, episodeIds }),
    ]);

    const contexts = new Map<string, ActivateContext>();
    for (const episodeId of episodeIds) {
      contexts.set(episodeId, {
        lastLifecycleActionType: lifecycleByEpisodeId.get(episodeId) ?? null,
        preDeactivateEvent: preDeactivateByEpisodeId.get(episodeId) ?? null,
      });
    }
    return contexts;
  },

  prepare: (item, { alertActionDoc, context }) => {
    const { alertEvent } = item;
    const activateContext = context.get(alertEvent.episode_id) ?? {
      lastLifecycleActionType: null,
      preDeactivateEvent: null,
    };

    assertEpisodeIsActivatable(alertEvent);
    assertLastLifecycleActionWasDeactivate(alertEvent, activateContext.lastLifecycleActionType);

    const preDeactivateEvent = requirePreDeactivateEvent(
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
  },
};
