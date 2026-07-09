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

type DeactivateAlertActionBody = Extract<
  CreateAlertActionBody,
  { action_type: typeof ALERT_EPISODE_ACTION_TYPE.DEACTIVATE }
>;

/**
 * Precondition: the only rejected case is an already-inactive episode.
 * Every other state (`active`, `recovering`, `pending`, or a defensively-nullable status)
 * is treated as deactivatable.
 *
 * Failures throw `Boom.badRequest` carrying
 * `INVALID_EPISODE_STATE_TRANSITION`; the bulk path catches that
 * (400-class) and silent-skips, the single path lets it propagate to
 * the route as a 400 response.
 */
const assertEpisodeIsDeactivatable = (alertEvent: AlertEventRecord): void => {
  const status = alertEvent.episode_status;
  if (status !== alertEpisodeStatus.inactive) {
    return;
  }

  throw Boom.badRequest(
    `Cannot deactivate episode [${alertEvent.episode_id}]. It is already inactive`,
    {
      code: ALERTING_V2_ERROR_CODES.INVALID_EPISODE_STATE_TRANSITION,
      details: {
        group_hash: alertEvent.group_hash,
        episode_id: alertEvent.episode_id,
        episode_status: status,
        action_type: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
      },
    }
  );
};

/**
 * Handler for the user-initiated deactivate action. Produces:
 *
 * 1. A synthetic `.rule-events` document that records the terminal
 *    transition (`status: recovered`, `episode.status: inactive`), so
 *    the next read sees the deactivation immediately without waiting
 *    for the next rule run and without joining to `.alert-actions`.
 * 2. The `.alert-actions` audit document already built by the
 *    orchestrator (`alertActionDoc` — unchanged).
 */
export const deactivateHandler: ActionHandler<DeactivateAlertActionBody> = {
  prepare: ({ alertEvent, alertActionDoc }) => {
    assertEpisodeIsDeactivatable(alertEvent);

    const ruleEvent = buildRuleEventDocument({
      '@timestamp': new Date().toISOString(),
      rule: { id: alertEvent.rule_id, version: alertEvent.rule_version ?? 1 },
      group_hash: alertEvent.group_hash,
      data: alertEvent.data_json,
      status: alertEventStatus.recovered,
      source: alertEvent.source,
      type: alertEventType.alert,
      space_id: alertEvent.space_id,
      episode: { id: alertEvent.episode_id, status: alertEpisodeStatus.inactive },
      severity: alertEvent.severity ?? undefined,
    });

    return { alertActionDoc, ruleEvent };
  },
};
