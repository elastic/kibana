/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_EPISODE_STATUS } from './alert_action_schema';
import { MAX_EPISODE_DATA_LENGTH, MAX_EPISODE_LABEL_LENGTH } from './constants';
import { ALERT_ATTACHMENT_TYPE, alertAttachmentDataSchema } from './alert_attachment_schema';

const baseAlert = {
  '@timestamp': '2026-04-10T12:00:00.000Z',
  'alert.id': 'ep-1',
  'alert.status': ALERT_EPISODE_STATUS.ACTIVE,
  'rule.id': 'rule-1',
  group_hash: 'gh-1',
  first_timestamp: '2026-04-10T11:00:00.000Z',
  last_timestamp: '2026-04-10T12:00:00.000Z',
  duration: 3600000,
};

describe('alertAttachmentDataSchema', () => {
  it('exports the namespaced attachment type id', () => {
    expect(ALERT_ATTACHMENT_TYPE).toBe('platform.alerting.alert');
  });

  it('accepts a full alert row', () => {
    const result = alertAttachmentDataSchema.safeParse({
      ...baseAlert,
      triggered_at: '2026-04-10T11:05:00.000Z',
      last_ack_action: 'ack',
      last_assignee_uid: 'user-1',
      last_snooze_action: 'snooze',
      snooze_expiry: '2026-04-11T00:00:00.000Z',
      last_tags: ['ops', 'cpu'],
      alert_data: '{"host":"a"}',
      severity: 'high',
    });
    expect(result.success).toBe(true);
  });

  it('accepts an optional alert label', () => {
    const result = alertAttachmentDataSchema.safeParse({
      ...baseAlert,
      'alert.label': 'Host CPU high alert',
    });
    expect(result.success).toBe(true);
  });

  it('accepts the required fields only', () => {
    const result = alertAttachmentDataSchema.safeParse(baseAlert);
    expect(result.success).toBe(true);
  });

  it('rejects null on optional nullable source fields', () => {
    const result = alertAttachmentDataSchema.safeParse({
      ...baseAlert,
      last_assignee_uid: null,
      alert_data: null,
      severity: null,
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown keys', () => {
    const result = alertAttachmentDataSchema.safeParse({
      ...baseAlert,
      extra: true,
    });
    expect(result.success).toBe(false);
  });

  it('rejects oversized alert_data', () => {
    const result = alertAttachmentDataSchema.safeParse({
      ...baseAlert,
      alert_data: 'x'.repeat(MAX_EPISODE_DATA_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it('rejects oversized alert labels', () => {
    const result = alertAttachmentDataSchema.safeParse({
      ...baseAlert,
      'alert.label': 'x'.repeat(MAX_EPISODE_LABEL_LENGTH + 1),
    });
    expect(result.success).toBe(false);
  });

  it('rejects raw last_tags string form', () => {
    const result = alertAttachmentDataSchema.safeParse({
      ...baseAlert,
      last_tags: 'ops',
    });
    expect(result.success).toBe(false);
  });
});
