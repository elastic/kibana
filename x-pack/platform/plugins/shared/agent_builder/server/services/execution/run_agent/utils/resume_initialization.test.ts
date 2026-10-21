/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ChatEventType,
  ConversationRoundStepType,
  ToolResultType,
  createAskUserQuestionStep,
  type ConversationRoundStep,
  type ReasoningStep,
  type ToolCallStep,
} from '@kbn/agent-builder-common';
import { AgentExecutionErrorCode } from '@kbn/agent-builder-common/agents';
import {
  AgentPromptType,
  type AskUserQuestionAnswer,
  type AskUserQuestionItem,
  type PromptRequest,
  type PromptStorageState,
} from '@kbn/agent-builder-common/agents/prompts';
import type { RoundState } from '@kbn/agent-builder-common/chat/round_state';
import { EventActorType, TimelineEventType } from '@kbn/agent-builder-common/chat/timeline_events';
import type { ConversationTurn } from './conversation_turn';
import { buildResumeInitialization } from './resume_initialization';

const sampleQuestion: AskUserQuestionItem = {
  question: 'Pick a color',
  options: [{ label: 'red' }, { label: 'blue' }, { label: 'green' }],
  multi_select: false,
};

const confirmPrompt = (id: string): PromptRequest => ({
  id,
  type: AgentPromptType.confirmation,
  title: 't',
  message: 'm',
});

const askPrompt = (id: string): PromptRequest => ({
  id,
  type: AgentPromptType.ask_user_question,
  questions: [sampleQuestion],
});

const doneCall = (id: string, overrides: Partial<ToolCallStep> = {}): ToolCallStep => ({
  type: ConversationRoundStepType.toolCall,
  tool_call_id: id,
  tool_id: 'my.tool',
  params: { q: id },
  results: [{ tool_result_id: `r-${id}`, type: ToolResultType.other, data: {} }],
  progression: [],
  ...overrides,
});

const pendingCall = (id: string, overrides: Partial<ToolCallStep> = {}): ToolCallStep =>
  doneCall(id, { results: [], ...overrides });

const reasoning = (
  text: string,
  refs: { tool_call_group_id?: string; tool_call_id?: string } = {}
): ReasoningStep => ({ type: ConversationRoundStepType.reasoning, reasoning: text, ...refs });

const node = (toolCallId: string, toolId = 'my.tool') => ({
  step: 'execute_tool' as const,
  tool_call_id: toolCallId,
  tool_id: toolId,
  tool_params: {},
  tool_state: undefined,
});

const roundState = (nodes: RoundState['agent']['nodes'], cycle = 3, errors = 1): RoundState => ({
  version: 2,
  agent: { current_cycle: cycle, error_count: errors, nodes },
});

const makeTurn = ({
  steps,
  pendingPrompts,
  state,
}: {
  steps: ConversationRoundStep[];
  pendingPrompts: PromptRequest[];
  state?: RoundState;
}): ConversationTurn => ({
  id: 'r1',
  userMessage: {
    id: 'u1',
    type: TimelineEventType.userMessage,
    created_at: '2026-01-01T00:00:00.000Z',
    actor: { type: EventActorType.user, id: 'u' },
    data: { message: 'hi' },
  },
  steps,
  terminated: {
    id: 't1',
    type: TimelineEventType.executionTerminated,
    created_at: '2026-01-01T00:00:00.000Z',
    actor: { type: EventActorType.agent, id: 'a' },
    execution_id: 'r1::execution',
    data: {
      outcome: { type: 'prompt_requested', prompts: pendingPrompts },
      model_usage: { connector_id: 'c', input_tokens: 0, output_tokens: 0, llm_calls: 0 },
      time_to_first_token: 0,
      time_to_last_token: 0,
      state,
    },
  },
  pendingPrompts,
  state,
});

const agentBuilderToLangchainIdMap = new Map([['my.tool', 'my_tool']]);
const emptyPromptState: PromptStorageState = { responses: {} };

const build = (
  turn: ConversationTurn,
  promptState: PromptStorageState = emptyPromptState,
  eventEmitter: (event: unknown) => void = jest.fn()
) =>
  buildResumeInitialization({
    turn,
    promptState,
    agentBuilderToLangchainIdMap,
    eventEmitter,
  });

