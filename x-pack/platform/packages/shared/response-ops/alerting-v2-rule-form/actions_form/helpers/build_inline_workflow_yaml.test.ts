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
import type { InlineWorkflowActionDraft } from '../types';
import {
  buildInlineWorkflowYaml,
  InvalidInlineWorkflowError,
  stepTypeFromConnectorType,
} from './build_inline_workflow_yaml';

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

describe('buildInlineWorkflowYaml', () => {
  it('builds a valid email workflow YAML', () => {
    const yaml = buildInlineWorkflowYaml({
      id: 't1',
      source: 'inline',
      stepType: 'email',
      connectorId: 'my-email-connector',
      params: 'to:\n  - "ops@example.com"\nsubject: "Alert"\nmessage: "Body"',
    });

    const parsed = parse(yaml);
    expect(parsed.enabled).toBe(true);
    expect(parsed.tags).toEqual([INLINE_WORKFLOW_TAG]);
    expect(parsed.triggers).toEqual([EXPECTED_TRIGGER]);
    expect(parsed.steps).toHaveLength(1);
    expect(parsed.steps[0]).toMatchObject({
      name: 'notify',
      type: 'email',
      'connector-id': 'my-email-connector',
      with: { to: ['ops@example.com'], subject: 'Alert', message: 'Body' },
    });
  });

  it('builds a valid slack workflow YAML', () => {
    const yaml = buildInlineWorkflowYaml({
      id: 't2',
      source: 'inline',
      stepType: 'slack2.sendMessage',
      connectorId: 'my-slack-connector',
      params: 'channel: "my-channel"\ntext: "Hello {{ policyId }}"',
    });

    const parsed = parse(yaml);
    expect(parsed.steps[0]).toMatchObject({
      type: 'slack2.sendMessage',
      'connector-id': 'my-slack-connector',
      with: { channel: 'my-channel', text: 'Hello {{ policyId }}' },
    });
  });

  it('uses the step definition label as the workflow name', () => {
    const yaml = buildInlineWorkflowYaml({
      id: 't3',
      source: 'inline',
      stepType: 'email',
      connectorId: 'c1',
      params: 'to:\n  - ops@example.com\nsubject: Alert\nmessage: Body',
    });
    expect(parse(yaml).name).toMatch(/notification/i);
  });

  describe('invalid drafts', () => {
    const build = (overrides: Partial<InlineWorkflowActionDraft>) =>
      buildInlineWorkflowYaml({
        id: 't',
        source: 'inline',
        stepType: 'email',
        connectorId: 'c1',
        params: 'to:\n  - ops@example.com\nsubject: Alert\nmessage: Body',
        ...overrides,
      });

    it.each([
      ['no connector is selected', { connectorId: null }],
      ['params are empty', { params: '' }],
      ['params are malformed YAML', { params: 'to: [unclosed' }],
      ['params are not an object', { params: '- one\n- two' }],
      ['a mandatory field is missing', { params: 'to:\n  - ops@example.com\nsubject: Alert' }],
    ])('throws when %s', (_, overrides) => {
      expect(() => build(overrides)).toThrow(InvalidInlineWorkflowError);
    });

    it('includes the validation reasons in the error message', () => {
      expect(() =>
        build({ stepType: 'slack2.sendMessage', params: 'channel: C1\nfoo: bar' })
      ).toThrow("'text' is required. Unknown field: 'foo'.");
    });
  });

  it('builds a valid slack v2 workflow YAML', () => {
    const yaml = buildInlineWorkflowYaml({
      id: 't8',
      source: 'inline',
      stepType: 'slack2.sendMessage',
      connectorId: 'my-slackv2-connector',
      params: 'channel: "channel"\ntext: "Hello {{ policyId }}"',
    });

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
