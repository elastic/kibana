/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  assertActionPolicyWorkflowLiquid,
  getInvalidActionPolicyPayloadField,
  isActionPolicyPayloadLiquidPath,
} from './assert_action_policy_workflow_liquid';

describe('isActionPolicyPayloadLiquidPath', () => {
  it.each([
    'inputs.payload',
    'inputs.payload.policyId',
    'inputs.payload.episodes',
    'inputs.payload.episodes[0].data.host.name',
    'inputs.payload.rules',
  ])('matches %s', (path) => {
    expect(isActionPolicyPayloadLiquidPath(path)).toBe(true);
  });

  it.each(['inputs', 'inputs.other', 'event.alerts', 'execution.url'])(
    'does not match %s',
    (path) => {
      expect(isActionPolicyPayloadLiquidPath(path)).toBe(false);
    }
  );
});

describe('getInvalidActionPolicyPayloadField', () => {
  it.each([
    '',
    'id',
    'policyId',
    'groupKey',
    'episodes',
    'episodes[0].episode_status',
    'episodes[0].data.host.name',
    'rules',
    'rules[ep.rule_id].name',
  ])('accepts %s', (relativePath) => {
    expect(getInvalidActionPolicyPayloadField(relativePath)).toBeNull();
  });

  it.each([
    ['foo', 'foo'],
    ['episodes[0].bogus', 'bogus'],
    ['policy_id', 'policy_id'],
  ])('rejects %s', (relativePath, invalidSegment) => {
    expect(getInvalidActionPolicyPayloadField(relativePath)).toBe(invalidSegment);
  });
});

describe('assertActionPolicyWorkflowLiquid', () => {
  const validWorkflowYaml = `
version: '1'
name: Notify
enabled: true
triggers:
  - type: manual
steps:
  - name: send_email
    type: email
    connector-id: conn-1
    with:
      to:
        - oncall@example.com
      subject: "Alert — {{ inputs.payload.episodes | size }} episode(s)"
      message: >
        {% for ep in inputs.payload.episodes %}
        - Host: {{ ep.data.host.name | default: "unknown" }}
          Status: {{ ep.episode_status }}
          Rule: {{ inputs.payload.rules[ep.rule_id].name }}
        {% endfor %}
        View: {{ execution.url }}
`;

  it('accepts a workflow with valid inputs.payload.* fields', () => {
    const { variables } = assertActionPolicyWorkflowLiquid(validWorkflowYaml);

    expect(variables).toEqual(expect.arrayContaining(['inputs.payload.episodes', 'execution.url']));
  });

  it('rejects invalid Liquid syntax', () => {
    const yaml = `
steps:
  - name: send_email
    type: email
    with:
      message: "{{ inputs.payload.episodes | "
`;

    expect(() => assertActionPolicyWorkflowLiquid(yaml)).toThrow(/invalid Liquid/i);
  });

  it('rejects unknown inputs.payload fields', () => {
    const yaml = `
steps:
  - name: send_email
    type: email
    with:
      message: "{{ inputs.payload.policy_id }} {{ inputs.payload.alerts }}"
`;

    expect(() => assertActionPolicyWorkflowLiquid(yaml)).toThrow(
      /unknown `inputs\.payload` fields/i
    );
    expect(() => assertActionPolicyWorkflowLiquid(yaml)).toThrow(/inputs\.payload\.policy_id/);
    expect(() => assertActionPolicyWorkflowLiquid(yaml)).toThrow(/inputs\.payload\.alerts/);
  });

  it('rejects workflows with no inputs.payload references', () => {
    const yaml = `
version: '1'
name: Static
triggers:
  - type: manual
steps:
  - name: send_email
    type: email
    with:
      message: "{{ execution.url }} {{ event.alerts }}"
`;

    expect(() => assertActionPolicyWorkflowLiquid(yaml)).toThrow(/inputs\.payload/);
    expect(() => assertActionPolicyWorkflowLiquid(yaml)).toThrow(/event\.alerts/);
  });

  it('rejects workflows with no Liquid', () => {
    const yaml = `
version: '1'
name: Static
triggers:
  - type: manual
steps:
  - name: send_email
    type: email
    with:
      message: plain text
`;

    expect(() => assertActionPolicyWorkflowLiquid(yaml)).toThrow(/inputs\.payload/);
    expect(() => assertActionPolicyWorkflowLiquid(yaml)).toThrow(/\(none\)/);
  });
});
