/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  groupConnectorsByActionType,
  formatConnectorsBlock,
} from './format_prefetched';
import type { ConnectorSummary } from './types';

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
