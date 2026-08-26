/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateDeactivateAlertActionBody } from '@kbn/alerting-v2-schemas';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { ALERTING_ERROR_CODES } from '../../lib/errors/error_codes';
import { getCannotDeactivateEpisodeMessage } from '../../lib/errors/alert_error_messages';
import { buildOasOperation, invalidResponseExample } from '../oas_utils';
import type { AlertingOasOperationObject } from '../oas_types';
import {
  ALERT_EVENT_NOT_FOUND_RESPONSE,
  SAMPLE_EPISODE_ID,
  SAMPLE_GROUP_HASH,
} from './alert_oas_shared_examples';

export const CREATE_DEACTIVATE_ALERT_ACTION_REQUEST: CreateDeactivateAlertActionBody = {
  reason: 'False positive confirmed by on-call.',
};

const INVALID_DEACTIVATE_STATE_TRANSITION_RESPONSE = invalidResponseExample({
  summary: 'Cannot deactivate an already-inactive episode',
  code: ALERTING_ERROR_CODES.INVALID_EPISODE_STATE_TRANSITION,
  message: getCannotDeactivateEpisodeMessage(SAMPLE_EPISODE_ID),
  details: {
    group_hash: SAMPLE_GROUP_HASH,
    episode_id: SAMPLE_EPISODE_ID,
    episode_status: 'inactive',
    action_type: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
  },
});

export const createDeactivateAlertActionOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    requestBody: {
      name: 'createDeactivateAlertActionRequest',
      summary: 'Deactivate as a false positive',
      value: CREATE_DEACTIVATE_ALERT_ACTION_REQUEST,
    },
    responses: {
      400: INVALID_DEACTIVATE_STATE_TRANSITION_RESPONSE,
      404: ALERT_EVENT_NOT_FOUND_RESPONSE,
    },
  });
