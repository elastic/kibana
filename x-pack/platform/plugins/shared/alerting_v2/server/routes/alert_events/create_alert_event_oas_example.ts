/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CreateAlertEventData, CreateAlertEventResponse } from '@kbn/alerting-v2-schemas';
import type { AlertingOasOperationObject } from '../oas_types';
import { buildOasOperation, invalidResponseExample } from '../oas_utils';
import { INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION } from '../route_descriptions';

export const SAMPLE_ALERT_EVENT_SOURCE = 'datadog';

export const CREATE_ALERT_EVENT_REQUEST: CreateAlertEventData = {
  source: SAMPLE_ALERT_EVENT_SOURCE,
  fingerprint: 'fp-1',
  timestamp: '2026-07-29T12:00:00.000Z',
  severity: 'high',
  data: { rule_name: 'CPU high', monitor_id: 'mon-1' },
};

/** Path-body request omits `source` — it comes from the URL. */
export const CREATE_ALERT_EVENT_BY_SOURCE_REQUEST = {
  fingerprint: CREATE_ALERT_EVENT_REQUEST.fingerprint,
  timestamp: CREATE_ALERT_EVENT_REQUEST.timestamp,
  severity: CREATE_ALERT_EVENT_REQUEST.severity,
  data: CREATE_ALERT_EVENT_REQUEST.data,
};

export const CREATE_ALERT_EVENT_RESPONSE: CreateAlertEventResponse = {
  group_hash: 'group-hash-1',
  episode_id: 'episode-1',
};

const INVALID_CREATE_ALERT_EVENT_RESPONSE = invalidResponseExample({
  summary: INVALID_SCHEMA_OR_PARAMETERS_DESCRIPTION,
  message:
    'fingerprint: one of fingerprint, fingerprint_fields, or rule_id is required to establish a stable series identity',
  details: {
    errors: {
      errors: [],
      properties: {
        fingerprint: {
          errors: [
            'one of fingerprint, fingerprint_fields, or rule_id is required to establish a stable series identity',
          ],
        },
      },
    },
  },
});

export const createAlertEventOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    requestBody: {
      name: 'createAlertEventRequest',
      summary: 'Create an alert event from Datadog',
      value: CREATE_ALERT_EVENT_REQUEST,
    },
    responses: {
      201: {
        name: 'createAlertEventResponse',
        summary: 'Created alert event identifiers',
        value: CREATE_ALERT_EVENT_RESPONSE,
      },
      400: INVALID_CREATE_ALERT_EVENT_RESPONSE,
    },
  });

export const createAlertEventBySourceOasExamples = (): AlertingOasOperationObject =>
  buildOasOperation({
    requestBody: {
      name: 'createAlertEventBySourceRequest',
      summary: 'Create an alert event with source in the path',
      value: CREATE_ALERT_EVENT_BY_SOURCE_REQUEST,
    },
    responses: {
      201: {
        name: 'createAlertEventBySourceResponse',
        summary: 'Created alert event identifiers',
        value: CREATE_ALERT_EVENT_RESPONSE,
      },
      400: INVALID_CREATE_ALERT_EVENT_RESPONSE,
    },
  });
