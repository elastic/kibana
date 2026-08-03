/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isActionPolicyPayloadLiquidPath,
  isActionPolicyPayloadPathInSchema,
  validateActionPolicyWorkflow,
} from './validate_workflow_compatibility';

const compatibleWorkflowYaml = `
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

describe('isActionPolicyPayloadPathInSchema', () => {
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
    expect(isActionPolicyPayloadPathInSchema(relativePath)).toBe(true);
  });

  it.each(['foo', 'episodes[0].bogus', 'episodes.foo', 'policy_id', 'policyId.anything'])(
    'rejects %s',
    (relativePath) => {
      expect(isActionPolicyPayloadPathInSchema(relativePath)).toBe(false);
    }
  );
});

describe('validateActionPolicyWorkflow', () => {
  it('reports no diagnostics for a compatible workflow', () => {
    expect(validateActionPolicyWorkflow(compatibleWorkflowYaml)).toEqual([]);
  });

  it('reports YAML that does not parse', () => {
    const diagnostics = validateActionPolicyWorkflow('steps:\n  - name: a\n   bad-indent: true');

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].code).toBe('invalid_yaml');
    expect(diagnostics[0].severity).toBe('error');
    expect(diagnostics[0].message).toContain('Generated workflow YAML is not valid YAML:');
  });

  it('reports YAML that is not a workflow document', () => {
    expect(validateActionPolicyWorkflow('just a string')).toEqual([
      {
        code: 'not_a_workflow',
        severity: 'error',
        message:
          'Generated workflow YAML is not a workflow document: ' +
          '(root): Invalid input: expected object, received string',
      },
    ]);
  });

  it('reports invalid Liquid syntax', () => {
    const yaml = `
version: '1'
name: Notify
triggers:
  - type: manual
steps:
  - name: send_email
    type: email
    with:
      message: "{{ inputs.payload.episodes | "
`;

    expect(validateActionPolicyWorkflow(yaml)).toEqual([
      {
        code: 'invalid_liquid',
        severity: 'error',
        message:
          'Generated workflow contains invalid Liquid template syntax: ' +
          'output "{{ inputs.payload.episodes | " not closed, line:1, col:1',
      },
    ]);
  });

  it('reports unknown inputs.payload fields', () => {
    const yaml = `
version: '1'
name: Notify
triggers:
  - type: manual
steps:
  - name: send_email
    type: email
    with:
      message: "{{ inputs.payload.policy_id }} {{ inputs.payload.alerts }}"
`;

    expect(validateActionPolicyWorkflow(yaml)).toEqual([
      {
        code: 'unknown_payload_field',
        severity: 'error',
        message:
          'Generated workflow Liquid references unknown `inputs.payload` fields: ' +
          '`inputs.payload.alerts`, `inputs.payload.policy_id`. ' +
          'Allowed top-level payload fields: id, policyId, groupKey, episodes, rules.',
      },
    ]);
  });

  it('reports a workflow that never references inputs.payload', () => {
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

    expect(validateActionPolicyWorkflow(yaml)).toEqual([
      {
        code: 'no_payload_reference',
        severity: 'error',
        message:
          'Generated workflow Liquid does not reference `inputs.payload.*`. ' +
          'Action-policy dispatch exposes alert data as `inputs.payload` ' +
          '(mirrors `ActionPolicyWorkflowPayload`). ' +
          'Found variables: `event.alerts`, `execution.url`.',
      },
    ]);
  });

  it('reports a workflow with no Liquid at all', () => {
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

    const diagnostics = validateActionPolicyWorkflow(yaml);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].code).toBe('no_payload_reference');
    expect(diagnostics[0].message).toContain('Found variables: (none).');
  });

  it('warns rather than errors when the trigger is not a single manual trigger', () => {
    const yaml = compatibleWorkflowYaml.replace('- type: manual', '- type: scheduled');

    expect(validateActionPolicyWorkflow(yaml)).toEqual([
      {
        code: 'unexpected_trigger',
        severity: 'warning',
        message:
          'Generated workflow declares triggers `scheduled`. Action-policy dispatch schedules ' +
          'the workflow directly, so it should declare exactly one `manual` trigger.',
      },
    ]);
  });

  it('warns when the workflow declares no triggers', () => {
    const yaml = compatibleWorkflowYaml.replace('triggers:\n  - type: manual\n', '');

    const diagnostics = validateActionPolicyWorkflow(yaml);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].code).toBe('unexpected_trigger');
    expect(diagnostics[0].message).toContain('declares triggers (none)');
  });

  it('warns when the workflow YAML disables the workflow', () => {
    const yaml = compatibleWorkflowYaml.replace('enabled: true', 'enabled: false');

    const diagnostics = validateActionPolicyWorkflow(yaml);

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].code).toBe('disabled');
    expect(diagnostics[0].severity).toBe('warning');
  });

  it('warns when the saved workflow is disabled even though the YAML is not', () => {
    const diagnostics = validateActionPolicyWorkflow(compatibleWorkflowYaml, { enabled: false });

    expect(diagnostics.map(({ code }) => code)).toEqual(['disabled']);
  });

  it('reports every independent problem in one pass', () => {
    const yaml = `
version: '1'
name: Notify
enabled: false
triggers:
  - type: alert
steps:
  - name: send_email
    type: email
    with:
      message: "{{ inputs.payload.bogus }}"
`;

    expect(validateActionPolicyWorkflow(yaml).map(({ code }) => code)).toEqual([
      'unknown_payload_field',
      'unexpected_trigger',
      'disabled',
    ]);
  });
});
