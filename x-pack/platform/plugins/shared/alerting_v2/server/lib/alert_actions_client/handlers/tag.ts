/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_ACTION_TYPE, type CreateAlertActionBody } from '@kbn/alerting-v2-schemas';
import { ALERTING_ERROR_CODES } from '../../errors/error_codes';
import { getTagsUnchangedMessage } from '../../errors/alert_error_messages';
import type { ActionHandler } from '../handler';
import { noOpConflict } from './no_op_conflict';

type TagAlertActionBody = Extract<
  CreateAlertActionBody,
  { action_type: typeof ALERT_EPISODE_ACTION_TYPE.TAG }
>;

/**
 * `_tag` replaces the whole set, so the request and the current value are
 * compared as sets: neither order nor a repeated tag changes what the alert
 * would end up carrying.
 */
const isSameTagSet = (requested: readonly string[], current: readonly string[]): boolean => {
  const requestedSet = new Set(requested);
  const currentSet = new Set(current);

  return (
    requestedSet.size === currentSet.size && [...requestedSet].every((tag) => currentSet.has(tag))
  );
};

/**
 * Handler for replacing an alert's tags. A request that would leave the same
 * set in place is rejected rather than recorded.
 */
export const tagHandler: ActionHandler<TagAlertActionBody> = {
  requiresActionState: true,
  prepare: ({ action, alertEvent, alertActionDoc, alertActionState }) => {
    if (isSameTagSet(action.tags, alertActionState.tags)) {
      throw noOpConflict({
        code: ALERTING_ERROR_CODES.ALERT_ACTION_NO_OP,
        message: getTagsUnchangedMessage(alertEvent.episode_id),
        alertEvent,
        actionType: ALERT_EPISODE_ACTION_TYPE.TAG,
      });
    }

    return { alertActionDoc };
  },
};
