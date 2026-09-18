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
  type ConversationRoundStep,
  type ReasoningStep,
  type ToolCallStep,
} from '@kbn/agent-builder-common';
import type { ToolResult } from '@kbn/agent-builder-common/tools/tool_result';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ToolIdMapping } from '@kbn/agent-builder-genai-utils/langchain';
import { roundToActions } from './round_to_actions';
import { AgentActionType } from '../actions';
import type { ToolCallAction, ExecuteToolAction } from '../actions';
import { materializeAskUserQuestionToolCall } from './ask_user_question_tool_call';

const makeToolCallStep = (
  toolCallId: string,
  toolId: string,
  {
    groupId,
    params = {},
    results = [],
  }: { groupId?: string; params?: Record<string, any>; results?: ToolResult[] } = {}
): ToolCallStep => ({
  type: ConversationRoundStepType.toolCall,
  tool_call_id: toolCallId,
  tool_id: toolId,
  params,
  results,
  ...(groupId ? { tool_call_group_id: groupId } : {}),
});

const makeReasoningStep = (
  reasoning: string,
  { toolCallId, toolCallGroupId }: { toolCallId?: string; toolCallGroupId?: string } = {}
): ReasoningStep => ({
  type: ConversationRoundStepType.reasoning,
  reasoning,
  ...(toolCallId ? { tool_call_id: toolCallId } : {}),
  ...(toolCallGroupId ? { tool_call_group_id: toolCallGroupId } : {}),
});

const makeRound = (steps: ConversationRoundStep[]): ConversationRound => ({
  id: 'round-1',
  status: ConversationRoundStatus.completed,
  input: { message: 'test' },
  steps,
  response: { message: 'done' },
  started_at: new Date().toISOString(),
  time_to_first_token: 0,
  time_to_last_token: 0,
  model_usage: { connector_id: 'test', llm_calls: 1, input_tokens: 10, output_tokens: 20 },
});

const toolIdMapping: ToolIdMapping = new Map([
  ['search', 'search'],
  ['lookup', 'lookup'],
]);

const someResult: ToolResult = {
  tool_result_id: 'r1',
  type: ToolResultType.other,
  data: { some: 'data' },
};

