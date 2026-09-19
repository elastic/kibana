/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationRoundStatus,
  ConversationRoundStepType,
  ToolResultType,
  isTodosStep,
  type ConversationRoundStep,
  type ReasoningStep,
  type ToolCallStep,
} from '@kbn/agent-builder-common';
import {
  EventActorType,
  TimelineEventType,
  TimelineTriggerType,
  type TimelineEvent,
} from '@kbn/agent-builder-common/chat/timeline_events';
import { AgentPromptType, type PromptRequest } from '@kbn/agent-builder-common/agents/prompts';
import { createEmptyConversation, createRound } from '../../../../test_utils/conversations';
import { roundsToEvents } from '../../../conversation/client/rounds_to_events';
import { applyStepUpdates, stepUpdates } from '../step_state';
import { foldConversationTurns, getPendingTurn } from './conversation_turn';

const actor = { type: EventActorType.agent, id: 'agent' } as const;
const user = { type: EventActorType.user, id: 'u' } as const;
const at = '2026-01-01T00:00:00.000Z';

const userMessage = (id: string): TimelineEvent =>
  ({
    id,
    type: TimelineEventType.userMessage,
    created_at: at,
    actor: user,
    data: { message: 'hi' },
  } as TimelineEvent);

const started = (
  id: string,
  execId: string,
  trigger: string,
  triggerType = TimelineTriggerType.userMessage
): TimelineEvent =>
  ({
    id,
    type: TimelineEventType.executionStarted,
    created_at: at,
    actor,
    execution_id: execId,
    trigger_event_id: trigger,
    data: { trigger_type: triggerType },
  } as TimelineEvent);

const step = (id: string, execId: string, sequence: number, s: unknown): TimelineEvent =>
  ({
    id,
    type: TimelineEventType.executionStep,
    created_at: at,
    actor,
    execution_id: execId,
    data: { step: s, sequence },
  } as TimelineEvent);

const terminated = (
  id: string,
  execId: string,
  outcome: unknown,
  extra: Record<string, unknown> = {}
): TimelineEvent =>
  ({
    id,
    type: TimelineEventType.executionTerminated,
    created_at: at,
    actor,
    execution_id: execId,
    data: {
      outcome,
      model_usage: {},
      time_to_first_token: 0,
      time_to_last_token: 0,
      ...extra,
    },
  } as TimelineEvent);

const promptResponse = (
  id: string,
  requestedId: string,
  responses: Record<string, unknown>
): TimelineEvent =>
  ({
    id,
    type: TimelineEventType.promptResponse,
    created_at: at,
    actor: user,
    data: { prompt_requested_event_id: requestedId, responses },
  } as TimelineEvent);

const responded = { type: 'responded', response: { message: 'ok' } };
const reasoning = (text: string): ReasoningStep => ({
  type: ConversationRoundStepType.reasoning,
  reasoning: text,
});
const todos = (content: string) => ({
  type: ConversationRoundStepType.updateTodos,
  todos: [{ content, status: 'pending' }],
});

const pendingCall: ToolCallStep = {
  type: ConversationRoundStepType.toolCall,
  tool_call_id: 'c1',
  tool_id: 't',
  params: {},
  results: [],
  progression: [{ message: 'p0' }],
};

