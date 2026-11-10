/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolMessage } from '@langchain/core/messages';
import { agentStepAction, toolResultAction } from '../actions';
import type { StateType } from '../state';
import { buildMessagesFromActions } from './build_messages';

const buildState = (actions: StateType['actions']): StateType => ({
  nlQuery: 'q',
  additionalContext: undefined,
  additionalInstructions: undefined,
  workflowDefinition: undefined,
  maxRetries: 3,
  prefetched: { connectors: [], stepDefinitions: [], triggerDefinitions: [] },
  yaml: '',
  actions,
  validationAttempts: 0,
  validation: undefined,
});

const editRound = (id: string, yaml: string, diff: string) => [
  agentStepAction({
    toolCalls: [{ toolCallId: id, toolName: 'modify_step', args: {} }],
    text: '',
  }),
  toolResultAction({ toolCallId: id, name: 'modify_step', success: true, currentYaml: yaml, diff }),
];

const getToolResults = (state: StateType) =>
  buildMessagesFromActions(state)
    .filter((message): message is ToolMessage => message.getType() === 'tool')
    .map((message) => JSON.parse(message.content as string));

describe('buildMessagesFromActions', () => {
  it('keeps the full YAML only on the latest edit result', () => {
    const state = buildState([
      ...editRound('1', 'yaml v1', 'diff 1'),
      ...editRound('2', 'yaml v2', 'diff 2'),
      ...editRound('3', 'yaml v3', 'diff 3'),
    ]);

    const [first, second, third] = getToolResults(state);

    expect(first.currentWorkflowYaml).toBeUndefined();
    expect(first.currentWorkflowYamlOmitted).toContain('Superseded');
    expect(first.diff).toBe('diff 1');
    expect(second.currentWorkflowYaml).toBeUndefined();
    expect(second.diff).toBe('diff 2');
    expect(third.currentWorkflowYaml).toBe('yaml v3');
    expect(third.currentWorkflowYamlOmitted).toBeUndefined();
    expect(third.diff).toBe('diff 3');
  });

  it('keeps the full YAML on the latest edit result when a lookup follows it', () => {
    const state = buildState([
      ...editRound('1', 'yaml v1', 'diff 1'),
      agentStepAction({
        toolCalls: [{ toolCallId: '2', toolName: 'get_step_definitions', args: {} }],
        text: '',
      }),
      toolResultAction({ toolCallId: '2', name: 'get_step_definitions', success: true, data: {} }),
    ]);

    const [edit, lookup] = getToolResults(state);

    expect(edit.currentWorkflowYaml).toBe('yaml v1');
    expect(lookup.currentWorkflowYaml).toBeUndefined();
    expect(lookup.currentWorkflowYamlOmitted).toBeUndefined();
  });
});