describe('roundToActions', () => {
  it('returns tool call and execute actions for completed steps without reasoning', () => {
    const steps: ConversationRoundStep[] = [
      makeToolCallStep('c1', 'search', { results: [someResult] }),
    ];
    const actions = roundToActions({ round: makeRound(steps), toolIdMapping });

    expect(actions).toHaveLength(2);
    const toolCallAction = actions[0] as ToolCallAction;
    expect(toolCallAction.type).toBe(AgentActionType.ToolCall);
    expect(toolCallAction.tool_calls[0].reasoning).toBeUndefined();
    expect(toolCallAction.message).toBeUndefined();
  });

  it('sets group-level reasoning as message on the tool call action', () => {
    const groupId = 'g1';
    const steps: ConversationRoundStep[] = [
      makeReasoningStep('I should search for this', { toolCallGroupId: groupId }),
      makeToolCallStep('c1', 'search', { groupId, results: [someResult] }),
    ];
    const actions = roundToActions({ round: makeRound(steps), toolIdMapping });

    const toolCallAction = actions[0] as ToolCallAction;
    expect(toolCallAction.message).toBe('I should search for this');
  });

  it('sets per-tool reasoning on individual tool calls', () => {
    const groupId = 'g1';
    const steps: ConversationRoundStep[] = [
      makeReasoningStep('reasoning for c1', { toolCallId: 'c1', toolCallGroupId: groupId }),
      makeToolCallStep('c1', 'search', { groupId, results: [someResult] }),
      makeReasoningStep('reasoning for c2', { toolCallId: 'c2', toolCallGroupId: groupId }),
      makeToolCallStep('c2', 'lookup', { groupId, results: [someResult] }),
    ];
    const actions = roundToActions({ round: makeRound(steps), toolIdMapping });

    const toolCallAction = actions[0] as ToolCallAction;
    expect(toolCallAction.tool_calls[0].reasoning).toBe('reasoning for c1');
    expect(toolCallAction.tool_calls[1].reasoning).toBe('reasoning for c2');
  });

  it('sets both group reasoning and per-tool reasoning', () => {
    const groupId = 'g1';
    const steps: ConversationRoundStep[] = [
      makeReasoningStep('group level thought', { toolCallGroupId: groupId }),
      makeReasoningStep('reasoning for c1', { toolCallId: 'c1', toolCallGroupId: groupId }),
      makeToolCallStep('c1', 'search', { groupId, results: [someResult] }),
      makeReasoningStep('reasoning for c2', { toolCallId: 'c2', toolCallGroupId: groupId }),
      makeToolCallStep('c2', 'lookup', { groupId, results: [someResult] }),
    ];
    const actions = roundToActions({ round: makeRound(steps), toolIdMapping });

    const toolCallAction = actions[0] as ToolCallAction;
    expect(toolCallAction.message).toBe('group level thought');
    expect(toolCallAction.tool_calls[0].reasoning).toBe('reasoning for c1');
    expect(toolCallAction.tool_calls[1].reasoning).toBe('reasoning for c2');
  });

  it('propagates reasoning to pending (no results) tool call actions', () => {
    const groupId = 'g1';
    const steps: ConversationRoundStep[] = [
      makeReasoningStep('group thought', { toolCallGroupId: groupId }),
      makeReasoningStep('reasoning for c1', { toolCallId: 'c1', toolCallGroupId: groupId }),
      makeToolCallStep('c1', 'search', { groupId }), // no results = pending
    ];
    const actions = roundToActions({ round: makeRound(steps), toolIdMapping });

    expect(actions).toHaveLength(1); // only tool call, no execute
    const toolCallAction = actions[0] as ToolCallAction;
    expect(toolCallAction.message).toBe('group thought');
    expect(toolCallAction.tool_calls[0].reasoning).toBe('reasoning for c1');
  });

  it('scopes reasoning to the correct group when multiple groups exist', () => {
    const steps: ConversationRoundStep[] = [
      makeReasoningStep('thought for group 1', { toolCallGroupId: 'g1' }),
      makeReasoningStep('r-c1', { toolCallId: 'c1', toolCallGroupId: 'g1' }),
      makeToolCallStep('c1', 'search', { groupId: 'g1', results: [someResult] }),
      makeReasoningStep('thought for group 2', { toolCallGroupId: 'g2' }),
      makeReasoningStep('r-c2', { toolCallId: 'c2', toolCallGroupId: 'g2' }),
      makeToolCallStep('c2', 'lookup', { groupId: 'g2', results: [someResult] }),
    ];
    const actions = roundToActions({ round: makeRound(steps), toolIdMapping });

    // 2 groups × (toolCall + execute) = 4 actions
    expect(actions).toHaveLength(4);

    const group1Action = actions[0] as ToolCallAction;
    expect(group1Action.message).toBe('thought for group 1');
    expect(group1Action.tool_calls[0].reasoning).toBe('r-c1');

    const group2Action = actions[2] as ToolCallAction;
    expect(group2Action.message).toBe('thought for group 2');
    expect(group2Action.tool_calls[0].reasoning).toBe('r-c2');
  });

  it('handles completed and pending steps in the same group', () => {
    const groupId = 'g1';
    const steps: ConversationRoundStep[] = [
      makeReasoningStep('group thought', { toolCallGroupId: groupId }),
      makeToolCallStep('c1', 'search', { groupId, results: [someResult] }), // completed
      makeToolCallStep('c2', 'lookup', { groupId }), // pending
    ];
    const actions = roundToActions({ round: makeRound(steps), toolIdMapping });

    // completed: toolCall + execute, pending: toolCall
    expect(actions).toHaveLength(3);

    const completedToolCall = actions[0] as ToolCallAction;
    expect(completedToolCall.message).toBe('group thought');
    expect(completedToolCall.tool_calls).toHaveLength(1);
    expect(completedToolCall.tool_calls[0].toolCallId).toBe('c1');

    const executeAction = actions[1] as ExecuteToolAction;
    expect(executeAction.type).toBe(AgentActionType.ExecuteTool);

    const pendingToolCall = actions[2] as ToolCallAction;
    expect(pendingToolCall.message).toBe('group thought');
    expect(pendingToolCall.tool_calls).toHaveLength(1);
    expect(pendingToolCall.tool_calls[0].toolCallId).toBe('c2');
  });

  const sampleQuestion = {
    question: 'Pick color',
    options: [{ label: 'red' }, { label: 'blue' }],
    multi_select: false,
  };

  it('emits already-answered ask_user_question steps as tool-call / tool-result pairs', () => {
    const answered = createAskUserQuestionStep({
      prompt_id: 's1',
      questions: [sampleQuestion],
      answers: [{ choice: [0] }],
    });
    const actions = roundToActions({ round: makeRound([answered]), toolIdMapping });

    expect(actions).toHaveLength(2);
    expect(actions[0].type).toBe(AgentActionType.ToolCall);
    expect(actions[1].type).toBe(AgentActionType.ExecuteTool);

    const expected = materializeAskUserQuestionToolCall({
      questions: answered.questions,
      answers: answered.answers!,
    });
    const toolCallAction = actions[0] as ToolCallAction;
    expect(toolCallAction.tool_calls[0].args).toEqual({ questions: answered.questions });
    const executeAction = actions[1] as ExecuteToolAction;
    expect(JSON.parse(executeAction.tool_results[0].content as string)).toEqual(
      JSON.parse(expected.content)
    );
  });

  it('skips unanswered ask_user_question steps', () => {
    const pending = createAskUserQuestionStep({
      prompt_id: 's1',
      questions: [sampleQuestion],
    });
    expect(roundToActions({ round: makeRound([pending]), toolIdMapping })).toEqual([]);
  });

  it('preserves step order when tool calls and answered asks are interleaved', () => {
    const answered = createAskUserQuestionStep({
      prompt_id: 's1',
      questions: [sampleQuestion],
      answers: [{ choice: [0] }],
    });
    const pending = createAskUserQuestionStep({
      prompt_id: 's2',
      questions: [sampleQuestion],
    });
    const steps: ConversationRoundStep[] = [
      makeToolCallStep('c1', 'search', { results: [someResult] }),
      answered,
      makeToolCallStep('c2', 'lookup', { results: [someResult] }),
      pending,
    ];
    const actions = roundToActions({ round: makeRound(steps), toolIdMapping });

    // 2 tool-call groups × (toolCall + execute) + 1 answered ask pair; pending ask skipped
    expect(actions).toHaveLength(6);

    const firstToolCall = actions[0] as ToolCallAction;
    const answeredAskCall = actions[2] as ToolCallAction;
    const secondToolCall = actions[4] as ToolCallAction;
    expect(firstToolCall.tool_calls[0].toolCallId).toBe('c1');
    expect(answeredAskCall.tool_calls[0].args).toEqual({ questions: answered.questions });
    expect(secondToolCall.tool_calls[0].toolCallId).toBe('c2');
  });
});
