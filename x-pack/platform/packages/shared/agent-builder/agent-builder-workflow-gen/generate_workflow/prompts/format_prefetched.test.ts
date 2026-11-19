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
  collapseSubActionFamilies,
  bucketStepsBySection,
  formatStepDefinitionsBlock,
  formatTriggersBlock,
} from './format_prefetched';
import type { ConnectorSummary, StepDefinitionSummary, TriggerDefinitionSummary } from '../types';

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
    expect(formatConnectorsBlock([])).toBe('No connectors are configured in the user environment.');
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
    expect(
      formatStepEntry(step({ id: 'console', label: 'Console', description: 'Log a message' }))
    ).toBe('- console — Log a message');
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
      formatStepEntry(step({ id: 'slack.send', label: 'Send Slack', description: 'Send Slack' }))
    ).toBe('- slack.send (Send Slack)');
  });

  it('renders id-only when label is redundant and description is missing', () => {
    expect(formatStepEntry(step({ id: 'email', label: 'Email', description: undefined }))).toBe(
      '- email'
    );
  });

  it('handles the slack_api edge case (id with underscore vs label "Slack API")', () => {
    expect(
      formatStepEntry(step({ id: 'slack_api', label: 'Slack API', description: undefined }))
    ).toBe('- slack_api');
  });

  it('drops a label that is a substring of the id (e.g. "Break" inside "loop.break")', () => {
    expect(
      formatStepEntry(
        step({ id: 'loop.break', label: 'Break', description: 'Exit the enclosing loop' })
      )
    ).toBe('- loop.break — Exit the enclosing loop');
  });

  it('strips trailing parentheticals from labels like "Loop (foreach)"', () => {
    expect(
      formatStepEntry(
        step({ id: 'foreach', label: 'Loop (foreach)', description: 'Loop over a list' })
      )
    ).toBe('- foreach (Loop) — Loop over a list');
  });

  it('does NOT strip a parenthetical when its content does not equal the id (e.g. "(Async)")', () => {
    expect(
      formatStepEntry(
        step({
          id: 'workflow.executeAsync',
          label: 'Execute Workflow (Async)',
          description: 'Start another workflow without waiting',
        })
      )
    ).toBe(
      '- workflow.executeAsync (Execute Workflow (Async)) — Start another workflow without waiting'
    );
  });

  it('keeps a label that adds context beyond the id (id is contained in the label)', () => {
    expect(
      formatStepEntry(step({ id: 'teams', label: 'Microsoft Teams', description: undefined }))
    ).toBe('- teams (Microsoft Teams)');
  });

  it('keeps a label like "ServiceNow ITSM" when only the id is contained in it', () => {
    expect(
      formatStepEntry(step({ id: 'servicenow', label: 'ServiceNow ITSM', description: undefined }))
    ).toBe('- servicenow (ServiceNow ITSM)');
  });
});

describe('collapseSubActionFamilies', () => {
  const mkStep = (id: string): StepDefinitionSummary => ({
    id,
    label: id,
    category: 'external',
  });

  it('keeps small families enumerated', () => {
    const steps = ['slack', 'slack_api', 'email'].map(mkStep);

    expect(collapseSubActionFamilies(steps, 5)).toEqual({
      enumerated: steps,
      collapsed: [],
    });
  });

  it('collapses families with more than threshold sub-actions', () => {
    const githubIds = Array.from({ length: 10 }).map((_, i) => `github.action${i}`);
    const slackIds = ['slack', 'slack_api'];
    const steps = [...githubIds, ...slackIds].map(mkStep);

    const result = collapseSubActionFamilies(steps, 5);
    expect(result.enumerated.map((s) => s.id)).toEqual(['slack', 'slack_api']);
    expect(result.collapsed).toEqual([{ prefix: 'github', count: 10 }]);
  });

  it('treats top-level (no dot) entries each as their own prefix family of 1', () => {
    const steps = ['email', 'slack', 'console'].map(mkStep);
    expect(collapseSubActionFamilies(steps, 5).enumerated.map((s) => s.id)).toEqual([
      'email',
      'slack',
      'console',
    ]);
  });
});

