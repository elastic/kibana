/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStatus, type ConversationRound } from '@kbn/agent-builder-common';
import {
  AgentPromptType,
  type PromptRequest,
  type PromptStorageState,
} from '@kbn/agent-builder-common/agents/prompts';
import { pendingBrowserToolPromptsToActions } from './pending_browser_tool_prompts_to_actions';
import { AgentActionType } from '../actions';

const browserToolPrompt = (id: string, toolId = 'get_time_range'): PromptRequest => ({
  type: AgentPromptType.browser_tool_call,
  id,
  tool_id: toolId,
  params: { verbose: true },
});

const makeRound = (...pendingPrompts: PromptRequest[]): ConversationRound =>
  ({
    id: 'r1',
    status: ConversationRoundStatus.awaitingPrompt,
    input: { message: '', attachments: [] },
    started_at: '2026-06-04T00:00:00.000Z',
    time_to_first_token: 0,
    time_to_last_token: 0,
    response: { message: '' },
    steps: [],
    pending_prompts: pendingPrompts,
  } as unknown as ConversationRound);

describe('pendingBrowserToolPromptsToActions', () => {
  it('emits a toolCall + executeTool action pair carrying the result the browser reported', () => {
    const round = makeRound(browserToolPrompt('p1'));
    const promptState: PromptStorageState = {
      responses: {
        p1: {
          type: AgentPromptType.browser_tool_call,
          response: { result: '{"from":"now-15m","to":"now"}' },
        },
      },
    };

    const result = pendingBrowserToolPromptsToActions({ round, promptState });

    expect(result.actions).toHaveLength(2);
    const [toolCallAction, executeToolAction] = result.actions as any[];
    expect(toolCallAction.type).toBe(AgentActionType.ToolCall);
    expect(toolCallAction.tool_calls[0].toolName).toBe('browser_get_time_range');
    expect(toolCallAction.tool_calls[0].args).toEqual({ verbose: true });
    expect(executeToolAction.type).toBe(AgentActionType.ExecuteTool);
    expect(executeToolAction.tool_results[0].content).toBe('{"from":"now-15m","to":"now"}');
    expect(toolCallAction.tool_calls[0].toolCallId).toBe(
      executeToolAction.tool_results[0].toolCallId
    );
    expect(result.consumedPromptIds).toEqual(['p1']);
  });

  it('surfaces the failure to the model when the browser reported an error', () => {
    const round = makeRound(browserToolPrompt('p1'));
    const promptState: PromptStorageState = {
      responses: {
        p1: {
          type: AgentPromptType.browser_tool_call,
          response: { error: 'Timed out after 30000ms.' },
        },
      },
    };

    const result = pendingBrowserToolPromptsToActions({ round, promptState });

    const [, executeToolAction] = result.actions as any[];
    expect(executeToolAction.tool_results[0].content).toBe(
      JSON.stringify({ error: 'Timed out after 30000ms.' })
    );
  });

  it('handles one pair per pending prompt', () => {
    const round = makeRound(browserToolPrompt('p1', 'tool_a'), browserToolPrompt('p2', 'tool_b'));
    const promptState: PromptStorageState = {
      responses: {
        p1: { type: AgentPromptType.browser_tool_call, response: { result: '1' } },
        p2: { type: AgentPromptType.browser_tool_call, response: { result: '2' } },
      },
    };

    const result = pendingBrowserToolPromptsToActions({ round, promptState });

    expect(result.actions).toHaveLength(4);
    expect(result.consumedPromptIds).toEqual(['p1', 'p2']);
    // Pairs must stay adjacent: the prompt formatter drops a tool call that is not
    // immediately followed by its result.
    expect(result.actions.map((action) => action.type)).toEqual([
      AgentActionType.ToolCall,
      AgentActionType.ExecuteTool,
      AgentActionType.ToolCall,
      AgentActionType.ExecuteTool,
    ]);
  });

  it('ignores prompts of other types', () => {
    const round = makeRound({
      type: AgentPromptType.confirmation,
      id: 'c1',
    } as PromptRequest);

    const result = pendingBrowserToolPromptsToActions({ round, promptState: { responses: {} } });

    expect(result.actions).toEqual([]);
    expect(result.consumedPromptIds).toEqual([]);
  });

  it('returns nothing when the round has no pending prompts', () => {
    const result = pendingBrowserToolPromptsToActions({
      round: makeRound(),
      promptState: { responses: {} },
    });

    expect(result.actions).toEqual([]);
  });

  it('throws when no response was submitted for a pending prompt', () => {
    const round = makeRound(browserToolPrompt('p1'));

    expect(() =>
      pendingBrowserToolPromptsToActions({ round, promptState: { responses: {} } })
    ).toThrow(/No browser_tool_call response found in prompt state for prompt_id p1/);
  });
});
