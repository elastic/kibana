/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { SINGLE_STEP_WORKFLOW_TAG } from '../constants';
import { buildSingleStepWorkflowYaml, InvalidSingleStepWorkflowError } from './build_workflow_yaml';

describe('buildSingleStepWorkflowYaml', () => {
  it('builds a valid email workflow YAML', () => {
    const yaml = buildSingleStepWorkflowYaml({
      mode: 'create',
      typeId: 'email',
      connectorId: 'my-email-connector',
      params: 'to: "ops@example.com"\nsubject: "Alert"\nmessage: "Body"',
    });

    const parsed = parse(yaml);
    expect(parsed.enabled).toBe(true);
    expect(parsed.tags).toEqual([SINGLE_STEP_WORKFLOW_TAG]);
    expect(parsed.triggers).toEqual([{ type: 'manual' }]);
    expect(parsed.steps).toHaveLength(1);
    expect(parsed.steps[0]).toMatchObject({
      name: 'notify',
      type: 'email',
      'connector-id': 'my-email-connector',
      with: { to: 'ops@example.com', subject: 'Alert', message: 'Body' },
    });
  });

  it('builds a valid slack workflow YAML', () => {
    const yaml = buildSingleStepWorkflowYaml({
      mode: 'create',
      typeId: 'slack',
      connectorId: 'my-slack-connector',
      params: 'message: "Hello {{ policyId }}"',
    });

    const parsed = parse(yaml);
    expect(parsed.steps[0]).toMatchObject({
      type: 'slack',
      'connector-id': 'my-slack-connector',
      with: { message: 'Hello {{ policyId }}' },
    });
  });

  it('uses the provided name when present', () => {
    const yaml = buildSingleStepWorkflowYaml({
      mode: 'create',
      typeId: 'email',
      connectorId: 'c1',
      params: 'to: ""\nsubject: ""\nmessage: ""',
      name: 'On-call escalation',
    });
    expect(parse(yaml).name).toBe('On-call escalation');
  });

  it('falls back to a default name when none is provided', () => {
    const yaml = buildSingleStepWorkflowYaml({
      mode: 'create',
      typeId: 'email',
      connectorId: 'c1',
      params: 'to: ""\nsubject: ""\nmessage: ""',
    });
    expect(parse(yaml).name).toMatch(/notification/i);
  });

  it('treats empty params as an empty `with` block', () => {
    const yaml = buildSingleStepWorkflowYaml({
      mode: 'create',
      typeId: 'email',
      connectorId: 'c1',
      params: '',
    });
    expect(parse(yaml).steps[0].with).toEqual({});
  });

  it('throws when the params YAML is malformed', () => {
    expect(() =>
      buildSingleStepWorkflowYaml({
        mode: 'create',
        typeId: 'email',
        connectorId: 'c1',
        params: 'to: [unclosed',
      })
    ).toThrow(InvalidSingleStepWorkflowError);
  });

  it('throws when params is not an object', () => {
    expect(() =>
      buildSingleStepWorkflowYaml({
        mode: 'create',
        typeId: 'email',
        connectorId: 'c1',
        params: '- one\n- two',
      })
    ).toThrow(InvalidSingleStepWorkflowError);
  });

  it('throws when no connector is selected', () => {
    expect(() =>
      buildSingleStepWorkflowYaml({
        mode: 'create',
        typeId: 'email',
        connectorId: null,
        params: 'to: ""',
      })
    ).toThrow(InvalidSingleStepWorkflowError);
  });

  it('throws on an unknown type id', () => {
    expect(() =>
      buildSingleStepWorkflowYaml({
        mode: 'create',
        typeId: 'pager-duty',
        connectorId: 'c1',
        params: '',
      })
    ).toThrow(InvalidSingleStepWorkflowError);
  });
});