describe('bucketStepsBySection', () => {
  const sample: StepDefinitionSummary[] = [
    { id: 'if', label: 'If', description: 'Conditional', category: 'flowControl' },
    { id: 'foreach', label: 'Loop', description: 'Loop', category: 'flowControl' },
    { id: 'data.set', label: 'Set Variables', description: 'Set vars', category: 'data' },
    { id: 'ai.prompt', label: 'AI Prompt', description: 'Prompt', category: 'ai' },
    {
      id: 'cases.createCase',
      label: 'Create case',
      description: 'Create',
      category: 'kibana.cases',
    },
    { id: 'console', label: 'Console', description: 'Log', category: 'kibana' },
    { id: 'slack', label: 'Slack', description: 'Slack', category: 'external' },
    { id: 'github.foo', label: 'GitHub', description: 'GH', category: 'external' },
  ];

  it('returns sections in priority order, omitting empty ones', () => {
    const sections = bucketStepsBySection(sample).map((s) => s.title);
    expect(sections).toEqual([
      'Control flow',
      'Data manipulation',
      'AI',
      'Cases',
      'Logging / Diagnostics',
      'Connector steps',
    ]);
  });

  it('drops empty sections', () => {
    const noControl = sample.filter((s) => s.category !== 'flowControl');
    const sections = bucketStepsBySection(noControl).map((s) => s.title);
    expect(sections).not.toContain('Control flow');
  });
});

describe('formatStepDefinitionsBlock', () => {
  it('only collapses families inside the Connector steps section', () => {
    const githubIds = Array.from({ length: 8 }).map((_, i) => `github.x${i}`);
    const dataIds = Array.from({ length: 11 }).map((_, i) => `data.op${i}`);
    const steps: StepDefinitionSummary[] = [
      { id: 'if', label: 'If', description: 'Conditional', category: 'flowControl' },
      ...dataIds.map((id) => ({ id, label: id, category: 'data' as const })),
      { id: 'console', label: 'Console', description: 'Log', category: 'kibana' },
      { id: 'slack', label: 'Slack', description: undefined, category: 'external' },
      ...githubIds.map((id) => ({ id, label: id, category: 'external' as const })),
    ];

    const out = formatStepDefinitionsBlock(steps);

    expect(out).toContain('### Control flow');
    expect(out).toContain('- if — Conditional');
    // Data manipulation never collapses, even with 11 entries.
    expect(out).toContain('### Data manipulation');
    expect(out).toContain('- data.op0');
    expect(out).toContain('- data.op10');
    expect(out).not.toMatch(/data\.\* \(/);
    // Logging keeps console.
    expect(out).toContain('### Logging / Diagnostics');
    expect(out).toContain('- console — Log');
    // Connector steps: singletons enumerate, families collapse, no search hint.
    expect(out).toContain('### Connector steps');
    expect(out).toContain('- slack');
    expect(out).toContain('- github.* (8 actions)');
    expect(out).not.toMatch(/github\.x0/);
    expect(out).not.toMatch(/search="github"/);
  });

  it('collapses any connector multi-action family with the default threshold (≥2)', () => {
    const steps: StepDefinitionSummary[] = [
      { id: 'aws_lambda.invoke', label: 'AWS Lambda', category: 'external' },
      { id: 'aws_lambda.listFunctions', label: 'AWS Lambda', category: 'external' },
      { id: 'slack', label: 'Slack', category: 'external' },
    ];

    const out = formatStepDefinitionsBlock(steps);

    expect(out).toContain('- aws_lambda.* (2 actions)');
    expect(out).not.toContain('aws_lambda.invoke');
    expect(out).toContain('- slack');
  });
});

describe('formatTriggersBlock', () => {
  const trigger = (over: Partial<TriggerDefinitionSummary> = {}): TriggerDefinitionSummary => ({
    id: 'manual',
    label: 'Manual',
    description: 'Trigger manually',
    ...over,
  });

  it('drops the redundant label and renders one bullet per trigger', () => {
    const out = formatTriggersBlock([
      trigger({ id: 'manual', label: 'Manual', description: 'Trigger manually' }),
      trigger({ id: 'scheduled', label: 'Scheduled', description: 'On a recurring schedule' }),
    ]);

    expect(out).toBe(
      ['- manual — Trigger manually', '- scheduled — On a recurring schedule'].join('\n')
    );
  });
});
