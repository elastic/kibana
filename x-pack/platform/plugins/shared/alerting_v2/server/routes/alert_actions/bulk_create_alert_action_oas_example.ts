/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkCreateAlertActionBody, BulkResponse } from '@kbn/alerting-v2-schemas';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { buildOasOperation, invalidResponseExample } from '../oas_utils';
import type { AlertingOasOperationObject } from '../oas_types';
import { SAMPLE_EPISODE_ID, SAMPLE_GROUP_HASH } from './alert_oas_shared_examples';

export const BULK_CREATE_ALERT_ACTION_REQUEST: BulkCreateAlertActionBody = [
  {
    group_hash: SAMPLE_GROUP_HASH,
    action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
    episode_id: SAMPLE_EPISODE_ID,
  },
  {
    group_hash: 'group-hash-2',
    action_type: ALERT_EPISODE_ACTION_TYPE.TAG,
    tags: ['production'],
  },
];

export const BULK_CREATE_ALERT_ACTION_RESPONSE: BulkResponse = {
  affected_count: 2,
  errors: [],
};

const INVALID_BULK_CREATE_ALERT_ACTION_RESPONSE = invalidResponseExample({
  summary: 'Bulk body is an empty array',
  message: 'At least one action must be provided',
  details: { errors: { '': ['At least one action must be provided'] } },
});

export const bulkCreateAlertActionOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    requestBody: {
      name: 'bulkCreateAlertActionRequest',
      summary: 'Acknowledge one episode and tag another alert group',
      value: BULK_CREATE_ALERT_ACTION_REQUEST,
    },
    responses: {
      200: {
        name: 'bulkCreateAlertActionResponse',
        summary: 'Both actions processed successfully',
        value: BULK_CREATE_ALERT_ACTION_RESPONSE,
      },
      400: INVALID_BULK_CREATE_ALERT_ACTION_RESPONSE,
    },
  });
