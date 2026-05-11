/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAIMessage } from '@langchain/core/messages';
import type { AIMessage } from '@langchain/core/messages';
import { AgentActionType } from '../../actions';
import type { ResearchAgentAction, ToolCallAction, ExecuteToolAction } from '../../actions';
import { formatResearcherActionHistory } from './actions';

const makeToolCallAction = (
  toolCalls: Array<{ toolCallId: string; toolName: string; args?: Record<string, any> }>,
  message?: string
): ToolCallAction => ({
  type: AgentActionType.ToolCall,
  tool_calls: toolCalls.map((tc) => ({
    toolCallId: tc.toolCallId,
    toolName: tc.toolName,
    args: tc.args ?? {},
  })),
  message,
});

const makeExecuteToolAction = (
  results: Array<{ toolCallId: string; content: string }>
): ExecuteToolAction => ({
  type: AgentActionType.ExecuteTool,
  tool_results: results.map((r) => ({
    toolCallId: r.toolCallId,
    content: r.content,
  })),
});

describe('formatResearcherActionHistory', () => {
  it('creates AIMessage with empty content when no message is set', () => {
    const actions: ResearchAgentAction[] = [
      makeToolCallAction([{ toolCallId: 'c1', toolName: 'search', args: { q: 'foo' } }]),
      makeExecuteToolAction([{ toolCallId: 'c1', content: 'result' }]),
    ];

    const messages = formatResearcherActionHistory({ actions, cycleLimit: 100 });

    const aiMsg = messages[0];
    expect(isAIMessage(aiMsg as AIMessage)).toBe(true);
    expect((aiMsg as AIMessage).content).toBe('');
  });

  it('sets AIMessage content to the action message when provided', () => {
    const actions: ResearchAgentAction[] = [
      makeToolCallAction(
        [{ toolCallId: 'c1', toolName: 'search', args: { q: 'foo' } }],
        'I need to search for foo'
      ),
      makeExecuteToolAction([{ toolCallId: 'c1', content: 'result' }]),
    ];

    const messages = formatResearcherActionHistory({ actions, cycleLimit: 100 });

    const aiMsg = messages[0];
    expect(isAIMessage(aiMsg as AIMessage)).toBe(true);
    expect((aiMsg as AIMessage).content).toBe('I need to search for foo');
  });

  it('preserves tool call args in the AIMessage', () => {
    const actions: ResearchAgentAction[] = [
      makeToolCallAction([
        { toolCallId: 'c1', toolName: 'search', args: { q: 'foo' } },
        { toolCallId: 'c2', toolName: 'lookup', args: { id: 42 } },
      ]),
      makeExecuteToolAction([
        { toolCallId: 'c1', content: 'result1' },
        { toolCallId: 'c2', content: 'result2' },
      ]),
    ];

    const messages = formatResearcherActionHistory({ actions, cycleLimit: 100 });

    const aiMsg = messages[0] as AIMessage;
    expect(aiMsg.tool_calls).toHaveLength(2);
    expect(aiMsg.tool_calls![0].args).toEqual({ q: 'foo' });
    expect(aiMsg.tool_calls![1].args).toEqual({ id: 42 });
  });
});
