/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import { ALERT_EPISODE_ACTION_TYPE, type CreateAlertActionBody } from '@kbn/alerting-v2-schemas';
import {
  alertEpisodeStatus,
  alertEventStatus,
  alertEventType,
  buildRuleEventDocument,
} from '../../../resources/datastreams/alert_events';
import { ALERTING_V2_ERROR_CODES } from '../../errors/error_codes';
import type { ActionHandler } from '../handler';
import type { AlertEventRecord } from '../types';

type ActivateAlertActionBody = Extract<
  CreateAlertActionBody,
  { action_type: typeof ALERT_EPISODE_ACTION_TYPE.ACTIVATE }
>;

/**
 * Precondition: the only rejected case is an already-active episode.
 * Every other state (`pending`, `recovering`, `inactive`, or a
 * defensively-nullable status) is treated as reactivatable: user
 * intent overrides the engine's assessment.
 *
 * Failures throw `Boom.badRequest` carrying
 * `INVALID_EPISODE_STATE_TRANSITION`; the bulk path catches that
 * (400-class) and silent-skips, the single path lets it propagate to
 * the route as a 400 response.
 */
const assertEpisodeIsActivatable = (alertEvent: AlertEventRecord): void => {
  const status = alertEvent.episode_status;
  if (status !== alertEpisodeStatus.active) {
    return;
  }

  throw Boom.badRequest(
    `Cannot activate episode [${alertEvent.episode_id}]. It is already active`,
    {
      code: ALERTING_V2_ERROR_CODES.INVALID_EPISODE_STATE_TRANSITION,
      details: {
        group_hash: alertEvent.group_hash,
        episode_id: alertEvent.episode_id,
        episode_status: status,
        action_type: ALERT_EPISODE_ACTION_TYPE.ACTIVATE,
      },
    }
  );
};

/**
 * Handler for the user-initiated activate (reopen) action. Produces:
 *
 * 1. A synthetic `.rule-events` document that forces the episode to
 *    `active` (`status: breached`, `episode.status: active`,
 *    `@timestamp: now`), so the next read sees the reopened state
 *    without waiting for the next rule run. The episode keeps its
 *    original `episode_id` — activate is incident continuity, not a
 *    new firing.
 * 2. The `.alert-actions` audit document already built by the
 *    orchestrator (`alertActionDoc` — unchanged).
 *
 * `episode.status_count` is deliberately not set — that mirrors the
 * director's own strategies, which never emit `status_count` on any
 * `→ active` transition (see `BasicTransitionStrategy` and
 * `CountTimeframeStrategy`). If the alert later re-enters `pending` or
 * `recovering`, the engine restarts counting from scratch, which is
 * exactly what happens for any other engine-driven `→ active`
 * transition today.
 *
 * `status: breached` is hardcoded because that is the only event
 * status compatible with `episode.status: active` in practice; if the
 * next rule run observes `no_data` or recovery, the engine re-emits
 * accordingly and the transient inaccuracy resolves within one cycle.
 */

export const activateHandler: ActionHandler<ActivateAlertActionBody> = {
  prepare: ({ alertEvent, alertActionDoc }) => {
    assertEpisodeIsActivatable(alertEvent);

    const ruleEvent = buildRuleEventDocument({
      '@timestamp': new Date().toISOString(),
      rule: { id: alertEvent.rule_id, version: alertEvent.rule_version ?? 1 },
      group_hash: alertEvent.group_hash,
      data: alertEvent.data_json,
      status: alertEventStatus.breached,
      source: alertEvent.source,
      type: alertEventType.alert,
      space_id: alertEvent.space_id,
      episode: { id: alertEvent.episode_id, status: alertEpisodeStatus.active },
      severity: alertEvent.severity ?? undefined,
    });

    return { alertActionDoc, ruleEvent };
  },
};