describe('buildResumeInitialization', () => {
  it('seeds steps, marks RoundState tool calls pending, and builds a tool_calls outcome with the runtime tool name', () => {
    const turn = makeTurn({
      steps: [
        doneCall('d1'),
        reasoning('group', { tool_call_group_id: 'g2' }),
        reasoning('why c1', { tool_call_group_id: 'g2', tool_call_id: 'c1' }),
        pendingCall('c1', { tool_call_group_id: 'g2' }),
      ],
      pendingPrompts: [confirmPrompt('confirm')],
      state: roundState([node('c1')]),
    });

    const init = build(turn);

    expect(init.steps).toEqual(turn.steps);
    expect(init.pendingToolCallIds).toEqual(['c1']);
    expect(init.researchOutcome).toEqual({
      type: 'tool_calls',
      toolCallGroupId: 'g2',
      toolCalls: [
        { toolCallId: 'c1', toolName: 'my_tool', args: { q: 'c1' }, reasoning: 'why c1' },
      ],
    });
    expect(init.toolRenderState).toEqual({
      d1: { toolName: 'my_tool', kind: 'server' },
      c1: { toolName: 'my_tool', kind: 'server' },
    });
    expect(init.currentCycle).toBe(3);
    expect(init.errorCount).toBe(1);
    expect(init.consumedPromptIds).toEqual([]);
  });

  it('resumes several pending calls of the same batch and falls back to a fresh group id', () => {
    const turn = makeTurn({
      steps: [pendingCall('a', { tool_call_group_id: undefined }), pendingCall('b')],
      pendingPrompts: [confirmPrompt('p-a'), confirmPrompt('p-b')],
      state: roundState([node('a'), node('b')]),
    });

    const init = build(turn);

    expect(init.pendingToolCallIds).toEqual(['a', 'b']);
    expect(init.researchOutcome).toMatchObject({
      type: 'tool_calls',
      toolCallGroupId: expect.any(String),
      toolCalls: [
        { toolCallId: 'a', toolName: 'my_tool', reasoning: undefined },
        { toolCallId: 'b', toolName: 'my_tool', reasoning: undefined },
      ],
    });
  });

  it('keeps unmapped tool ids as-is', () => {
    const turn = makeTurn({
      steps: [pendingCall('c1', { tool_id: 'unmapped' })],
      pendingPrompts: [confirmPrompt('confirm')],
      state: roundState([node('c1', 'unmapped')]),
    });
    const init = build(turn);
    expect(init.toolRenderState.c1.toolName).toBe('unmapped');
    expect(init.researchOutcome).toMatchObject({ toolCalls: [{ toolName: 'unmapped' }] });
  });

  it('applies ask_user_question answers, emits user_question_answered, and reports consumed prompt ids', () => {
    const answers: AskUserQuestionAnswer[] = [{ choice: [0] }];
    const step = createAskUserQuestionStep({ prompt_id: 's1', questions: [sampleQuestion] });
    const previouslyAnswered = createAskUserQuestionStep({
      prompt_id: 's0',
      questions: [sampleQuestion],
      answers: [{ choice: [1] }],
    });
    const turn = makeTurn({
      steps: [doneCall('d1'), previouslyAnswered, step],
      pendingPrompts: [askPrompt('s1')],
    });
    const promptState: PromptStorageState = {
      responses: { s1: { type: AgentPromptType.ask_user_question, response: { answers } } },
    };
    const eventEmitter = jest.fn();

    const init = build(turn, promptState, eventEmitter);

    expect(init.steps).toEqual([doneCall('d1'), previouslyAnswered, { ...step, answers }]);
    expect(init.consumedPromptIds).toEqual(['s1']);
    expect(init.pendingToolCallIds).toEqual([]);
    expect(init.researchOutcome).toBeUndefined();
    expect(eventEmitter).toHaveBeenCalledTimes(1);
    expect(eventEmitter).toHaveBeenCalledWith({
      type: ChatEventType.userQuestionAnswered,
      data: { prompt_id: 's1', answers },
    });
    // the original steps are not mutated
    expect(step.answers).toBeUndefined();
    expect(promptState.responses.s1).toBeDefined();
  });

  it('accepts a { skipped: true } answer', () => {
    const step = createAskUserQuestionStep({ prompt_id: 's1', questions: [sampleQuestion] });
    const turn = makeTurn({ steps: [step], pendingPrompts: [askPrompt('s1')] });
    const init = build(turn, {
      responses: {
        s1: { type: AgentPromptType.ask_user_question, response: { answers: [{ skipped: true }] } },
      },
    });
    expect(init.steps[0]).toMatchObject({ answers: [{ skipped: true }] });
  });

  it('throws when a pending ask question has no answer in the prompt state', () => {
    const step = createAskUserQuestionStep({ prompt_id: 's1', questions: [sampleQuestion] });
    const turn = makeTurn({ steps: [step], pendingPrompts: [askPrompt('s1')] });
    expect(() => build(turn)).toThrow(/No ask_user_question response found/);
  });

  describe('answer validation', () => {
    const step = createAskUserQuestionStep({ prompt_id: 's1', questions: [sampleQuestion] });
    const turn = makeTurn({ steps: [step], pendingPrompts: [askPrompt('s1')] });
    const withAnswers = (answers: AskUserQuestionAnswer[]): PromptStorageState => ({
      responses: { s1: { type: AgentPromptType.ask_user_question, response: { answers } } },
    });

    it('rejects an answer count mismatch', () => {
      expect(() => build(turn, withAnswers([]))).toThrow(/length/i);
    });
    it('rejects an empty answer', () => {
      expect(() => build(turn, withAnswers([{}]))).toThrow(/empty/i);
    });
    it('rejects skipped combined with a choice or custom text', () => {
      expect(() => build(turn, withAnswers([{ skipped: true, choice: [0] }]))).toThrow(/skipped/i);
      expect(() => build(turn, withAnswers([{ skipped: true, custom: 'x' }]))).toThrow(/skipped/i);
    });
    it('rejects an out-of-bounds choice', () => {
      expect(() => build(turn, withAnswers([{ choice: [5] }]))).toThrow(/out of bounds|index/i);
    });
    it('rejects several choices on a single-select question', () => {
      expect(() => build(turn, withAnswers([{ choice: [0, 1] }]))).toThrow(/multi/i);
    });
  });

  it('throws invalidState when the RoundState nodes do not match the pending tool prompts', () => {
    const noState = makeTurn({
      steps: [pendingCall('c1')],
      pendingPrompts: [confirmPrompt('confirm')],
      state: undefined,
    });
    expect(() => build(noState)).toThrow(
      expect.objectContaining({
        meta: expect.objectContaining({ errCode: AgentExecutionErrorCode.invalidState }),
      })
    );

    const mismatch = makeTurn({
      steps: [pendingCall('c1'), pendingCall('c2')],
      pendingPrompts: [confirmPrompt('p1'), confirmPrompt('p2')],
      state: roundState([node('c1')]),
    });
    expect(() => build(mismatch)).toThrow(/expected one RoundState node per tool prompt/);
  });

  it('throws invalidState when a RoundState node references an unknown tool call', () => {
    const turn = makeTurn({
      steps: [doneCall('d1')],
      pendingPrompts: [confirmPrompt('confirm')],
      state: roundState([node('ghost')]),
    });
    expect(() => build(turn)).toThrow(/unknown tool_call_id "ghost"/);
  });

  it('handles a batch that paused on both a tool prompt and an ask question', () => {
    const ask = createAskUserQuestionStep({ prompt_id: 's1', questions: [sampleQuestion] });
    const turn = makeTurn({
      steps: [pendingCall('c1', { tool_call_group_id: 'g' }), ask],
      pendingPrompts: [confirmPrompt('confirm'), askPrompt('s1')],
      state: roundState([node('c1')]),
    });
    const init = build(turn, {
      responses: {
        s1: { type: AgentPromptType.ask_user_question, response: { answers: [{ choice: [2] }] } },
      },
    });
    expect(init.pendingToolCallIds).toEqual(['c1']);
    expect(init.consumedPromptIds).toEqual(['s1']);
    expect(init.steps[1]).toMatchObject({ answers: [{ choice: [2] }] });
    expect(init.researchOutcome).toMatchObject({ type: 'tool_calls', toolCallGroupId: 'g' });
  });
});
