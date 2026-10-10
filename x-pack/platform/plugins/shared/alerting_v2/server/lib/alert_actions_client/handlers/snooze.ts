/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_ACTION_TYPE, type CreateAlertActionBody } from '@kbn/alerting-v2-schemas';
import { ALERTING_ERROR_CODES } from '../../errors/error_codes';
import { getSeriesAlreadySnoozedMessage } from '../../errors/alert_error_messages';
import type { ActionHandler } from '../handler';
import { noOpConflict } from './no_op_conflict';

type SnoozeAlertActionBody = Extract<
  CreateAlertActionBody,
  { action_type: typeof ALERT_EPISODE_ACTION_TYPE.SNOOZE }
>;

/**
 * Compares expiries by instant rather than by string, so the same moment
 * written with or without milliseconds still matches. `null` is an
 * indefinite snooze.
 */
const isSameExpiry = (requested: string | null, current: string | null): boolean =>
  requested == null || current == null
    ? requested == null && current == null
    : new Date(requested).getTime() === new Date(current).getTime();

/**
 * Handler for snoozing a series. Snoozing with a different expiry extends or
 * shortens the silence, so only a request matching the snooze already in
 * effect is rejected.
 */
export const snoozeHandler: ActionHandler<SnoozeAlertActionBody> = {
  requiresSeriesActionState: true,
  prepare: ({ action, alertEvent, alertActionDoc, seriesActionState }) => {
    const requestedUntil = action.snoozed_until ?? null;

    if (
      seriesActionState.snoozed &&
      isSameExpiry(requestedUntil, seriesActionState.snoozed_until)
    ) {
      throw noOpConflict({
        code: ALERTING_ERROR_CODES.ALERT_ACTION_NO_OP,
        message: getSeriesAlreadySnoozedMessage(alertEvent.group_hash, requestedUntil),
        alertEvent,
        actionType: ALERT_EPISODE_ACTION_TYPE.SNOOZE,
      });
    }

    return { alertActionDoc };
  },
};
