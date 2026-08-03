/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  assertActionPolicyWorkflowLiquid,
  isAllowedActionPolicyLiquidPath,
} from './assert_action_policy_workflow_liquid';

describe('isAllowedActionPolicyLiquidPath', () => {
  it.each([
    'inputs',
    'inputs.payload',
    'inputs.payload.policyId',
    'inputs.payload.episodes',
    'inputs.payload.episodes[0].data.host.name',
    'inputs.payload.rules',
    'triggeredBy',
    'spaceId',
    'execution.url',
    'execution.id',
    'workflow.name',
    'kibanaUrl',
    'now',
  ])('allows %s', (path) => {
    expect(isAllowedActionPolicyLiquidPath(path)).toBe(true);
  });

  it.each([
    'event.alerts',
    'event.rule.name',
    'event.spaceId',
    'inputs.other',
    'context.payload',
  ])('rejects %s', (path) => {
    expect(isAllowedActionPolicyLiquidPath(path)).toBe(false);
  });

  it('allows steps.* for prior step outputs', () => {
    expect(isAllowedActionPolicyLiquidPath('steps.send_email.output')).toBe(true);
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

  it('accepts a valid action-policy notification workflow', () => {
    const { variables } = assertActionPolicyWorkflowLiquid(validWorkflowYaml);

    expect(variables).toEqual(
      expect.arrayContaining(['inputs.payload.episodes', 'execution.url'])
    );
    expect(variables.every(isAllowedActionPolicyLiquidPath)).toBe(true);
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

  it('rejects v1 event.* Liquid variables', () => {
    const yaml = `
steps:
  - name: send_email
    type: email
    with:
      message: "{{ event.alerts | size }} — {{ event.rule.name }}"
`;

    expect(() => assertActionPolicyWorkflowLiquid(yaml)).toThrow(/disallowed variables/i);
    expect(() => assertActionPolicyWorkflowLiquid(yaml)).toThrow(/event\.alerts/);
  });

  it('rejects other unknown Liquid roots', () => {
    const yaml = `
steps:
  - name: send_email
    type: email
    with:
      message: "{{ context.payload.episodes }}"
`;

    expect(() => assertActionPolicyWorkflowLiquid(yaml)).toThrow(/disallowed variables/i);
    expect(() => assertActionPolicyWorkflowLiquid(yaml)).toThrow(/context\.payload\.episodes/);
  });

  it('allows workflows with no Liquid', () => {
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

    expect(assertActionPolicyWorkflowLiquid(yaml)).toEqual({ variables: [] });
  });
});
