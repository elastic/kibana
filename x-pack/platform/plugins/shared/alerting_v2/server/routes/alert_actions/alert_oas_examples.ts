/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
import {
  ALERT_EPISODE_ACTION_TYPE,
  bulkCreateAlertActionBodySchema,
  createAlertActionParamsSchema,
} from '@kbn/alerting-v2-schemas';
import { stringifyZodError } from '@kbn/zod-helpers/v4';
import { treeifyError } from '@kbn/zod/v4';
import { ALERTING_V2_ERROR_CODES } from '../../lib/errors/error_codes';
import {
  getAlertEventNotFoundMessage,
  getCannotActivateEpisodeMessage,
  getCannotDeactivateEpisodeMessage,
} from '../../lib/errors/alert_error_messages';
import { jsonExample, type AlertingV2OasOperationObject } from '../json_oas_example';
import {
  ALERT_EVENT_NOT_FOUND_DESCRIPTION,
  INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
} from '../route_response_descriptions';

type RouteErrorStatus = 400 | 404;

/** Shared with each typed alert-action route's `routeOptions.summary`. */
export const getCreateAlertActionSummary = (pathSuffix: string): string =>
  `Create an alert ${pathSuffix} action`;

export const CREATE_ACK_ALERT_ACTION_SUMMARY = getCreateAlertActionSummary('_ack');
export const CREATE_UNACK_ALERT_ACTION_SUMMARY = getCreateAlertActionSummary('_unack');
export const CREATE_ASSIGN_ALERT_ACTION_SUMMARY = getCreateAlertActionSummary('_assign');
export const CREATE_TAG_ALERT_ACTION_SUMMARY = getCreateAlertActionSummary('_tag');
export const CREATE_SNOOZE_ALERT_ACTION_SUMMARY = getCreateAlertActionSummary('_snooze');
export const CREATE_UNSNOOZE_ALERT_ACTION_SUMMARY = getCreateAlertActionSummary('_unsnooze');
export const CREATE_ACTIVATE_ALERT_ACTION_SUMMARY = getCreateAlertActionSummary('_activate');
export const CREATE_DEACTIVATE_ALERT_ACTION_SUMMARY = getCreateAlertActionSummary('_deactivate');
export const BULK_CREATE_ALERT_ACTION_SUMMARY = 'Bulk create alert actions';

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
    action_type: ALERT_EPISODE_ACTION_TYPE.ACK,
    episode_id: SAMPLE_EPISODE_ID,
  },
  {
    group_hash: 'group-hash-2',
    action_type: ALERT_EPISODE_ACTION_TYPE.TAG,
    tags: ['production'],
  },
];

const BULK_RESPONSE: BulkCreateAlertActionResponse = {
  processed: 2,
  total: 2,
};

const invalidParamsParse = createAlertActionParamsSchema.safeParse({});

if (invalidParamsParse.success) {
  throw new Error('expected createAlertActionParamsSchema parse to fail for OAS example');
}

const INVALID_SCHEMA_OR_PARAMETERS_ERROR: ErrorResponse = {
  code: 'BAD_REQUEST',
  error: 'Bad Request',
  message: stringifyZodError(invalidParamsParse.error),
  details: { errors: treeifyError(invalidParamsParse.error) },
};

const invalidBulkBodyParse = bulkCreateAlertActionBodySchema.safeParse([]);

if (invalidBulkBodyParse.success) {
  throw new Error('expected bulkCreateAlertActionBodySchema parse to fail for OAS example');
}

const INVALID_BULK_REQUEST_BODY_ERROR: ErrorResponse = {
  code: 'BAD_REQUEST',
  error: 'Bad Request',
  message: stringifyZodError(invalidBulkBodyParse.error),
  details: { errors: treeifyError(invalidBulkBodyParse.error) },
};

const INVALID_ACTIVATE_STATE_TRANSITION_ERROR: ErrorResponse = {
  code: ALERTING_V2_ERROR_CODES.INVALID_EPISODE_STATE_TRANSITION,
  error: 'Bad Request',
  message: getCannotActivateEpisodeMessage(SAMPLE_EPISODE_ID),
  details: {
    group_hash: SAMPLE_GROUP_HASH,
    episode_id: SAMPLE_EPISODE_ID,
    episode_status: 'active',
    action_type: ALERT_EPISODE_ACTION_TYPE.ACTIVATE,
  },
};

const INVALID_DEACTIVATE_STATE_TRANSITION_ERROR: ErrorResponse = {
  code: ALERTING_V2_ERROR_CODES.INVALID_EPISODE_STATE_TRANSITION,
  error: 'Bad Request',
  message: getCannotDeactivateEpisodeMessage(SAMPLE_EPISODE_ID),
  details: {
    group_hash: SAMPLE_GROUP_HASH,
    episode_id: SAMPLE_EPISODE_ID,
    episode_status: 'inactive',
    action_type: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
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
    'invalidAlertActionRequest',
    INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
    INVALID_SCHEMA_OR_PARAMETERS_ERROR
  ),
  404: jsonExample(
    'alertEventNotFound',
    ALERT_EVENT_NOT_FOUND_DESCRIPTION,
    ALERT_EVENT_NOT_FOUND_ERROR
  ),
};

