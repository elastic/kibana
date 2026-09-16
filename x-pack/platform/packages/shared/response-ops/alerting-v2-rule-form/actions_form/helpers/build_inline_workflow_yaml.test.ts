/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID,
  KIBANA_WORKFLOW_INPUT_DEFINITION_REF_PREFIX,
} from '@kbn/workflows';
import { parse } from 'yaml';
import { INLINE_WORKFLOW_TAG } from '../constants';
import {
  buildInlineWorkflowYaml,
  InvalidInlineWorkflowError,
  stepTypeFromConnectorType,
} from './build_inline_workflow_yaml';
import type { InlineWorkflowActionDraft } from '../types';

const EXPECTED_TRIGGER = {
  type: 'manual',
  inputs: {
    type: 'object',
    properties: {
      payload: {
        $ref: `${KIBANA_WORKFLOW_INPUT_DEFINITION_REF_PREFIX}${ALERTING_V2_NOTIFICATION_GROUP_INPUT_DEFINITION_ID}`,
      },
    },
    required: ['payload'],
  },
};

const draft = (
  overrides: Partial<InlineWorkflowActionDraft> & {
    stepType?: string;
    stepName?: string;
    connectorId?: string | null;
    params?: string;
  } = {}
): InlineWorkflowActionDraft => {
  const {
    stepType = 'email',
    stepName = 'notify',
    connectorId = 'c1',
    params = 'to: ""\nsubject: ""\nmessage: ""',
    id = 't1',
    workflowName = 'Email notification',
    steps,
    ...rest
  } = overrides;

  return {
    id,
    source: 'inline',
    workflowName,
    steps: steps ?? [
      {
        id: `${id}-step`,
        stepType,
        stepName,
        connectorId,
        params,
      },
    ],
    ...rest,
  };
};

describe('buildInlineWorkflowYaml', () => {
  it('builds a valid email workflow YAML', () => {
    const yaml = buildInlineWorkflowYaml(
      draft({
        id: 't1',
        connectorId: 'my-email-connector',
        params: 'to: "ops@example.com"\nsubject: "Alert"\nmessage: "Body"',
      })
    );

    const parsed = parse(yaml);
    expect(parsed.enabled).toBe(true);
    expect(parsed.tags).toEqual([INLINE_WORKFLOW_TAG]);
    expect(parsed.triggers).toEqual([EXPECTED_TRIGGER]);
    expect(parsed.steps).toHaveLength(1);
    expect(parsed.steps[0]).toMatchObject({
      name: 'notify',
      type: 'email',
      'connector-id': 'my-email-connector',
      with: { to: 'ops@example.com', subject: 'Alert', message: 'Body' },
    });
  });

  it('builds a valid slack workflow YAML', () => {
    const yaml = buildInlineWorkflowYaml(
      draft({
        id: 't2',
        stepType: 'slack2.sendMessage',
        connectorId: 'my-slack-connector',
        params: 'channel: "my-channel"\ntext: "Hello {{ policyId }}"',
      })
    );

    const parsed = parse(yaml);
    expect(parsed.steps[0]).toMatchObject({
      type: 'slack2.sendMessage',
      'connector-id': 'my-slack-connector',
      with: { channel: 'my-channel', text: 'Hello {{ policyId }}' },
    });
  });

  it('uses a custom step name in the generated YAML', () => {
    const yaml = buildInlineWorkflowYaml(
      draft({
        id: 't-custom-name',
        stepName: 'Elasticsearch search',
      })
    );
    expect(parse(yaml).steps[0].name).toBe('Elasticsearch search');
  });

  it('uses the step definition label as the workflow name', () => {
    const yaml = buildInlineWorkflowYaml(draft({ id: 't3' }));
    expect(parse(yaml).name).toBe('Email notification');
  });

  it('uses a custom workflow name in the generated YAML', () => {
    const yaml = buildInlineWorkflowYaml(
      draft({
        id: 't-custom-workflow',
        workflowName: 'Team SRE notifications',
      })
    );
    expect(parse(yaml).name).toBe('Team SRE notifications');
  });

  it('builds YAML with multiple steps', () => {
    const yaml = buildInlineWorkflowYaml(
      draft({
        id: 't-multi',
        steps: [
          {
            id: 's1',
            stepType: 'email',
            stepName: 'email',
            connectorId: 'email-1',
            params: 'to: "a@example.com"\nsubject: "A"\nmessage: "B"',
          },
          {
            id: 's2',
            stepType: 'slack2.sendMessage',
            stepName: 'slack',
            connectorId: 'slack-1',
            params: 'channel: "alerts"\ntext: "hi"',
          },
        ],
      })
    );
    const parsed = parse(yaml);
    expect(parsed.steps).toHaveLength(2);
    expect(parsed.steps[0].type).toBe('email');
    expect(parsed.steps[1].type).toBe('slack2.sendMessage');
  });

  it('treats empty params as an empty `with` block', () => {
    const yaml = buildInlineWorkflowYaml(draft({ id: 't4', params: '' }));
    expect(parse(yaml).steps[0].with).toEqual({});
  });

  it('throws when the params YAML is malformed', () => {
    expect(() => buildInlineWorkflowYaml(draft({ id: 't5', params: 'to: [unclosed' }))).toThrow(
      InvalidInlineWorkflowError
    );
  });

  it('throws when params is not an object', () => {
    expect(() => buildInlineWorkflowYaml(draft({ id: 't6', params: '- one\n- two' }))).toThrow(
      InvalidInlineWorkflowError
    );
  });

  it('throws when no connector is selected', () => {
    expect(() => buildInlineWorkflowYaml(draft({ id: 't7', connectorId: null }))).toThrow(
      InvalidInlineWorkflowError
    );
  });

  it('throws when there are no steps', () => {
    expect(() => buildInlineWorkflowYaml(draft({ id: 't-empty', steps: [] }))).toThrow(
      InvalidInlineWorkflowError
    );
  });

  it('builds a valid slack v2 workflow YAML', () => {
    const yaml = buildInlineWorkflowYaml(
      draft({
        id: 't8',
        stepType: 'slack2.sendMessage',
        connectorId: 'my-slackv2-connector',
        params: 'channel: "channel"\ntext: "Hello {{ policyId }}"',
      })
    );

    const parsed = parse(yaml);
    expect(parsed.steps[0]).toMatchObject({
      type: 'slack2.sendMessage',
      'connector-id': 'my-slackv2-connector',
      with: { channel: 'channel', text: 'Hello {{ policyId }}' },
    });
  });
});

describe('stepTypeFromConnectorType', () => {
  it('returns the connector type ID without a leading dot', () => {
    expect(stepTypeFromConnectorType('.email')).toBe('email');
    expect(stepTypeFromConnectorType('slack')).toBe('slack');
  });

  it('returns the connector type ID with subAction if provided', () => {
    expect(stepTypeFromConnectorType('.slack2', 'sendMessage')).toBe('slack2.sendMessage');
    expect(stepTypeFromConnectorType('custom', 'doSomething')).toBe('custom.doSomething');
  });
});
