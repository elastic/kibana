/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { assertActionPolicyWorkflowLiquid } from './assert_action_policy_workflow_liquid';

// The individual compatibility checks are covered by the alerting_v2 plugin's
// validate_workflow_compatibility tests. These cover what the wrapper adds:
// requiring the attachment, failing only on error severity, and returning the
// parsed document the specs assert on.
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

  it('returns the Liquid variables and the parsed workflow document', () => {
    const { variables, workflow, yaml } = assertActionPolicyWorkflowLiquid(validWorkflowYaml);

    expect(variables).toEqual(expect.arrayContaining(['inputs.payload.episodes', 'execution.url']));
    expect(workflow.name).toBe('Notify');
    expect(workflow.triggers.map((trigger) => trigger.type)).toEqual(['manual']);
    expect(workflow.steps.map((step) => step.name)).toEqual(['send_email']);
    expect(yaml).toBe(validWorkflowYaml);
  });

  it('rejects a missing workflow yaml attachment', () => {
    expect(() => assertActionPolicyWorkflowLiquid(undefined)).toThrow(
      new Error('Expected workflow yaml attachment')
    );
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
      new Error(
        'Generated workflow Liquid references unknown `inputs.payload` fields: ' +
          '`inputs.payload.alerts`, `inputs.payload.policy_id`. ' +
          'Allowed top-level payload fields: id, policyId, groupKey, episodes, rules.'
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
      /does not reference `inputs.payload.\*`/
    );
  });

  it('accepts warning-only workflows so specs can assert on them directly', () => {
    const yaml = validWorkflowYaml
      .replace('- type: manual', '- type: scheduled')
      .replace('enabled: true', 'enabled: false');

    const { workflow } = assertActionPolicyWorkflowLiquid(yaml);

    expect(workflow.enabled).toBe(false);
    expect(workflow.triggers.map((trigger) => trigger.type)).toEqual(['scheduled']);
  });
});
