/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  assertActionPolicyWorkflowBranchesOnAlertStatus,
  assertActionPolicyWorkflowLinksAlertDetails,
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

describe('assertActionPolicyWorkflowLinksAlertDetails', () => {
  const toWorkflow = (message: string, foreach?: string) =>
    assertActionPolicyWorkflowLiquid(`
version: '1'
name: Notify
triggers:
  - type: manual
steps:
  - name: send_email
    type: email
    connector-id: conn-1
    ${foreach ? `foreach: "${foreach}"` : ''}
    with:
      to:
        - oncall@example.com
      subject: "{{ inputs.payload.alerts | size }} alert(s)"
      message: |
        ${message}
`).workflow;

  it.each([
    [
      'a for-loop alias',
      '{% for alert in inputs.payload.alerts %}- {{ alert.alert_url }}{% endfor %}',
      undefined,
    ],
    [
      'a whitespace-trimmed output tag',
      '{% for alert in inputs.payload.alerts %}{{- alert.alert_url -}}{% endfor %}',
      undefined,
    ],
    ['an indexed payload path', 'View: {{ inputs.payload.alerts[0].alert_url }}', undefined],
    ['a foreach step item', 'View: {{ foreach.item.alert_url }}', '{{ inputs.payload.alerts }}'],
  ])('accepts %s', (_label, message, foreach) => {
    expect(() =>
      assertActionPolicyWorkflowLinksAlertDetails(toWorkflow(message, foreach))
    ).not.toThrow();
  });

  it.each([
    ['no link', '{% for alert in inputs.payload.alerts %}- {{ alert.alert_status }}{% endfor %}'],
    ['the workflow execution link', '{{ inputs.payload.policyId }} {{ execution.url }}'],
    ['alert_url outside a Liquid output tag', '{{ inputs.payload.policyId }} see alert_url'],
  ])('rejects %s', (_label, message) => {
    expect(() => assertActionPolicyWorkflowLinksAlertDetails(toWorkflow(message))).toThrow(
      /does not render an alert details link/
    );
  });
});

describe('assertActionPolicyWorkflowBranchesOnAlertStatus', () => {
  const emailStep = (name: string, condition?: string) => `
  - name: ${name}
    type: email
    connector-id: conn-1
    ${condition ? `if: "${condition}"` : ''}
    with:
      to:
        - oncall@example.com
      subject: "${name}"
      message: "{{ inputs.payload.alerts[0].alert_url }}"`;

  const toWorkflow = (steps: string) =>
    assertActionPolicyWorkflowLiquid(`
version: '1'
name: Notify
triggers:
  - type: manual
steps:${steps}
`).workflow;

  const activeCondition =
    "${{ (inputs.payload.alerts | where: 'alert_status', 'active' | size) > 0 }}";
  const inactiveCondition =
    "${{ (inputs.payload.alerts | where: 'alert_status', 'inactive' | size) > 0 }}";

  it('accepts step-level conditions for active and inactive alerts', () => {
    const workflow = toWorkflow(
      emailStep('notify_active', activeCondition) + emailStep('notify_resolved', inactiveCondition)
    );
    expect(() => assertActionPolicyWorkflowBranchesOnAlertStatus(workflow)).not.toThrow();
  });

  it('accepts nested if steps gated on alert status', () => {
    const workflow = toWorkflow(`
  - name: branch
    type: if
    condition: "inputs.payload.alerts[0].alert_status: active"
    steps:${emailStep('notify_active').replace(/\n/g, '\n    ')}
    else:
      - name: resolved_branch
        type: if
        condition: "inputs.payload.alerts[0].alert_status: inactive"
        steps:${emailStep('notify_resolved').replace(/\n/g, '\n        ')}`);
    expect(() => assertActionPolicyWorkflowBranchesOnAlertStatus(workflow)).not.toThrow();
  });

  it('rejects a notification step that runs for every alert status', () => {
    const workflow = toWorkflow(
      emailStep('notify_active', activeCondition) + emailStep('send_email')
    );
    expect(() => assertActionPolicyWorkflowBranchesOnAlertStatus(workflow)).toThrow(
      /every alert status from step\(s\): send_email/
    );
  });

  it('rejects a notification step in an else branch without its own status condition', () => {
    const workflow = toWorkflow(`
  - name: branch
    type: if
    condition: "inputs.payload.alerts[0].alert_status: active"
    steps:${emailStep('notify_active').replace(/\n/g, '\n    ')}
    else:${emailStep('notify_resolved').replace(/\n/g, '\n    ')}`);
    expect(() => assertActionPolicyWorkflowBranchesOnAlertStatus(workflow)).toThrow(
      /every alert status from step\(s\): notify_resolved/
    );
  });

  it('rejects {{ }} interpolated into a KQL condition', () => {
    const workflow = toWorkflow(
      emailStep(
        'notify_active',
        "{{ inputs.payload.alerts | where: 'alert_status', 'active' | size }} > 0"
      ) + emailStep('notify_resolved', inactiveCondition)
    );
    expect(() => assertActionPolicyWorkflowBranchesOnAlertStatus(workflow)).toThrow(
      /interpolate `\{\{ \}\}` into KQL/
    );
  });

  it('rejects a workflow without an inactive branch', () => {
    const workflow = toWorkflow(emailStep('notify_active', activeCondition));
    expect(() => assertActionPolicyWorkflowBranchesOnAlertStatus(workflow)).toThrow(
      /does not branch on both `active` and `inactive`/
    );
  });
});