describe('foldConversationTurns', () => {
  it('builds one turn per successful initial execution, keyed by the round id', () => {
    // production-style derived ids: execution id is `${roundId}::execution`
    const turns = foldConversationTurns([
      userMessage('u1'),
      started('s1', 'r1::execution', 'u1'),
      step('st1', 'r1::execution', 0, reasoning('x')),
      terminated('t1', 'r1::execution', responded),
    ]);
    expect(turns).toHaveLength(1);
    expect(turns[0]).toMatchObject({
      id: 'r1',
      steps: [{ reasoning: 'x' }],
      pendingPrompts: [],
      terminated: { id: 't1' },
    });
    expect(turns[0].userMessage.id).toBe('u1');
  });

  it('uses a bare execution id as the round id when it does not follow the derived scheme', () => {
    const turns = foldConversationTurns([
      userMessage('u1'),
      started('s1', 'exec-abc', 'u1'),
      terminated('t1', 'exec-abc', responded),
    ]);
    expect(turns[0].id).toBe('exec-abc');
  });

  it('orders steps by sequence, drops duplicate step event ids, and falls back to terminated.data.steps', () => {
    const ordered = foldConversationTurns([
      userMessage('u1'),
      started('s1', 'r1', 'u1'),
      step('st2', 'r1', 1, reasoning('second')),
      step('st1', 'r1', 0, reasoning('first')),
      step('st1', 'r1', 0, reasoning('first')), // duplicate delivery
      terminated('t1', 'r1', responded),
    ]);
    expect(ordered[0].steps.map((s) => (s as { reasoning: string }).reasoning)).toEqual([
      'first',
      'second',
    ]);

    const fallback = foldConversationTurns([
      userMessage('u1'),
      started('s1', 'r1', 'u1'),
      terminated('t1', 'r1', responded, { steps: [reasoning('from terminal')] }),
    ]);
    expect(fallback[0].steps).toEqual([reasoning('from terminal')]);
  });

  it('ignores executions without a terminated event or without a known trigger', () => {
    expect(
      foldConversationTurns([
        userMessage('u1'),
        started('s1', 'r1', 'u1'),
        step('st1', 'r1', 0, reasoning('x')),
      ])
    ).toEqual([]);
    expect(
      foldConversationTurns([started('s1', 'r1', 'missing'), terminated('t1', 'r1', responded)])
    ).toEqual([]);
  });

  it('folds a resume execution into its turn: resolves the pending call with delta progression, applies answers, replaces todos', () => {
    const question = {
      type: ConversationRoundStepType.askUserQuestion,
      prompt_id: 'p1',
      questions: [{ question: '?', options: [{ label: 'yes' }], multi_select: false }],
    };
    const results = [{ tool_result_id: 'r', type: ToolResultType.other, data: {} }];
    const turns = foldConversationTurns([
      userMessage('u1'),
      started('s1', 'r1', 'u1'),
      step('st1', 'r1', 0, pendingCall),
      step('st2', 'r1', 1, question),
      step('st3', 'r1', 2, todos('a')),
      terminated('t1', 'r1', {
        type: 'prompt_requested',
        prompts: [
          { id: 'confirm', type: AgentPromptType.confirmation, title: 't', message: 'm' },
          { id: 'p1', type: AgentPromptType.ask_user_question, questions: question.questions },
        ],
      }),
      promptResponse('pr1', 't1', {
        p1: { answers: [{ choice: [0] }] },
        confirm: { allow: true },
      }),
      started('s2', 'r1_1', 'pr1', TimelineTriggerType.promptResponse),
      step('st4', 'r1_1', 0, { ...pendingCall, results, progression: [{ message: 'p1' }] }),
      step('st5', 'r1_1', 1, todos('b')),
      step('st6', 'r1_1', 2, reasoning('after')),
      terminated(
        't2',
        'r1_1',
        { type: 'responded', response: { message: 'done' } },
        {
          state: { pending: true },
        }
      ),
    ]);

    expect(turns).toHaveLength(1);
    const [turn] = turns;
    expect(turn.terminated.id).toBe('t2');
    expect(turn.pendingPrompts).toEqual([]);
    expect(turn.state).toEqual({ pending: true });
    expect(turn.steps.map((s) => s.type)).toEqual([
      ConversationRoundStepType.toolCall,
      ConversationRoundStepType.askUserQuestion,
      ConversationRoundStepType.reasoning,
      ConversationRoundStepType.updateTodos,
    ]);
    expect(turn.steps[0]).toMatchObject({
      results,
      progression: [{ message: 'p0' }, { message: 'p1' }],
    });
    expect(turn.steps[1]).toMatchObject({ answers: [{ choice: [0] }] });
    expect(turn.steps[3]).toMatchObject({ todos: [{ content: 'b' }] });
  });

  it('ignores a resume whose prompt_response does not point at a known terminated event', () => {
    const turns = foldConversationTurns([
      userMessage('u1'),
      started('s1', 'r1', 'u1'),
      terminated('t1', 'r1', responded),
      promptResponse('pr1', 'unknown', {}),
      started('s2', 'r1_1', 'pr1', TimelineTriggerType.promptResponse),
      step('st4', 'r1_1', 0, reasoning('orphan')),
      terminated('t2', 'r1_1', responded),
    ]);
    expect(turns).toHaveLength(1);
    expect(turns[0].steps).toEqual([]);
    expect(turns[0].terminated.id).toBe('t1');
  });

  it('keeps only the latest todos step when a legacy merged round carried several', () => {
    // A rounds-only conversation whose last round was paused and resumed once without a
    // todo_write on the resume: `mergeRounds` left two todos steps in `round.steps`.
    const legacyConversation = createEmptyConversation({
      rounds: [
        createRound({
          id: 'r1',
          status: ConversationRoundStatus.awaitingPrompt,
          pending_prompts: [
            { id: 'confirm', type: AgentPromptType.confirmation, title: 't', message: 'm' },
          ],
          steps: [
            reasoning('one'),
            todos('v1'),
            pendingCall,
            reasoning('two'),
            todos('v2'),
          ] as ConversationRoundStep[],
        }),
      ],
    });

    const turn = foldConversationTurns(roundsToEvents(legacyConversation)).at(-1)!;
    expect(turn.steps.filter(isTodosStep)).toHaveLength(1);
    expect(turn.steps.at(-1)).toMatchObject({
      type: ConversationRoundStepType.updateTodos,
      todos: [{ content: 'v2' }],
    });
    expect(turn.steps.map((s) => s.type)).toEqual([
      ConversationRoundStepType.reasoning,
      ConversationRoundStepType.toolCall,
      ConversationRoundStepType.reasoning,
      ConversationRoundStepType.updateTodos,
    ]);
    // and a later graph update that does not touch todos keeps v2
    expect(
      applyStepUpdates(turn.steps, [stepUpdates.append(reasoning('after'))]).at(-1)
    ).toMatchObject({ todos: [{ content: 'v2' }] });
  });

  it('exposes pending prompts for a paused turn', () => {
    const prompt: PromptRequest = {
      id: 'confirm',
      type: AgentPromptType.confirmation,
      title: 't',
      message: 'm',
    };
    const turns = foldConversationTurns([
      userMessage('u1'),
      started('s1', 'r1', 'u1'),
      step('st1', 'r1', 0, pendingCall),
      terminated('t1', 'r1', { type: 'prompt_requested', prompts: [prompt] }),
    ]);
    expect(turns[0].pendingPrompts).toEqual([prompt]);
  });
});

