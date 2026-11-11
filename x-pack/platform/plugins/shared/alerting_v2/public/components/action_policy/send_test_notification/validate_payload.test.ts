/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ActionPolicyWorkflowPayloadInput } from '@kbn/alerting-v2-schemas';
import { validatePayload } from './validate_payload';

const alert = {
  last_event_timestamp: '2026-11-04T10:00:00.000Z',
  rule_id: 'test-rule-1',
  source: 'internal',
  space_id: 'default',
  group_hash: 'test-group-hash-1',
  alert_id: 'test-alert-1',
  alert_status: 'active',
  severity: 'high',
  alert_url: 'http://localhost:5601/app/observability/alerts/test-alert-1',
} as const;

const payload: ActionPolicyWorkflowPayloadInput = {
  id: 'test-group-1',
  policyId: 'policy-1',
  groupKey: {},
  alerts: [alert],
  rules: { 'test-rule-1': { name: 'Test rule 1' } },
};

const toText = (value: object) => JSON.stringify(value, null, 2);

describe('validatePayload', () => {
  it('returns the payload of valid JSON', () => {
    expect(validatePayload(toText(payload))).toEqual({ payload, errors: [] });
  });

  it('reports invalid JSON', () => {
    const { payload: parsed, errors } = validatePayload('{');

    expect(parsed).toBeUndefined();
    expect(errors).toEqual([expect.stringMatching(/^Invalid JSON: /)]);
  });

  it('reports an unknown key of the payload by name, without a path', () => {
    const { payload: parsed, errors } = validatePayload(toText({ ...payload, foo: 1 }));

    expect(parsed).toBeUndefined();
    expect(errors).toEqual([expect.stringMatching(/^Unrecognized key.*"foo"/)]);
  });

  it('prefixes the error of a nested field with its path', () => {
    const { errors } = validatePayload(
      toText({ ...payload, alerts: [{ ...alert, unknown: true, severity: 'urgent' }] })
    );

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^alerts\.0: .*"unknown"/),
        expect.stringMatching(/^alerts\.0\.severity: /),
      ])
    );
  });
});
