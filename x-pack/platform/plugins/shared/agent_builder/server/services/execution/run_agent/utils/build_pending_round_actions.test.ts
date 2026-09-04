/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationRoundStatus,
  ConversationRoundStepType,
  createAskUserQuestionStep,
  type ConversationRound,
} from '@kbn/agent-builder-common';
import { AgentPromptType } from '@kbn/agent-builder-common/agents/prompts';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { AgentActionType } from '../actions';
import type { ToolCallAction } from '../actions';
import { buildPendingRoundActions } from './build_pending_round_actions';

describe('buildPendingRoundActions', () => {
  const baseRound = {
    id: 'r1',
    status: ConversationRoundStatus.awaitingPrompt,
    input: { message: '', attachments: [] },
    started_at: '2026-06-04T00:00:00.000Z',
    time_to_first_token: 0,
    time_to_last_token: 0,
    response: { message: '' },
  } as any;

  const sampleQuestion = {
    question: 'Pick color',
    options: [{ label: 'red' }, { label: 'blue' }],
    multi_select: false,
  };

  it('concatenates roundToActions output and pending ask_user_question actions, and returns consumedPromptIds', () => {
    const askStep = createAskUserQuestionStep({
      prompt_id: 's1',
      questions: [sampleQuestion],
    });
    const round: ConversationRound = {
      ...baseRound,
      steps: [askStep],
    };
    const promptState = {
      responses: {
        s1: {
          type: AgentPromptType.ask_user_question,
          response: { answers: [{ choice: [0] }] },
        },
      },
    } as any;

    const result = buildPendingRoundActions({
      round,
      promptState,
      toolIdMapping: new Map(),
      eventEmitter: jest.fn(),
    });

    expect(result.actions.length).toBeGreaterThanOrEqual(2);
    expect(result.consumedPromptIds).toEqual(['s1']);
  });

  it('restores previously answered ask_user_question steps before the current pending answers', () => {
    const answered = createAskUserQuestionStep({
      prompt_id: 's1',
      questions: [sampleQuestion],
      answers: [{ choice: [0] }],
    });
    const pending = createAskUserQuestionStep({
      prompt_id: 's2',
      questions: [
        {
          question: 'Pick size',
          options: [{ label: 'S' }, { label: 'L' }],
          multi_select: false,
        },
      ],
    });
    const round: ConversationRound = {
      ...baseRound,
      steps: [answered, pending],
    };
    const promptState = {
      responses: {
        s2: {
          type: AgentPromptType.ask_user_question,
          response: { answers: [{ choice: [1] }] },
        },
      },
    } as any;

    const result = buildPendingRoundActions({
      round,
      promptState,
      toolIdMapping: new Map(),
      eventEmitter: jest.fn(),
    });

    // 2 actions per ask wave (toolCall + executeTool) × 2 waves
    expect(result.actions).toHaveLength(4);
    expect(result.consumedPromptIds).toEqual(['s2']);

    const firstToolCall = result.actions[0];
    const secondToolCall = result.actions[2];
    expect(firstToolCall.type).toBe(AgentActionType.ToolCall);
    expect(secondToolCall.type).toBe(AgentActionType.ToolCall);
    if (firstToolCall.type === AgentActionType.ToolCall) {
      expect(firstToolCall.tool_calls[0].args).toEqual({ questions: answered.questions });
    }
    if (secondToolCall.type === AgentActionType.ToolCall) {
      expect(secondToolCall.tool_calls[0].args).toEqual({ questions: pending.questions });
    }
  });

  it('keeps interleaved tool calls and answered asks in step order before the pending prompt', () => {
    const answered = createAskUserQuestionStep({
      prompt_id: 's1',
      questions: [sampleQuestion],
      answers: [{ choice: [0] }],
    });
    const pending = createAskUserQuestionStep({
      prompt_id: 's2',
      questions: [
        {
          question: 'Pick size',
          options: [{ label: 'S' }, { label: 'L' }],
          multi_select: false,
        },
      ],
    });
    const toolResult = {
      tool_result_id: 'r1',
      type: ToolResultType.other,
      data: { some: 'data' },
    };
    const round: ConversationRound = {
      ...baseRound,
      steps: [
        {
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 'c1',
          tool_id: 'load_skill',
          params: { skill_id: 'rule-management' },
          results: [toolResult],
        },
        answered,
        {
          type: ConversationRoundStepType.toolCall,
          tool_call_id: 'c2',
          tool_id: 'search_rules',
          params: { query: 'logs-*' },
          results: [toolResult],
        },
        pending,
      ],
    };
    const promptState = {
      responses: {
        s2: {
          type: AgentPromptType.ask_user_question,
          response: { answers: [{ choice: [1] }] },
        },
      },
    } as any;

    const result = buildPendingRoundActions({
      round,
      promptState,
      toolIdMapping: new Map(),
      eventEmitter: jest.fn(),
    });

    // load_skill pair + answered ask pair + search_rules pair + pending ask pair
    expect(result.actions).toHaveLength(8);
    expect(result.consumedPromptIds).toEqual(['s2']);

    const toolCallIdsAndArgs = result.actions
      .filter((action): action is ToolCallAction => action.type === AgentActionType.ToolCall)
      .map((action) => ({
        toolCallId: action.tool_calls[0].toolCallId,
        toolName: action.tool_calls[0].toolName,
        args: action.tool_calls[0].args,
      }));

    expect(toolCallIdsAndArgs).toEqual([
      { toolCallId: 'c1', toolName: 'load_skill', args: { skill_id: 'rule-management' } },
      {
        toolCallId: expect.any(String),
        toolName: 'ask_user_question',
        args: { questions: answered.questions },
      },
      { toolCallId: 'c2', toolName: 'search_rules', args: { query: 'logs-*' } },
      {
        toolCallId: expect.any(String),
        toolName: 'ask_user_question',
        args: { questions: pending.questions },
      },
    ]);
  });
});
