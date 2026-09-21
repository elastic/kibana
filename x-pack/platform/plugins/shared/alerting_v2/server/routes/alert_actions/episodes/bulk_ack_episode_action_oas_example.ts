/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BulkResponse, BulkAckEpisodeActionBody } from '@kbn/alerting-v2-schemas';
import { ALERTING_ERROR_CODES } from '../../../lib/errors/error_codes';
import { getAlertEpisodeNotFoundMessage } from '../../../lib/errors/alert_error_messages';
import { buildOasOperation, invalidResponseExample } from '../../oas_utils';
import type { AlertingOasOperationObject } from '../../oas_types';

export const BULK_ACK_EPISODE_ACTION_REQUEST: BulkAckEpisodeActionBody = {
  items: [{ alert_id: 'alert-1' }, { alert_id: 'alert-2' }],
};

export const BULK_ACK_EPISODE_ACTION_RESPONSE: BulkResponse = {
  affected_count: 1,
  errors: [
    {
      id: 'alert-2',
      error: {
        code: ALERTING_ERROR_CODES.ALERT_NOT_FOUND,
        message: getAlertEpisodeNotFoundMessage('alert-2'),
      },
    },
  ],
};

const INVALID_BULK_ACK_EPISODE_ACTION_RESPONSE = invalidResponseExample({
  summary: 'Items list is empty',
  message: 'items: At least one action must be provided',
  details: { errors: { items: ['At least one action must be provided'] } },
});

export const bulkAckEpisodeActionOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    requestBody: {
      name: 'bulkAckEpisodeActionRequest',
      summary: 'Acknowledge two alert episodes',
      value: BULK_ACK_EPISODE_ACTION_REQUEST,
    },
    responses: {
      200: {
        name: 'bulkAckEpisodeActionResponse',
        summary: 'One action created, one episode not found',
        value: BULK_ACK_EPISODE_ACTION_RESPONSE,
      },
      400: INVALID_BULK_ACK_EPISODE_ACTION_RESPONSE,
    },
  });
