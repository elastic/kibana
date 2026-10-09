/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateTagAlertActionBody } from '@kbn/alerting-v2-schemas';
import type { AlertingOasOperationObject } from '../oas_types';
import { buildOasOperation } from '../oas_utils';
import {
  ALERT_EVENT_NOT_FOUND_RESPONSE,
  INVALID_ALERT_ACTION_PARAMS_RESPONSE,
} from './alert_oas_shared_examples';

export const CREATE_TAG_ALERT_ACTION_REQUEST: CreateTagAlertActionBody = {
  tags: ['production', 'investigating'],
};

export const createTagAlertActionOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    requestBody: {
      name: 'createTagAlertActionRequest',
      summary: 'Tag the alert with production and investigating',
      value: CREATE_TAG_ALERT_ACTION_REQUEST,
    },
    responses: {
      400: INVALID_ALERT_ACTION_PARAMS_RESPONSE,
      404: ALERT_EVENT_NOT_FOUND_RESPONSE,
    },
  });
