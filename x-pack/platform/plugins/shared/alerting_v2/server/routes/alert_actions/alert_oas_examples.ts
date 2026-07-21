/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RouteConfigOptions, RouteMethod } from '@kbn/core-http-server';
import type {
  BulkCreateAlertActionBody,
  BulkCreateAlertActionResponse,
  CreateAckAlertActionBody,
  CreateActivateAlertActionBody,
  CreateAssignAlertActionBody,
  CreateDeactivateAlertActionBody,
  CreateSnoozeAlertActionBody,
  CreateTagAlertActionBody,
  CreateUnackAlertActionBody,
  CreateUnsnoozeAlertActionBody,
  ErrorResponse,
} from '@kbn/alerting-v2-schemas';
import { ALERTING_V2_ERROR_CODES } from '../../lib/errors/error_codes';
import {
  getAlertEventNotFoundMessage,
  getCannotActivateEpisodeMessage,
} from '../../lib/errors/alert_error_messages';
import { jsonExample } from '../json_oas_example';

type OASOperationObject = Exclude<
  Awaited<ReturnType<NonNullable<RouteConfigOptions<RouteMethod>['oasOperationObject']>>>,
  string
>;

type RouteErrorStatus = 400 | 404;

const SAMPLE_GROUP_HASH = 'group-hash-1';
const SAMPLE_EPISODE_ID = 'episode-1';

const ACK_REQUEST: CreateAckAlertActionBody = {
  episode_id: SAMPLE_EPISODE_ID,
};

const UNACK_REQUEST: CreateUnackAlertActionBody = {
  episode_id: SAMPLE_EPISODE_ID,
};

const ASSIGN_REQUEST: CreateAssignAlertActionBody = {
  episode_id: SAMPLE_EPISODE_ID,
  assignee_uid: 'u_abc123',
};

const TAG_REQUEST: CreateTagAlertActionBody = {
  tags: ['production', 'investigating'],
};

const SNOOZE_REQUEST: CreateSnoozeAlertActionBody = {
  expiry: '2026-01-16T12:00:00.000Z',
};

const UNSNOOZE_REQUEST: CreateUnsnoozeAlertActionBody = {};

const ACTIVATE_REQUEST: CreateActivateAlertActionBody = {
  reason: 'Issue reappeared after silence window.',
};

const DEACTIVATE_REQUEST: CreateDeactivateAlertActionBody = {
  reason: 'False positive confirmed by on-call.',
};

const BULK_REQUEST: BulkCreateAlertActionBody = [
  {
    group_hash: SAMPLE_GROUP_HASH,
    action_type: 'ack',
    episode_id: SAMPLE_EPISODE_ID,
  },
  {
    group_hash: 'group-hash-2',
    action_type: 'tag',
    tags: ['production'],
  },
];

const BULK_RESPONSE: BulkCreateAlertActionResponse = {
  processed: 2,
  total: 2,
};

const INVALID_ALERT_ACTION_ERROR: ErrorResponse = {
  code: ALERTING_V2_ERROR_CODES.INVALID_EPISODE_STATE_TRANSITION,
  error: 'Bad Request',
  message: getCannotActivateEpisodeMessage(SAMPLE_EPISODE_ID),
  details: {
    group_hash: SAMPLE_GROUP_HASH,
    episode_id: SAMPLE_EPISODE_ID,
    episode_status: 'active',
    action_type: 'activate',
  },
};

const ALERT_EVENT_NOT_FOUND_ERROR: ErrorResponse = {
  code: ALERTING_V2_ERROR_CODES.ALERT_EVENT_NOT_FOUND,
  error: 'Not Found',
  message: getAlertEventNotFoundMessage(SAMPLE_GROUP_HASH, SAMPLE_EPISODE_ID),
  details: {
    group_hash: SAMPLE_GROUP_HASH,
    episode_id: SAMPLE_EPISODE_ID,
  },
};

