/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_ACTION_TYPE, type CreateAlertActionBody } from '@kbn/alerting-v2-schemas';
import { ALERTING_ERROR_CODES } from '../../errors/error_codes';
import {
  getAlertAlreadyAcknowledgedMessage,
  getAlertNotAcknowledgedMessage,
} from '../../errors/alert_error_messages';
import type { ActionHandler } from '../handler';
import { noOpConflict } from './no_op_conflict';

type AckAlertActionBody = Extract<
  CreateAlertActionBody,
  { action_type: typeof ALERT_EPISODE_ACTION_TYPE.ACK }
>;

type UnackAlertActionBody = Extract<
  CreateAlertActionBody,
  { action_type: typeof ALERT_EPISODE_ACTION_TYPE.UNACK }
>;

/**
 * Handler for acknowledging an alert. Acknowledgement is a two-state
 * machine, so an already-acknowledged alert is rejected rather than
 * appending a second ack document and re-emitting the domain event.
 */
export const ackHandler: ActionHandler<AckAlertActionBody> = {
  requiresActionState: true,
  prepare: ({ alertEvent, alertActionDoc, alertActionState }) => {
    if (alertActionState.acknowledged) {
      throw noOpConflict({
        code: ALERTING_ERROR_CODES.INVALID_EPISODE_STATE_TRANSITION,
        message: getAlertAlreadyAcknowledgedMessage(alertEvent.episode_id),
        alertEvent,
        actionType: ALERT_EPISODE_ACTION_TYPE.ACK,
      });
    }

    return { alertActionDoc };
  },
};

/** Mirror of {@link ackHandler}: rejects an alert that is not acknowledged. */
export const unackHandler: ActionHandler<UnackAlertActionBody> = {
  requiresActionState: true,
  prepare: ({ alertEvent, alertActionDoc, alertActionState }) => {
    if (!alertActionState.acknowledged) {
      throw noOpConflict({
        code: ALERTING_ERROR_CODES.INVALID_EPISODE_STATE_TRANSITION,
        message: getAlertNotAcknowledgedMessage(alertEvent.episode_id),
        alertEvent,
        actionType: ALERT_EPISODE_ACTION_TYPE.UNACK,
      });
    }

    return { alertActionDoc };
  },
};
