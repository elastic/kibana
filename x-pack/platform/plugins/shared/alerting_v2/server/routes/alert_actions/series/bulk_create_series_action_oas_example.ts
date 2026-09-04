/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkCreateSeriesAlertActionBody, BulkResponse } from '@kbn/alerting-v2-schemas';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { ALERTING_ERROR_CODES } from '../../../lib/errors/error_codes';
import { buildOasOperation, invalidResponseExample } from '../../oas_utils';
import type { AlertingOasOperationObject } from '../../oas_types';
import { SAMPLE_GROUP_HASH } from '../alert_oas_shared_examples';

export const BULK_CREATE_SERIES_ACTION_REQUEST: BulkCreateSeriesAlertActionBody = [
  {
    group_hash: SAMPLE_GROUP_HASH,
    action_type: ALERT_EPISODE_ACTION_TYPE.TAG,
    tags: ['production'],
  },
  {
    group_hash: 'group-hash-2',
    action_type: ALERT_EPISODE_ACTION_TYPE.SNOOZE,
    expiry: '2026-01-16T12:00:00.000Z',
  },
  {
    group_hash: 'group-hash-3',
    action_type: ALERT_EPISODE_ACTION_TYPE.UNSNOOZE,
  },
];

export const BULK_CREATE_SERIES_ACTION_RESPONSE: BulkResponse = {
  affected_count: 2,
  errors: [
    {
      id: 'group-hash-3',
      error: {
        code: ALERTING_ERROR_CODES.ALERT_GROUP_NOT_FOUND,
        message: 'Alert series with group_hash [group-hash-3] not found',
      },
    },
  ],
};

const INVALID_BULK_CREATE_SERIES_ACTION_RESPONSE = invalidResponseExample({
  summary: 'Bulk body is an empty array',
  message: 'At least one action must be provided',
  details: { errors: { '': ['At least one action must be provided'] } },
});

export const bulkCreateSeriesActionOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    requestBody: {
      name: 'bulkCreateSeriesActionRequest',
      summary: 'Tag, snooze, and unsnooze three alert episode series',
      value: BULK_CREATE_SERIES_ACTION_REQUEST,
    },
    responses: {
      200: {
        name: 'bulkCreateSeriesActionResponse',
        summary: 'Two actions processed, one series not found.',
        value: BULK_CREATE_SERIES_ACTION_RESPONSE,
      },
      400: INVALID_BULK_CREATE_SERIES_ACTION_RESPONSE,
    },
  });
