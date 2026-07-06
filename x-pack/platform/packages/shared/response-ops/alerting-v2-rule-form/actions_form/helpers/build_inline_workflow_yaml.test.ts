/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parse } from 'yaml';
import { INLINE_WORKFLOW_TAG } from '../constants';
import { buildInlineWorkflowYaml, InvalidInlineWorkflowError } from './build_inline_workflow_yaml';

describe('buildInlineWorkflowYaml', () => {
  it('builds a valid email workflow YAML', () => {
    const yaml = buildInlineWorkflowYaml({
      id: 't1',
      source: 'inline',
      stepType: 'email',
      connectorId: 'my-email-connector',
      params: 'to: "ops@example.com"\nsubject: "Alert"\nmessage: "Body"',
    });

    const parsed = parse(yaml);
    expect(parsed.enabled).toBe(true);
    expect(parsed.tags).toEqual([INLINE_WORKFLOW_TAG]);
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
    const yaml = buildInlineWorkflowYaml({
      id: 't2',
      source: 'inline',
      stepType: 'slack',
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

  it('uses the step definition label as the workflow name', () => {
    const yaml = buildInlineWorkflowYaml({
      id: 't3',
      source: 'inline',
      stepType: 'email',
      connectorId: 'c1',
      params: 'to: ""\nsubject: ""\nmessage: ""',
    });
    expect(parse(yaml).name).toMatch(/notification/i);
  });

  it('treats empty params as an empty `with` block', () => {
    const yaml = buildInlineWorkflowYaml({
      id: 't4',
      source: 'inline',
      stepType: 'email',
      connectorId: 'c1',
      params: '',
    });
    expect(parse(yaml).steps[0].with).toEqual({});
  });

  it('throws when the params YAML is malformed', () => {
    expect(() =>
      buildInlineWorkflowYaml({
        id: 't5',
        source: 'inline',
        stepType: 'email',
        connectorId: 'c1',
        params: 'to: [unclosed',
      })
    ).toThrow(InvalidInlineWorkflowError);
  });

  it('throws when params is not an object', () => {
    expect(() =>
      buildInlineWorkflowYaml({
        id: 't6',
        source: 'inline',
        stepType: 'email',
        connectorId: 'c1',
        params: '- one\n- two',
      })
    ).toThrow(InvalidInlineWorkflowError);
  });

  it('throws when no connector is selected', () => {
    expect(() =>
      buildInlineWorkflowYaml({
        id: 't7',
        source: 'inline',
        stepType: 'email',
        connectorId: null,
        params: 'to: ""',
      })
    ).toThrow(InvalidInlineWorkflowError);
  });
});
