/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_ACTION_TYPE, type CreateAlertActionBody } from '@kbn/alerting-v2-schemas';
import { ALERTING_ERROR_CODES } from '../../errors/error_codes';
import { getSeriesNotSnoozedMessage } from '../../errors/alert_error_messages';
import type { ActionHandler } from '../handler';
import { noOpConflict } from './no_op_conflict';

type UnsnoozeAlertActionBody = Extract<
  CreateAlertActionBody,
  { action_type: typeof ALERT_EPISODE_ACTION_TYPE.UNSNOOZE }
>;

/**
 * Handler for unsnoozing a series. A series with no snooze in effect (never
 * snoozed, already unsnoozed, or whose snooze has expired) is rejected rather
 * than appending an unsnooze document and re-emitting the domain event.
 */
export const unsnoozeHandler: ActionHandler<UnsnoozeAlertActionBody> = {
  requiresSeriesActionState: true,
  prepare: ({ alertEvent, alertActionDoc, seriesActionState }) => {
    if (!seriesActionState.snoozed) {
      throw noOpConflict({
        code: ALERTING_ERROR_CODES.INVALID_EPISODE_STATE_TRANSITION,
        message: getSeriesNotSnoozedMessage(alertEvent.group_hash),
        alertEvent,
        actionType: ALERT_EPISODE_ACTION_TYPE.UNSNOOZE,
      });
    }

    return { alertActionDoc };
  },
};