const ERROR_EXAMPLES: Record<RouteErrorStatus, ReturnType<typeof jsonExample<ErrorResponse>>> = {
  400: jsonExample(
    'invalidAlertAction',
    'Invalid alert action request',
    INVALID_ALERT_ACTION_ERROR
  ),
  404: jsonExample('alertEventNotFound', 'Alert event does not exist', ALERT_EVENT_NOT_FOUND_ERROR),
};

const buildAlertOas = ({
  requestBody,
  responses = {},
  errors = [],
}: {
  requestBody?: { name: string; summary: string; value: unknown };
  responses?: Record<number, { name: string; summary: string; value: unknown }>;
  errors?: RouteErrorStatus[];
}): OASOperationObject => {
  const operation: OASOperationObject = {};

  if (requestBody) {
    operation.requestBody = jsonExample(requestBody.name, requestBody.summary, requestBody.value);
  }

  const responseEntries: Record<string, ReturnType<typeof jsonExample>> = {};
  for (const [status, example] of Object.entries(responses)) {
    responseEntries[status] = jsonExample(example.name, example.summary, example.value);
  }
  for (const status of errors) {
    responseEntries[String(status)] = ERROR_EXAMPLES[status];
  }
  if (Object.keys(responseEntries).length > 0) {
    operation.responses = responseEntries;
  }

  return operation;
};

export const createAckAlertActionOasExamples = (): OASOperationObject =>
  buildAlertOas({
    requestBody: {
      name: 'createAckAlertActionRequest',
      summary: 'Acknowledge an alert episode',
      value: ACK_REQUEST,
    },
    errors: [400, 404],
  });

export const createUnackAlertActionOasExamples = (): OASOperationObject =>
  buildAlertOas({
    requestBody: {
      name: 'createUnackAlertActionRequest',
      summary: 'Remove acknowledgement from an alert episode',
      value: UNACK_REQUEST,
    },
    errors: [400, 404],
  });

export const createAssignAlertActionOasExamples = (): OASOperationObject =>
  buildAlertOas({
    requestBody: {
      name: 'createAssignAlertActionRequest',
      summary: 'Assign an alert episode',
      value: ASSIGN_REQUEST,
    },
    errors: [400, 404],
  });

export const createTagAlertActionOasExamples = (): OASOperationObject =>
  buildAlertOas({
    requestBody: {
      name: 'createTagAlertActionRequest',
      summary: 'Add tags to an alert',
      value: TAG_REQUEST,
    },
    errors: [400, 404],
  });

export const createSnoozeAlertActionOasExamples = (): OASOperationObject =>
  buildAlertOas({
    requestBody: {
      name: 'createSnoozeAlertActionRequest',
      summary: 'Snooze an alert',
      value: SNOOZE_REQUEST,
    },
    errors: [400, 404],
  });

export const createUnsnoozeAlertActionOasExamples = (): OASOperationObject =>
  buildAlertOas({
    requestBody: {
      name: 'createUnsnoozeAlertActionRequest',
      summary: 'Remove snooze from an alert',
      value: UNSNOOZE_REQUEST,
    },
    errors: [400, 404],
  });

export const createActivateAlertActionOasExamples = (): OASOperationObject =>
  buildAlertOas({
    requestBody: {
      name: 'createActivateAlertActionRequest',
      summary: 'Activate an alert episode',
      value: ACTIVATE_REQUEST,
    },
    errors: [400, 404],
  });

export const createDeactivateAlertActionOasExamples = (): OASOperationObject =>
  buildAlertOas({
    requestBody: {
      name: 'createDeactivateAlertActionRequest',
      summary: 'Deactivate an alert episode',
      value: DEACTIVATE_REQUEST,
    },
    errors: [400, 404],
  });

export const bulkCreateAlertActionOasExamples = (): OASOperationObject =>
  buildAlertOas({
    requestBody: {
      name: 'bulkCreateAlertActionRequest',
      summary: 'Create alert actions in bulk',
      value: BULK_REQUEST,
    },
    responses: {
      200: {
        name: 'bulkCreateAlertActionResponse',
        summary: 'Bulk create result',
        value: BULK_RESPONSE,
      },
    },
    errors: [400],
  });
