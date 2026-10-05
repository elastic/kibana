/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  assertActionPolicyWorkflowLiquid,
  isActionPolicyPayloadLiquidPath,
  isActionPolicyPayloadPathInSchema,
} from './assert_action_policy_workflow_liquid';

describe('isActionPolicyPayloadLiquidPath', () => {
  it.each([
    'inputs.payload',
    'inputs.payload.policyId',
    'inputs.payload.alerts',
    'inputs.payload.alerts[0].data.host.name',
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

describe('isActionPolicyPayloadPathInSchema', () => {
  it.each([
    '',
    'id',
    'policyId',
    'groupKey',
    'alerts',
    'alerts[0].alert_status',
    'alerts[0].data.host.name',
    'rules',
    'rules[alert.rule_id].name',
  ])('accepts %s', (relativePath) => {
    expect(isActionPolicyPayloadPathInSchema(relativePath)).toBe(true);
  });

  it.each([
    'foo',
    'alerts[0].bogus',
    'alerts.foo',
    'episodes',
    'episodes[0].episode_status',
    'policy_id',
    'policyId.anything',
    'rules[alert.rule_id].nmae',
  ])('rejects %s', (relativePath) => {
    expect(isActionPolicyPayloadPathInSchema(relativePath)).toBe(false);
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
      subject: "Alert — {{ inputs.payload.alerts | size }} alert(s)"
      message: >
        {% for alert in inputs.payload.alerts %}
        - Host: {{ alert.data.host.name | default: "unknown" }}
          Status: {{ alert.alert_status }}
          Rule: {{ inputs.payload.rules[alert.rule_id].name }}
        {% endfor %}
        View: {{ execution.url }}
`;

  it('accepts a workflow with valid inputs.payload.* fields', () => {
    const { variables } = assertActionPolicyWorkflowLiquid(validWorkflowYaml);

    expect(variables).toEqual(expect.arrayContaining(['inputs.payload.alerts', 'execution.url']));
  });

  it('returns the parsed workflow document', () => {
    const { workflow } = assertActionPolicyWorkflowLiquid(validWorkflowYaml);

    expect(workflow.name).toBe('Notify');
    expect(workflow.triggers.map((trigger) => trigger.type)).toEqual(['manual']);
    expect(workflow.steps.map((step) => step.name)).toEqual(['send_email']);
  });

  it('rejects YAML that is not a workflow document', () => {
    expect(() => assertActionPolicyWorkflowLiquid('just a string')).toThrow(
      new Error(
        'Generated workflow YAML is not a workflow document: ' +
          '(root): Invalid input: expected object, received string'
      )
    );
  });

  it('rejects invalid Liquid syntax', () => {
    const yaml = `
steps:
  - name: send_email
    type: email
    with:
      message: "{{ inputs.payload.alerts | "
`;

    expect(() => assertActionPolicyWorkflowLiquid(yaml)).toThrow(
      new Error(
        'Generated workflow contains invalid Liquid template syntax: ' +
          'output "{{ inputs.payload.alerts | " not closed, line:1, col:1'
      )
    );
  });

  it('rejects unknown inputs.payload fields', () => {
    const yaml = `
steps:
  - name: send_email
    type: email
    with:
      message: "{{ inputs.payload.policy_id }} {{ inputs.payload.episodes }}"
`;

    expect(() => assertActionPolicyWorkflowLiquid(yaml)).toThrow(
      new Error(
        'Generated workflow Liquid references unknown `inputs.payload` fields: ' +
          '`inputs.payload.episodes`, `inputs.payload.policy_id`. ' +
          'Allowed top-level payload fields: id, policyId, groupKey, alerts, rules.'
      )
    );
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

    expect(() => assertActionPolicyWorkflowLiquid(yaml)).toThrow(
      new Error(
        'Generated workflow Liquid does not reference `inputs.payload.*`. ' +
          'Action-policy dispatch exposes alert data as `inputs.payload` ' +
          '(mirrors `ActionPolicyWorkflowPayload`). ' +
          'Found variables: `event.alerts`, `execution.url`.'
      )
    );
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

    expect(() => assertActionPolicyWorkflowLiquid(yaml)).toThrow(
      new Error(
        'Generated workflow Liquid does not reference `inputs.payload.*`. ' +
          'Action-policy dispatch exposes alert data as `inputs.payload` ' +
          '(mirrors `ActionPolicyWorkflowPayload`). ' +
          'Found variables: (none).'
      )
    );
  });
});