const INVALID_ACTIVATE_STATE_TRANSITION_EXAMPLE = {
  name: 'invalidEpisodeStateTransition',
  summary: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
  value: INVALID_ACTIVATE_STATE_TRANSITION_ERROR,
};

const INVALID_DEACTIVATE_STATE_TRANSITION_EXAMPLE = {
  name: 'invalidEpisodeStateTransition',
  summary: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
  value: INVALID_DEACTIVATE_STATE_TRANSITION_ERROR,
};

const INVALID_BULK_REQUEST_BODY_EXAMPLE = {
  name: 'invalidBulkCreateAlertActionRequest',
  summary: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
  value: INVALID_BULK_REQUEST_BODY_ERROR,
};

const buildAlertOas = ({
  requestBody,
  responses = {},
  errors = [],
}: {
  requestBody?: { name: string; summary: string; value: unknown };
  responses?: Record<number, { name: string; summary: string; value: unknown }>;
  errors?: RouteErrorStatus[];
}): AlertingV2OasOperationObject => {
  const operation: AlertingV2OasOperationObject = {};

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

export const createAckAlertActionOasExamples = (): AlertingV2OasOperationObject =>
  buildAlertOas({
    requestBody: {
      name: 'createAckAlertActionRequest',
      summary: CREATE_ACK_ALERT_ACTION_SUMMARY,
      value: ACK_REQUEST,
    },
    errors: [400, 404],
  });

export const createUnackAlertActionOasExamples = (): AlertingV2OasOperationObject =>
  buildAlertOas({
    requestBody: {
      name: 'createUnackAlertActionRequest',
      summary: CREATE_UNACK_ALERT_ACTION_SUMMARY,
      value: UNACK_REQUEST,
    },
    errors: [400, 404],
  });

export const createAssignAlertActionOasExamples = (): AlertingV2OasOperationObject =>
  buildAlertOas({
    requestBody: {
      name: 'createAssignAlertActionRequest',
      summary: CREATE_ASSIGN_ALERT_ACTION_SUMMARY,
      value: ASSIGN_REQUEST,
    },
    errors: [400, 404],
  });

export const createTagAlertActionOasExamples = (): AlertingV2OasOperationObject =>
  buildAlertOas({
    requestBody: {
      name: 'createTagAlertActionRequest',
      summary: CREATE_TAG_ALERT_ACTION_SUMMARY,
      value: TAG_REQUEST,
    },
    errors: [400, 404],
  });

export const createSnoozeAlertActionOasExamples = (): AlertingV2OasOperationObject =>
  buildAlertOas({
    requestBody: {
      name: 'createSnoozeAlertActionRequest',
      summary: CREATE_SNOOZE_ALERT_ACTION_SUMMARY,
      value: SNOOZE_REQUEST,
    },
    errors: [400, 404],
  });

export const createUnsnoozeAlertActionOasExamples = (): AlertingV2OasOperationObject =>
  buildAlertOas({
    requestBody: {
      name: 'createUnsnoozeAlertActionRequest',
      summary: CREATE_UNSNOOZE_ALERT_ACTION_SUMMARY,
      value: UNSNOOZE_REQUEST,
    },
    errors: [400, 404],
  });

export const createActivateAlertActionOasExamples = (): AlertingV2OasOperationObject =>
  buildAlertOas({
    requestBody: {
      name: 'createActivateAlertActionRequest',
      summary: CREATE_ACTIVATE_ALERT_ACTION_SUMMARY,
      value: ACTIVATE_REQUEST,
    },
    responses: {
      400: INVALID_ACTIVATE_STATE_TRANSITION_EXAMPLE,
    },
    errors: [404],
  });

export const createDeactivateAlertActionOasExamples = (): AlertingV2OasOperationObject =>
  buildAlertOas({
    requestBody: {
      name: 'createDeactivateAlertActionRequest',
      summary: CREATE_DEACTIVATE_ALERT_ACTION_SUMMARY,
      value: DEACTIVATE_REQUEST,
    },
    responses: {
      400: INVALID_DEACTIVATE_STATE_TRANSITION_EXAMPLE,
    },
    errors: [404],
  });

export const bulkCreateAlertActionOasExamples = (): AlertingV2OasOperationObject =>
  buildAlertOas({
    requestBody: {
      name: 'bulkCreateAlertActionRequest',
      summary: BULK_CREATE_ALERT_ACTION_SUMMARY,
      value: BULK_REQUEST,
    },
    responses: {
      200: {
        name: 'bulkCreateAlertActionResponse',
        summary: BULK_CREATE_ALERT_ACTION_SUMMARY,
        value: BULK_RESPONSE,
      },
      400: INVALID_BULK_REQUEST_BODY_EXAMPLE,
    },
  });
