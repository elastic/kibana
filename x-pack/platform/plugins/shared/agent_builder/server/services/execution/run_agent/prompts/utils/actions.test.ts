/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isAIMessage, isHumanMessage } from '@langchain/core/messages';
import type { AIMessage } from '@langchain/core/messages';
import { AgentActionType } from '../../actions';
import type {
  ResearchAgentAction,
  ToolCallAction,
  ExecuteToolAction,
  BackgroundExecutionCompleteAction,
} from '../../actions';
import { formatResearcherActionHistory, formatSystemNotice } from './actions';
import { ExecutionStatus } from '@kbn/agent-builder-common';
import type { BackgroundExecutionState } from '@kbn/agent-builder-common/chat';

const makeToolCallAction = (
  toolCalls: Array<{ toolCallId: string; toolName: string; args?: Record<string, any> }>,
  message?: string
): ToolCallAction => ({
  type: AgentActionType.ToolCall,
  tool_call_group_id: 'tool_call_group_id',
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

const makeCompletedExecution = (
  overrides: Partial<BackgroundExecutionState> = {}
): BackgroundExecutionState => ({
  execution_id: 'exec-123',
  status: ExecutionStatus.completed,
  response: { message: 'The task is done.' },
  completed_at: { round_id: 'round-1' },
  ...overrides,
});

const makeFailedExecution = (
  overrides: Partial<BackgroundExecutionState> = {}
): BackgroundExecutionState => ({
  execution_id: 'exec-456',
  status: ExecutionStatus.failed,
  error: { code: 'internalError' as any, message: 'LLM timeout' },
  completed_at: { round_id: 'round-1' },
  ...overrides,
});

const makeBackgroundExecutionCompleteAction = (
  execution: BackgroundExecutionState
): BackgroundExecutionCompleteAction => ({
  type: AgentActionType.BackgroundExecutionComplete,
  execution,
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

  it('formats BackgroundExecutionCompleteAction as a user message with system notice', () => {
    const actions: ResearchAgentAction[] = [
      makeToolCallAction([{ toolCallId: 'c1', toolName: 'search' }]),
      makeExecuteToolAction([{ toolCallId: 'c1', content: 'result' }]),
      makeBackgroundExecutionCompleteAction(makeCompletedExecution()),
    ];

    const messages = formatResearcherActionHistory({ actions, cycleLimit: 100 });

    // Tool call (AI) + tool result + background notice (user message)
    const lastMessage = messages[messages.length - 1];
    expect(isHumanMessage(lastMessage as any)).toBe(true);
    expect((lastMessage as any).content).toContain('<system_notice>');
    expect((lastMessage as any).content).toContain('exec-123');
  });

  it('formats failed BackgroundExecutionCompleteAction as a user message', () => {
    const actions: ResearchAgentAction[] = [
      makeBackgroundExecutionCompleteAction(makeFailedExecution()),
    ];

    const messages = formatResearcherActionHistory({ actions, cycleLimit: 100 });

    expect(messages).toHaveLength(1);
    expect(isHumanMessage(messages[0] as any)).toBe(true);
    expect((messages[0] as any).content).toContain('has failed');
    expect((messages[0] as any).content).toContain('LLM timeout');
  });
});

describe('formatSystemNotice', () => {
  it('formats a completed execution as a system notice with result', () => {
    const notice = formatSystemNotice(makeCompletedExecution());

    expect(notice).toContain('<system_notice>');
    expect(notice).toContain('</system_notice>');
    expect(notice).toContain('<execution-id>exec-123</execution-id>');
    expect(notice).toContain('<status>completed</status>');
    expect(notice).toContain('<result>The task is done.</result>');
    expect(notice).not.toContain('<error>');
  });

  it('formats a failed execution as a system notice with error', () => {
    const notice = formatSystemNotice(makeFailedExecution());

    expect(notice).toContain('<system_notice>');
    expect(notice).toContain('has failed');
    expect(notice).toContain('<execution-id>exec-456</execution-id>');
    expect(notice).toContain('<status>failed</status>');
    expect(notice).toContain('<error>LLM timeout</error>');
    expect(notice).not.toContain('<result>');
  });

  it('uses "No response" when completed execution has no response', () => {
    const notice = formatSystemNotice(makeCompletedExecution({ response: undefined }));

    expect(notice).toContain('<result>No response</result>');
  });
});
