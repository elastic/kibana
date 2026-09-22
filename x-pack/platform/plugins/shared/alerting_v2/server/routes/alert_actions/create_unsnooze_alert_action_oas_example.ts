/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateUnsnoozeAlertActionBody } from '@kbn/alerting-v2-schemas';
import type { AlertingOasOperationObject } from '../oas_types';
import { buildOasOperation } from '../oas_utils';
import {
  ALERT_EVENT_NOT_FOUND_RESPONSE,
  INVALID_ALERT_ACTION_PARAMS_RESPONSE,
} from './alert_oas_shared_examples';

export const CREATE_UNSNOOZE_ALERT_ACTION_REQUEST: CreateUnsnoozeAlertActionBody = {};

export const createUnsnoozeAlertActionOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    requestBody: {
      name: 'createUnsnoozeAlertActionRequest',
      summary: 'Clear the current snooze',
      value: CREATE_UNSNOOZE_ALERT_ACTION_REQUEST,
    },
    responses: {
      400: INVALID_ALERT_ACTION_PARAMS_RESPONSE,
      404: ALERT_EVENT_NOT_FOUND_RESPONSE,
    },
  });
