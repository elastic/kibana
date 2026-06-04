/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ChatEventType,
  ConversationRoundStatus,
  createAskUserQuestionStep,
  type ConversationRound,
} from '@kbn/agent-builder-common';
import {
  AgentPromptType,
  type AskUserQuestionItem,
  type PromptStorageState,
} from '@kbn/agent-builder-common/agents/prompts';
import { pendingAskUserQuestionStepsToActions } from './pending_ask_user_question_steps_to_actions';
import { AgentActionType } from '../actions';

const sampleQuestion: AskUserQuestionItem = {
  question: 'Pick a color',
  options: [{ label: 'red' }, { label: 'blue' }, { label: 'green' }],
  multi_select: false,
};

const makeRound = (...steps: any[]): ConversationRound =>
  ({
    id: 'r1',
    status: ConversationRoundStatus.awaitingPrompt,
    input: { message: '', attachments: [] },
    started_at: '2026-06-04T00:00:00.000Z',
    time_to_first_token: 0,
    time_to_last_token: 0,
    response: { message: '' },
    steps,
  } as unknown as ConversationRound);

describe('pendingAskUserQuestionStepsToActions', () => {
  it('emits a toolCall + executeTool action pair for each pending ask_user_question step', () => {
    const step = createAskUserQuestionStep({
      step_id: 's1',
      questions: [sampleQuestion],
    });
    const round = makeRound(step);
    const promptState: PromptStorageState = {
      responses: {
        s1: {
          type: AgentPromptType.ask_user_question,
          response: { answers: [{ choice: [0] }] },
        },
      },
    };
    const eventEmitter = jest.fn();

    const result = pendingAskUserQuestionStepsToActions({ round, promptState, eventEmitter });

    expect(result.actions).toHaveLength(2);
    const [toolCallAction, executeToolAction] = result.actions as any[];
    expect(toolCallAction.type).toBe(AgentActionType.ToolCall);
    expect(toolCallAction.tool_calls[0].toolName).toBe('ask_user_question');
    expect(toolCallAction.tool_calls[0].args).toEqual({ questions: [sampleQuestion] });
    expect(executeToolAction.type).toBe(AgentActionType.ExecuteTool);
    expect(executeToolAction.tool_results[0].content).toEqual(
      JSON.stringify({ answers: [{ choice: [0] }] })
    );
    expect(toolCallAction.tool_calls[0].toolCallId).toBe(
      executeToolAction.tool_results[0].toolCallId
    );
    expect(result.consumedPromptIds).toEqual(['s1']);
  });

  it('emits an askUserQuestionAnsweredStepEvent per step via eventEmitter', () => {
    const step = createAskUserQuestionStep({ step_id: 's1', questions: [sampleQuestion] });
    const round = makeRound(step);
    const promptState: PromptStorageState = {
      responses: {
        s1: {
          type: AgentPromptType.ask_user_question,
          response: { answers: [{ choice: [1] }] },
        },
      },
    };
    const eventEmitter = jest.fn();

    pendingAskUserQuestionStepsToActions({ round, promptState, eventEmitter });

    expect(eventEmitter).toHaveBeenCalledTimes(1);
    const event = eventEmitter.mock.calls[0][0];
    expect(event.type).toBe(ChatEventType.askUserQuestionAnsweredStep);
    expect(event.data).toEqual({ step_id: 's1', answers: [{ choice: [1] }] });
  });

  it('skips already-answered steps', () => {
    const answered = createAskUserQuestionStep({
      step_id: 's1',
      questions: [sampleQuestion],
      answers: [{ choice: [0] }],
    });
    const round = makeRound(answered);
    const promptState: PromptStorageState = { responses: {} };
    const eventEmitter = jest.fn();

    const result = pendingAskUserQuestionStepsToActions({ round, promptState, eventEmitter });

    expect(result.actions).toEqual([]);
    expect(result.consumedPromptIds).toEqual([]);
    expect(eventEmitter).not.toHaveBeenCalled();
  });

  it('accepts a { skipped: true } answer', () => {
    const step = createAskUserQuestionStep({ step_id: 's1', questions: [sampleQuestion] });
    const round = makeRound(step);
    const promptState: PromptStorageState = {
      responses: {
        s1: {
          type: AgentPromptType.ask_user_question,
          response: { answers: [{ skipped: true }] },
        },
      },
    };
    const result = pendingAskUserQuestionStepsToActions({
      round,
      promptState,
      eventEmitter: jest.fn(),
    });

    expect((result.actions[1] as any).tool_results[0].content).toContain('"skipped":true');
  });

  describe('validation', () => {
    const setup = (response: any) => ({
      round: makeRound(createAskUserQuestionStep({ step_id: 's1', questions: [sampleQuestion] })),
      promptState: {
        responses: { s1: { type: AgentPromptType.ask_user_question, response } },
      } as PromptStorageState,
      eventEmitter: jest.fn(),
    });

    it('throws when answers length mismatches questions length', () => {
      const args = setup({ answers: [] });
      expect(() => pendingAskUserQuestionStepsToActions(args)).toThrow(/length/i);
      expect(args.eventEmitter).not.toHaveBeenCalled();
    });

    it('throws when an answer has neither skipped, choice, nor custom', () => {
      const args = setup({ answers: [{}] });
      expect(() => pendingAskUserQuestionStepsToActions(args)).toThrow(/empty/i);
    });

    it('throws when skipped is combined with choice', () => {
      const args = setup({ answers: [{ skipped: true, choice: [0] }] });
      expect(() => pendingAskUserQuestionStepsToActions(args)).toThrow(/skipped/i);
    });

    it('throws when skipped is combined with custom', () => {
      const args = setup({ answers: [{ skipped: true, custom: 'x' }] });
      expect(() => pendingAskUserQuestionStepsToActions(args)).toThrow(/skipped/i);
    });

    it('throws when choice index is out of bounds', () => {
      const args = setup({ answers: [{ choice: [5] }] });
      expect(() => pendingAskUserQuestionStepsToActions(args)).toThrow(/out of bounds|index/i);
    });

    it('throws when single-select question gets multiple choices', () => {
      const args = setup({ answers: [{ choice: [0, 1] }] });
      expect(() => pendingAskUserQuestionStepsToActions(args)).toThrow(/multi/i);
    });
  });

  it('does NOT mutate promptState.responses', () => {
    const step = createAskUserQuestionStep({ step_id: 's1', questions: [sampleQuestion] });
    const round = makeRound(step);
    const promptState: PromptStorageState = {
      responses: {
        s1: {
          type: AgentPromptType.ask_user_question,
          response: { answers: [{ choice: [0] }] },
        },
      },
    };
    const snapshot = JSON.stringify(promptState);
    pendingAskUserQuestionStepsToActions({ round, promptState, eventEmitter: jest.fn() });
    expect(JSON.stringify(promptState)).toEqual(snapshot);
  });
});
