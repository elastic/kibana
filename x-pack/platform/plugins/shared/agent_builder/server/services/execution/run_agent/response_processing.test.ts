/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIMessageChunk, ToolMessage } from '@langchain/core/messages';
import { ConversationRoundStepType } from '@kbn/agent-builder-common';
import { AgentExecutionErrorCode } from '@kbn/agent-builder-common/agents';
import { AgentPromptType } from '@kbn/agent-builder-common/agents/prompts';
import { internalTools } from '@kbn/agent-builder-common/tools';
import type { ToolManager } from '@kbn/agent-builder-server/runner';
import {
  processResearchResponse,
  processStructuredAnswerResponse,
  processToolNodeResponse,
} from './response_processing';

const toolManager = {
  getToolIdMapping: () =>
    new Map([
      ['my_tool', 'my.tool'],
      ['browser_open', 'browser_open'],
    ]),
  getToolMeta: (toolId: string) =>
    toolId === 'my.tool'
      ? { origin: 'builtin', type: 'builtin' }
      : { origin: undefined, type: undefined },
} as unknown as ToolManager;

const withErrCode = (errCode: AgentExecutionErrorCode) =>
  expect.objectContaining({ meta: expect.objectContaining({ errCode }) });

describe('processResearchResponse', () => {
  it('produces a handover when there are no tool calls', () => {
    const turn = processResearchResponse(new AIMessageChunk({ content: 'done' }), {
      cycle: 1,
      toolManager,
    });
    expect(turn.outcome).toEqual({ type: 'handover', message: 'done', forceful: false });
    expect(turn.stepUpdates).toEqual([]);
    expect(turn.pendingToolCallIds).toEqual([]);
  });

  it('produces a retry_error on empty responses', () => {
    const turn = processResearchResponse(new AIMessageChunk({ content: '' }), {
      cycle: 1,
      toolManager,
    });
    expect(turn.outcome).toMatchObject({
      type: 'retry_error',
      error: { meta: { errCode: AgentExecutionErrorCode.emptyResponse } },
    });
  });

  it('emits group reasoning, per-call reasoning and tool call steps in model order', () => {
    const message = new AIMessageChunk({
      content: 'Let me look.',
      tool_calls: [
        { id: 'c1', name: 'my_tool', args: { _reasoning: 'why c1', q: 1 } },
        { id: 'c2', name: 'my_tool', args: { q: 2 } },
      ],
    });
    const turn = processResearchResponse(message, { cycle: 3, toolManager });
    expect(turn.outcome).toMatchObject({
      type: 'tool_calls',
      toolCalls: [
        { toolCallId: 'c1', toolName: 'my_tool', args: { q: 1 }, reasoning: 'why c1' },
        { toolCallId: 'c2', toolName: 'my_tool', args: { q: 2 } },
      ],
    });
    const groupId = (turn.outcome as { toolCallGroupId: string }).toolCallGroupId;
    expect(turn.stepUpdates).toEqual([
      {
        type: 'append',
        step: {
          type: ConversationRoundStepType.reasoning,
          reasoning: 'Let me look.',
          tool_call_group_id: groupId,
        },
      },
      {
        type: 'append',
        step: {
          type: ConversationRoundStepType.reasoning,
          reasoning: 'why c1',
          tool_call_id: 'c1',
          tool_call_group_id: groupId,
        },
      },
      {
        type: 'append_tool_call',
        step: {
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 'c1',
          tool_id: 'my.tool',
          params: { q: 1 },
          results: [],
          progression: [],
          tool_call_group_id: groupId,
          tool_origin: 'builtin',
          tool_type: 'builtin',
        },
      },
      {
        type: 'append_tool_call',
        step: expect.objectContaining({ tool_call_id: 'c2', params: { q: 2 } }),
      },
    ]);
    expect(turn.renderState).toEqual({
      c1: { toolName: 'my_tool', kind: 'server', cycle: 3 },
      c2: { toolName: 'my_tool', kind: 'server', cycle: 3 },
    });
    expect(turn.pendingToolCallIds).toEqual(['c1', 'c2']);
  });

  it('creates a runtime-only browser step and flags it as a browser call', () => {
    const message = new AIMessageChunk({
      content: '',
      tool_calls: [{ id: 'b1', name: 'browser_open', args: { url: 'x' } }],
    });
    const turn = processResearchResponse(message, { cycle: 1, toolManager });
    expect(turn.stepUpdates).toEqual([
      {
        type: 'append_tool_call',
        step: expect.objectContaining({
          tool_call_id: 'b1',
          tool_id: 'open',
          params: { url: 'x' },
        }),
      },
    ]);
    expect(turn.renderState.b1).toMatchObject({ toolName: 'browser_open', kind: 'browser' });
  });

  it('creates a runtime-only step for ask_user_question flagged as a dedicated call', () => {
    const askName = internalTools.askUserQuestion.replace(/\./g, '_');
    const manager = {
      getToolIdMapping: () => new Map([[askName, internalTools.askUserQuestion]]),
      getToolMeta: () => ({ origin: undefined, type: undefined }),
    } as unknown as ToolManager;
    const message = new AIMessageChunk({
      content: '',
      tool_calls: [{ id: 'a1', name: askName, args: {} }],
    });
    const turn = processResearchResponse(message, { cycle: 1, toolManager: manager });
    expect(turn.stepUpdates).toEqual([
      {
        type: 'append_tool_call',
        step: expect.objectContaining({
          tool_call_id: 'a1',
          tool_id: internalTools.askUserQuestion,
        }),
      },
    ]);
    expect(turn.renderState.a1).toMatchObject({ toolName: askName, kind: 'dedicated' });
    expect(turn.pendingToolCallIds).toEqual(['a1']);
  });

  it('throws invalidState on duplicate tool_call_id', () => {
    const message = new AIMessageChunk({
      content: '',
      tool_calls: [
        { id: 'dup', name: 'my_tool', args: {} },
        { id: 'dup', name: 'my_tool', args: {} },
      ],
    });
    expect(() => processResearchResponse(message, { cycle: 1, toolManager })).toThrow(
      withErrCode(AgentExecutionErrorCode.invalidState)
    );
  });
});

