/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_ACTION_TYPE, type CreateAlertActionBody } from '@kbn/alerting-v2-schemas';
import { ALERTING_ERROR_CODES } from '../../errors/error_codes';
import { getAssigneeUnchangedMessage } from '../../errors/alert_error_messages';
import type { ActionHandler } from '../handler';
import { noOpConflict } from './no_op_conflict';

type AssignAlertActionBody = Extract<
  CreateAlertActionBody,
  { action_type: typeof ALERT_EPISODE_ACTION_TYPE.ASSIGN }
>;

/**
 * Handler for assigning an alert. The requested assignee already being the
 * current one is rejected — including `null` against an unassigned alert,
 * since clearing an empty assignee changes nothing either.
 */
export const assignHandler: ActionHandler<AssignAlertActionBody> = {
  requiresActionState: true,
  prepare: ({ action, alertEvent, alertActionDoc, alertActionState }) => {
    if (action.assignee_uid === alertActionState.assignee_uid) {
      throw noOpConflict({
        code: ALERTING_ERROR_CODES.ALERT_ACTION_NO_OP,
        message: getAssigneeUnchangedMessage(alertEvent.episode_id, action.assignee_uid),
        alertEvent,
        actionType: ALERT_EPISODE_ACTION_TYPE.ASSIGN,
      });
    }

    return { alertActionDoc };
  },
};
