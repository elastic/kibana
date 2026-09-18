/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createAlertEventDataSchema,
  createAlertEventPathBodySchema,
  createAlertEventResponseSchema,
} from '@kbn/alerting-v2-schemas';
import {
  CREATE_ALERT_EVENT_BY_SOURCE_REQUEST,
  CREATE_ALERT_EVENT_REQUEST,
  CREATE_ALERT_EVENT_RESPONSE,
} from './create_alert_event_oas_example';

describe('create alert event OAS example payloads', () => {
  it('keeps create request example valid against createAlertEventDataSchema', () => {
    expect(createAlertEventDataSchema.safeParse(CREATE_ALERT_EVENT_REQUEST).success).toBe(true);
  });

  it('keeps by-source request example valid against createAlertEventPathBodySchema', () => {
    expect(
      createAlertEventPathBodySchema.safeParse(CREATE_ALERT_EVENT_BY_SOURCE_REQUEST).success
    ).toBe(true);
  });

  it('keeps response example valid against createAlertEventResponseSchema', () => {
    expect(createAlertEventResponseSchema.safeParse(CREATE_ALERT_EVENT_RESPONSE).success).toBe(
      true
    );
  });
});
