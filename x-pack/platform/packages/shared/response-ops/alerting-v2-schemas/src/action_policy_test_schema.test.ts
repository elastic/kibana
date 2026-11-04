/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  actionPolicyTestSendBodySchema,
  actionPolicyWorkflowPayloadSchema,
  type ActionPolicyWorkflowPayloadInput,
} from './action_policy_test_schema';
import {
  ACTION_POLICY_TEST_MAX_ALERTS,
  ID_MAX_LENGTH,
  MAX_ALERT_EVENT_DATA_KEYS,
} from './constants';

const alert = {
  last_event_timestamp: '2026-11-04T10:00:00.000Z',
  rule_id: 'test-rule-1-0a1b2c3d',
  source: 'internal',
  space_id: 'default',
  group_hash: 'test-group-hash-0a1b2c3d',
  alert_id: 'test-alert-0a1b2c3d',
  alert_status: 'active',
  severity: 'high',
  alert_url: 'http://localhost:5601/app/observability/alerts/test-alert-0a1b2c3d',
  data: { host: { name: 'test-host.name-0a1b2c3d' } },
} as const;

const payload: ActionPolicyWorkflowPayloadInput = {
  id: 'test-group-0a1b2c3d',
  policyId: 'policy-1',
  groupKey: { 'data.host.name': 'test-host.name-0a1b2c3d' },
  alerts: [alert],
  rules: { 'test-rule-1-0a1b2c3d': { name: 'Test rule 1' } },
};

const manyKeys = (count: number): Record<string, string> =>
  Object.fromEntries(Array.from({ length: count }, (_, index) => [`key-${index}`, 'value']));

const issuesOf = (value: object) => {
  const result = actionPolicyWorkflowPayloadSchema.safeParse(value);
  return result.success ? [] : result.error.issues;
};

describe('actionPolicyWorkflowPayloadSchema', () => {
  it('accepts a synthetic test payload', () => {
    expect(actionPolicyWorkflowPayloadSchema.parse(payload)).toEqual(payload);
  });

  it('accepts an alert without a rule, severity or data', () => {
    const { severity, data, ...bareAlert } = alert;
    expect(
      actionPolicyWorkflowPayloadSchema.safeParse({
        ...payload,
        alerts: [{ ...bareAlert, rule_id: null }],
      }).success
    ).toBe(true);
  });

  it('accepts an alert of a space whose id is longer than other identifiers', () => {
    const longSpaceId = 'a'.repeat(ID_MAX_LENGTH + 1);
    expect(
      actionPolicyWorkflowPayloadSchema.safeParse({
        ...payload,
        alerts: [
          {
            ...alert,
            space_id: longSpaceId,
            alert_url: `http://localhost:5601/s/${longSpaceId}/app/observability/alerts/test-alert-0a1b2c3d`,
          },
        ],
      }).success
    ).toBe(true);
  });

  it.each([
    ['the payload', { ...payload, unknown: true }, []],
    ['an alert', { ...payload, alerts: [{ ...alert, unknown: true }] }, ['alerts', 0]],
    [
      'a rule',
      { ...payload, rules: { 'test-rule-1-0a1b2c3d': { name: 'Test rule 1', unknown: true } } },
      ['rules', 'test-rule-1-0a1b2c3d'],
    ],
  ])('rejects an unknown key in %s', (_, value, path) => {
    expect(issuesOf(value)).toEqual([
      expect.objectContaining({ code: 'unrecognized_keys', keys: ['unknown'], path }),
    ]);
  });

  it('accepts any keys in the group key and the alert data', () => {
    expect(
      actionPolicyWorkflowPayloadSchema.safeParse({
        ...payload,
        groupKey: { 'data.anything': 1 },
        alerts: [{ ...alert, data: { anything: { nested: true } } }],
      }).success
    ).toBe(true);
  });

  it.each([
    ['no alerts', { ...payload, alerts: [] }],
    [
      'too many alerts',
      {
        ...payload,
        alerts: Array.from({ length: ACTION_POLICY_TEST_MAX_ALERTS + 1 }, () => alert),
      },
    ],
    ['an unknown alert status', { ...payload, alerts: [{ ...alert, alert_status: 'firing' }] }],
    ['an unknown severity', { ...payload, alerts: [{ ...alert, severity: 'urgent' }] }],
    [
      'an invalid timestamp',
      { ...payload, alerts: [{ ...alert, last_event_timestamp: 'yesterday' }] },
    ],
    ['an invalid alert url', { ...payload, alerts: [{ ...alert, alert_url: 'not a url' }] }],
    [
      'a non-http alert url',
      { ...payload, alerts: [{ ...alert, alert_url: 'ftp://example.com/alert' }] },
    ],
    [
      'too many group key fields',
      { ...payload, groupKey: manyKeys(MAX_ALERT_EVENT_DATA_KEYS + 1) },
    ],
    [
      'too many alert data fields',
      { ...payload, alerts: [{ ...alert, data: manyKeys(MAX_ALERT_EVENT_DATA_KEYS + 1) }] },
    ],
    ['a missing policy id', { ...payload, policyId: undefined }],
  ])('rejects %s', (_, value) => {
    expect(actionPolicyWorkflowPayloadSchema.safeParse(value).success).toBe(false);
  });
});

describe('actionPolicyTestSendBodySchema', () => {
  it('accepts a payload and destinations', () => {
    expect(
      actionPolicyTestSendBodySchema.safeParse({ payload, destination_ids: ['workflow-1'] }).success
    ).toBe(true);
  });

  it.each([
    ['a missing payload', { destination_ids: ['workflow-1'] }],
    ['a seed', { seed: 1, payload, destination_ids: ['workflow-1'] }],
  ])('rejects %s', (_, value) => {
    expect(actionPolicyTestSendBodySchema.safeParse(value).success).toBe(false);
  });
});
