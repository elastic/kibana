/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  bulkCreateAlertActionBodySchema,
  bulkResponseSchema,
  createAckAlertActionBodySchema,
  createActivateAlertActionBodySchema,
  createAssignAlertActionBodySchema,
  createDeactivateAlertActionBodySchema,
  createSnoozeAlertActionBodySchema,
  createTagAlertActionBodySchema,
  createUnackAlertActionBodySchema,
  createUnsnoozeAlertActionBodySchema,
} from '@kbn/alerting-v2-schemas';
import {
  BULK_CREATE_ALERT_ACTION_REQUEST,
  BULK_CREATE_ALERT_ACTION_RESPONSE,
} from './bulk_create_alert_action_oas_example';
import { CREATE_ACK_ALERT_ACTION_REQUEST } from './create_ack_alert_action_oas_example';
import { CREATE_ACTIVATE_ALERT_ACTION_REQUEST } from './create_activate_alert_action_oas_example';
import { CREATE_ASSIGN_ALERT_ACTION_REQUEST } from './create_assign_alert_action_oas_example';
import { CREATE_DEACTIVATE_ALERT_ACTION_REQUEST } from './create_deactivate_alert_action_oas_example';
import { CREATE_SNOOZE_ALERT_ACTION_REQUEST } from './create_snooze_alert_action_oas_example';
import { CREATE_TAG_ALERT_ACTION_REQUEST } from './create_tag_alert_action_oas_example';
import { CREATE_UNACK_ALERT_ACTION_REQUEST } from './create_unack_alert_action_oas_example';
import { CREATE_UNSNOOZE_ALERT_ACTION_REQUEST } from './create_unsnooze_alert_action_oas_example';

describe('alert OAS example payloads', () => {
  it('keeps ack request example valid against createAckAlertActionBodySchema', () => {
    expect(createAckAlertActionBodySchema.safeParse(CREATE_ACK_ALERT_ACTION_REQUEST).success).toBe(
      true
    );
  });

  it('keeps unack request example valid against createUnackAlertActionBodySchema', () => {
    expect(
      createUnackAlertActionBodySchema.safeParse(CREATE_UNACK_ALERT_ACTION_REQUEST).success
    ).toBe(true);
  });

  it('keeps assign request example valid against createAssignAlertActionBodySchema', () => {
    expect(
      createAssignAlertActionBodySchema.safeParse(CREATE_ASSIGN_ALERT_ACTION_REQUEST).success
    ).toBe(true);
  });

  it('keeps tag request example valid against createTagAlertActionBodySchema', () => {
    expect(createTagAlertActionBodySchema.safeParse(CREATE_TAG_ALERT_ACTION_REQUEST).success).toBe(
      true
    );
  });

  it('keeps snooze request example valid against createSnoozeAlertActionBodySchema', () => {
    expect(
      createSnoozeAlertActionBodySchema.safeParse(CREATE_SNOOZE_ALERT_ACTION_REQUEST).success
    ).toBe(true);
  });

  it('keeps unsnooze request example valid against createUnsnoozeAlertActionBodySchema', () => {
    expect(
      createUnsnoozeAlertActionBodySchema.safeParse(CREATE_UNSNOOZE_ALERT_ACTION_REQUEST).success
    ).toBe(true);
  });

  it('keeps activate request example valid against createActivateAlertActionBodySchema', () => {
    expect(
      createActivateAlertActionBodySchema.safeParse(CREATE_ACTIVATE_ALERT_ACTION_REQUEST).success
    ).toBe(true);
  });

  it('keeps deactivate request example valid against createDeactivateAlertActionBodySchema', () => {
    expect(
      createDeactivateAlertActionBodySchema.safeParse(CREATE_DEACTIVATE_ALERT_ACTION_REQUEST)
        .success
    ).toBe(true);
  });

  it('keeps bulk request example valid against bulkCreateAlertActionBodySchema', () => {
    expect(
      bulkCreateAlertActionBodySchema.safeParse(BULK_CREATE_ALERT_ACTION_REQUEST).success
    ).toBe(true);
  });

  it('keeps bulk response example valid against bulkResponseSchema', () => {
    expect(bulkResponseSchema.safeParse(BULK_CREATE_ALERT_ACTION_RESPONSE).success).toBe(true);
  });
});
