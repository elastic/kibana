/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkCreateEpisodeAlertActionBody, BulkResponse } from '@kbn/alerting-v2-schemas';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { ALERTING_ERROR_CODES } from '../../../lib/errors/error_codes';
import { getAlertEpisodeNotFoundMessage } from '../../../lib/errors/alert_error_messages';
import { buildOasOperation, invalidResponseExample } from '../../oas_utils';
import type { AlertingOasOperationObject } from '../../oas_types';
import { SAMPLE_EPISODE_ID } from '../alert_oas_shared_examples';

export const BULK_CREATE_EPISODE_ACTION_REQUEST: BulkCreateEpisodeAlertActionBody = [
  {
    episode_id: SAMPLE_EPISODE_ID,
    action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
  },
  {
    episode_id: 'episode-2',
    action_type: ALERT_EPISODE_ACTION_TYPE.ASSIGN,
    assignee_uid: 'u_abc123',
  },
];

export const BULK_CREATE_EPISODE_ACTION_RESPONSE: BulkResponse = {
  affected_count: 1,
  errors: [
    {
      id: 'episode-2',
      error: {
        code: ALERTING_ERROR_CODES.ALERT_EPISODE_NOT_FOUND,
        message: getAlertEpisodeNotFoundMessage('episode-2'),
        details: { episode_id: 'episode-2' },
      },
    },
  ],
};

const INVALID_BULK_CREATE_EPISODE_ACTION_RESPONSE = invalidResponseExample({
  summary: 'Bulk body is an empty array',
  message: 'At least one action must be provided',
  details: { errors: { '': ['At least one action must be provided'] } },
});

export const bulkCreateEpisodeActionOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    requestBody: {
      name: 'bulkCreateEpisodeActionRequest',
      summary: 'Acknowledge one episode and assign another',
      value: BULK_CREATE_EPISODE_ACTION_REQUEST,
    },
    responses: {
      200: {
        name: 'bulkCreateEpisodeActionResponse',
        summary: 'One action created, one episode not found',
        value: BULK_CREATE_EPISODE_ACTION_RESPONSE,
      },
      400: INVALID_BULK_CREATE_EPISODE_ACTION_RESPONSE,
    },
  });