describe('getPendingTurn', () => {
  const prompt: PromptRequest = {
    id: 'confirm',
    type: AgentPromptType.confirmation,
    title: 't',
    message: 'm',
  };

  it('returns the last turn with its compat round when it awaits a prompt', () => {
    const conversation = createEmptyConversation({
      rounds: [
        createRound({ id: 'r0', status: ConversationRoundStatus.completed }),
        createRound({
          id: 'r1',
          status: ConversationRoundStatus.awaitingPrompt,
          pending_prompts: [prompt],
          steps: [pendingCall],
          configuration_overrides: { instructions: 'be nice' },
        }),
      ],
    });

    const pending = getPendingTurn(conversation);
    expect(pending).toBeDefined();
    expect(pending?.id).toBe('r1');
    expect(pending?.pendingPrompts).toEqual([prompt]);
    expect(pending?.steps).toEqual([pendingCall]);
    expect(pending?.compatRound.id).toBe('r1');
    expect(pending?.compatRound.configuration_overrides).toEqual({ instructions: 'be nice' });
  });

  it('returns undefined when the last turn responded', () => {
    const conversation = createEmptyConversation({
      rounds: [createRound({ id: 'r0', status: ConversationRoundStatus.completed })],
    });
    expect(getPendingTurn(conversation)).toBeUndefined();
  });

  it('returns undefined for an empty conversation', () => {
    expect(getPendingTurn(createEmptyConversation())).toBeUndefined();
  });
});
