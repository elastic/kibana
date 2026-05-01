/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  groupConnectorsByActionType,
  formatConnectorsBlock,
  formatStepEntry,
} from './format_prefetched';
import type { ConnectorSummary, StepDefinitionSummary } from './types';

describe('groupConnectorsByActionType', () => {
  it('groups instances and collapses identical stepTypes per actionTypeId', () => {
    const connectors: ConnectorSummary[] = [
      {
        id: 'inf-claude',
        name: 'Claude',
        actionTypeId: '.inference',
        stepTypes: ['inference.completion', 'inference.rerank'],
      },
      {
        id: 'inf-gemini',
        name: 'Gemini',
        actionTypeId: '.inference',
        stepTypes: ['inference.completion', 'inference.rerank'],
      },
      {
        id: 'slack-1',
        name: 'Eng',
        actionTypeId: '.slack',
        stepTypes: ['slack'],
      },
    ];

    expect(groupConnectorsByActionType(connectors)).toEqual([
      {
        actionTypeId: '.inference',
        stepTypes: ['inference.completion', 'inference.rerank'],
        instances: [
          { id: 'inf-claude', name: 'Claude' },
          { id: 'inf-gemini', name: 'Gemini' },
        ],
      },
      {
        actionTypeId: '.slack',
        stepTypes: ['slack'],
        instances: [{ id: 'slack-1', name: 'Eng' }],
      },
    ]);
  });
});

describe('formatConnectorsBlock', () => {
  it('returns the empty-state string when no connectors are configured', () => {
    expect(formatConnectorsBlock([])).toBe(
      'No connectors are configured in the user environment.'
    );
  });

  it('renders one section per actionTypeId with shared step types and bulleted instances', () => {
    const connectors: ConnectorSummary[] = [
      {
        id: 'inf-claude',
        name: 'Claude',
        actionTypeId: '.inference',
        stepTypes: ['inference.completion', 'inference.rerank'],
      },
      {
        id: 'inf-gemini',
        name: 'Gemini',
        actionTypeId: '.inference',
        stepTypes: ['inference.completion', 'inference.rerank'],
      },
      {
        id: 'slack-1',
        name: 'Eng',
        actionTypeId: '.slack',
        stepTypes: ['slack'],
      },
    ];

    expect(formatConnectorsBlock(connectors)).toBe(
      [
        '### .inference',
        'Step types: inference.completion, inference.rerank',
        'Instances:',
        '  - inf-claude (Claude)',
        '  - inf-gemini (Gemini)',
        '',
        '### .slack',
        'Step types: slack',
        'Instances:',
        '  - slack-1 (Eng)',
      ].join('\n')
    );
  });
});

const step = (over: Partial<StepDefinitionSummary> = {}): StepDefinitionSummary => ({
  id: 'console',
  label: 'Console',
  description: 'Log a message',
  category: 'kibana',
  ...over,
});

describe('formatStepEntry', () => {
  it('drops the label when it is a Title-cased version of the id', () => {
    expect(formatStepEntry(step({ id: 'console', label: 'Console', description: 'Log a message' })))
      .toBe('- console — Log a message');
  });

  it('keeps the label when it differs from the id', () => {
    expect(
      formatStepEntry(
        step({ id: 'data.set', label: 'Set Variables', description: 'Set workflow variables' })
      )
    ).toBe('- data.set (Set Variables) — Set workflow variables');
  });

  it('omits the description when it equals the label', () => {
    // Label "Send Slack" differs from id "slack.send" (different words → label is kept).
    // Description "Send Slack" equals the label, so the description is dropped.
    expect(
      formatStepEntry(
        step({ id: 'slack.send', label: 'Send Slack', description: 'Send Slack' })
      )
    ).toBe('- slack.send (Send Slack)');
  });

  it('renders id-only when label is redundant and description is missing', () => {
    expect(formatStepEntry(step({ id: 'email', label: 'Email', description: undefined })))
      .toBe('- email');
  });

  it('handles the slack_api edge case (id with underscore vs label "Slack API")', () => {
    expect(formatStepEntry(step({ id: 'slack_api', label: 'Slack API', description: undefined })))
      .toBe('- slack_api');
  });
});