describe('processToolNodeResponse', () => {
  const deps = {
    cycle: 2,
    drainProgress: () => [{ message: 'p' }],
    toolIdFor: () => 'my.tool',
  };

  it('resolves completed calls with results, content and progression', () => {
    // `extractToolReturn` reads results from the structured artifact, never from the content string
    const artifact = { results: [{ type: 'other', data: { ok: true } }] };
    const content = JSON.stringify(artifact);
    const turn = processToolNodeResponse(
      [new ToolMessage({ tool_call_id: 'c1', content, artifact })],
      deps
    );
    expect(turn.stepUpdates).toEqual([
      {
        type: 'resolve_tool_call',
        toolCallId: 'c1',
        toolId: 'my.tool',
        results: [{ type: 'other', data: { ok: true } }],
        progression: [{ message: 'p' }],
      },
    ]);
    expect(turn.renderState).toEqual({ c1: { content, cycle: 2 } });
    expect(turn.completedToolCallIds).toEqual(['c1']);
    expect(turn.prompts).toEqual([]);
  });

  it('turns interrupt artifacts into prompts and ask prompts into question steps', () => {
    const askPrompt = {
      id: 'p1',
      type: AgentPromptType.ask_user_question,
      questions: [{ question: 'Which?', options: [{ label: 'a' }], multi_select: false }],
    };
    const confirm = { id: 'p2', type: AgentPromptType.confirmation, title: 't', message: 'm' };
    const turn = processToolNodeResponse(
      [
        new ToolMessage({ tool_call_id: 'a1', content: '', artifact: { prompt: askPrompt } }),
        new ToolMessage({ tool_call_id: 'c1', content: '', artifact: { prompt: confirm } }),
      ],
      deps
    );
    expect(turn.prompts).toEqual([
      { toolCallId: 'a1', prompt: askPrompt },
      { toolCallId: 'c1', prompt: confirm },
    ]);
    expect(turn.stepUpdates).toEqual([
      {
        type: 'upsert_question',
        step: {
          type: ConversationRoundStepType.askUserQuestion,
          prompt_id: 'p1',
          questions: askPrompt.questions,
        },
      },
    ]);
    expect(turn.completedToolCallIds).toEqual([]);
  });

  it('strips the LangGraph error suffix and falls back to an empty result list', () => {
    const turn = processToolNodeResponse(
      [new ToolMessage({ tool_call_id: 'c1', content: 'boom\n Please fix your mistakes.' })],
      deps
    );
    expect(turn.stepUpdates[0]).toMatchObject({ type: 'resolve_tool_call', results: [] });
    expect(turn.renderState.c1?.content).toBe('boom');
  });

  it('resolves a schema-validation failure (no artifact, "Error:" content) as an error result', () => {
    // This is what ToolNode returns for an ask_user_question call with invalid arguments: no
    // interrupt, no artifact. It must resolve the (runtime-only) step so the model sees the error.
    const turn = processToolNodeResponse(
      [
        new ToolMessage({
          tool_call_id: 'a1',
          content: 'Error: Received tool input did not match expected schema',
        }),
      ],
      { ...deps, toolIdFor: () => internalTools.askUserQuestion }
    );
    expect(turn.stepUpdates).toEqual([
      expect.objectContaining({
        type: 'resolve_tool_call',
        toolCallId: 'a1',
        toolId: internalTools.askUserQuestion,
        results: [expect.objectContaining({ type: 'error' })],
      }),
    ]);
    expect(turn.prompts).toEqual([]);
    expect(turn.completedToolCallIds).toEqual(['a1']);
  });
});

describe('processStructuredAnswerResponse', () => {
  it('returns a structured_answer for non-empty objects', () => {
    expect(processStructuredAnswerResponse({ a: 1 })).toEqual({
      type: 'structured_answer',
      data: { a: 1 },
    });
  });

  it('returns retry_error with the existing messages for empty objects and non-objects', () => {
    expect(processStructuredAnswerResponse({})).toMatchObject({
      type: 'retry_error',
      error: {
        message: 'agent returned an empty structured response',
        meta: { errCode: AgentExecutionErrorCode.emptyResponse },
      },
    });
    expect(processStructuredAnswerResponse(null)).toMatchObject({
      type: 'retry_error',
      error: {
        message: 'agent returned an invalid structured response',
        meta: { errCode: AgentExecutionErrorCode.emptyResponse },
      },
    });
  });
});
