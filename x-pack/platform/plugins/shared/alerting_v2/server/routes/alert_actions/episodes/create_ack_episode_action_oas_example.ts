/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateAckEpisodeActionBody } from '@kbn/alerting-v2-schemas';
import type { AlertingOasOperationObject } from '../../oas_types';
import { buildOasOperation } from '../../oas_utils';
import {
  ALERT_ALREADY_ACKNOWLEDGED_RESPONSE,
  ALERT_EPISODE_NOT_FOUND_RESPONSE,
  INVALID_EPISODE_ACTION_PARAMS_RESPONSE,
} from '../alert_oas_shared_examples';

export const CREATE_ACK_EPISODE_ACTION_REQUEST: CreateAckEpisodeActionBody = {};

export const createAckEpisodeActionOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    requestBody: {
      name: 'createAckAlertActionRequest',
      summary: 'Acknowledge the alert',
      value: CREATE_ACK_EPISODE_ACTION_REQUEST,
    },
    responses: {
      400: INVALID_EPISODE_ACTION_PARAMS_RESPONSE,
      404: ALERT_EPISODE_NOT_FOUND_RESPONSE,
      409: ALERT_ALREADY_ACKNOWLEDGED_RESPONSE,
    },
  });
