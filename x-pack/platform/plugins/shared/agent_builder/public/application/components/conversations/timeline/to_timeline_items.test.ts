/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ConversationOriginType,
  ConversationRoundStepType,
  EventActorType,
  TimelineEventType,
  ToolResultType,
} from '@kbn/agent-builder-common';
import type { ToolResult } from '@kbn/agent-builder-common';
import { groupTimelineEvents, buildItems } from './to_timeline_items';
import { createUserMessageEvent } from './items/user_message_event.factory';
import { createExecutionStartedEvent } from './items/execution_started.factory';
import { createExecutionTerminatedEvent } from './items/execution_terminated_event.factory';
import { createExecutionFailedEvent } from './items/execution_failed_event.factory';
import { createExecutionAbortedEvent } from './items/execution_aborted_event.factory';
import { createExecutionStepEvent } from './items/execution_step.factory';
import { createPromptResponseEvent } from './items/prompt_response_event.factory';
import { createAttachmentAddedEvent } from './items/attachment_added_event.factory';
import { createAttachmentUpdatedEvent } from './items/attachment_updated_event.factory';
import { createCustomEvent } from './items/custom_event.factory';
import type { ConversationEvent } from '@kbn/agent-builder-common';
import type { ExecutionStreamingEvent, TimelineDisplayEvent } from '../../../../services/events';
import { EXECUTION_STREAMING_EVENT_TYPE } from '../../../../services/events';
import type { PromptRequest } from '@kbn/agent-builder-common/agents';
import { AgentPromptType } from '@kbn/agent-builder-common/agents';
import { createExecutionPausedEvent } from './items/execution_paused_event.factory';

const makeEventsById = (events: TimelineDisplayEvent[]) => new Map(events.map((e) => [e.id, e]));

describe('groupTimelineEvents', () => {
  it('returns empty array for empty input', () => {
    expect(groupTimelineEvents([], new Map())).toEqual([]);
  });

  it('groups a full round into 2 items — one agentTurn with status completed', () => {
    const userMsg = createUserMessageEvent({ id: 'user-1' });
    const started = createExecutionStartedEvent({
      id: 'exec-started-1',
      execution_id: 'exec-1',
      trigger_event_id: 'user-1',
    });
    const step0 = createExecutionStepEvent({
      id: 'step-0',
      execution_id: 'exec-1',
      data: {
        step: { type: ConversationRoundStepType.reasoning, reasoning: 'step 0' },
        sequence: 0,
      },
    });
    const step1 = createExecutionStepEvent({
      id: 'step-1',
      execution_id: 'exec-1',
      data: {
        step: { type: ConversationRoundStepType.reasoning, reasoning: 'step 1' },
        sequence: 1,
      },
    });
    const terminated = createExecutionTerminatedEvent({
      id: 'exec-terminated-1',
      execution_id: 'exec-1',
      trigger_event_id: 'user-1',
    });

    const events = [userMsg, started, step0, step1, terminated];
    const items = groupTimelineEvents(events, makeEventsById(events));

    expect(items).toHaveLength(2);

    const [item0, item1] = items;
    expect(item0).toEqual({ kind: 'userMessage', key: userMsg.id, event: userMsg });

    expect(item1.kind).toBe('agentTurn');
    if (item1.kind === 'agentTurn') {
      expect(item1.key).toBe('exec-1');
      expect(item1.status).toBe('completed');
      expect(item1.steps).toHaveLength(2);
      expect(item1.steps[0]).toEqual(step0.data.step);
      expect(item1.steps[1]).toEqual(step1.data.step);
      expect(item1.terminal).toBe(terminated);
    }
  });

  it('does not leak steps across two consecutive rounds', () => {
    const user1 = createUserMessageEvent({ id: 'user-1' });
    const started1 = createExecutionStartedEvent({ execution_id: 'exec-1', id: 'es-1' });
    const step1 = createExecutionStepEvent({ execution_id: 'exec-1', id: 'step-1' });
    const term1 = createExecutionTerminatedEvent({ execution_id: 'exec-1', id: 'et-1' });

    const user2 = createUserMessageEvent({ id: 'user-2', data: { message: 'second question' } });
    const started2 = createExecutionStartedEvent({ execution_id: 'exec-2', id: 'es-2' });
    const step2 = createExecutionStepEvent({ execution_id: 'exec-2', id: 'step-2' });
    const term2 = createExecutionTerminatedEvent({ execution_id: 'exec-2', id: 'et-2' });

    const events = [user1, started1, step1, term1, user2, started2, step2, term2];
    const items = groupTimelineEvents(events, makeEventsById(events));

    expect(items).toHaveLength(4);

    const [i0, i1, i2, i3] = items;
    expect(i0).toEqual({ kind: 'userMessage', key: user1.id, event: user1 });
    expect(i1.kind).toBe('agentTurn');
    if (i1.kind === 'agentTurn') {
      expect(i1.key).toBe('exec-1');
      expect(i1.status).toBe('completed');
      expect(i1.steps).toHaveLength(1);
      expect(i1.steps[0]).toEqual(step1.data.step);
    }
    expect(i2).toEqual({ kind: 'userMessage', key: user2.id, event: user2 });
    expect(i3.kind).toBe('agentTurn');
    if (i3.kind === 'agentTurn') {
      expect(i3.key).toBe('exec-2');
      expect(i3.status).toBe('completed');
      expect(i3.steps).toHaveLength(1);
      expect(i3.steps[0]).toEqual(step2.data.step);
    }
  });

  it('creates an agentTurn with status running when no terminal event yet', () => {
    const user1 = createUserMessageEvent({ id: 'user-1' });
    const started = createExecutionStartedEvent({ execution_id: 'exec-1' });
    const step = createExecutionStepEvent({ execution_id: 'exec-1' });

    const events = [user1, started, step];
    const items = groupTimelineEvents(events, makeEventsById(events));

    expect(items).toHaveLength(2);
    const [, execItem] = items;
    expect(execItem.kind).toBe('agentTurn');
    if (execItem.kind === 'agentTurn') {
      expect(execItem.status).toBe('running');
      expect(execItem.steps).toHaveLength(1);
    }
  });

  it('creates an execution item lazily when a step arrives with no preceding execution_started', () => {
    const step = createExecutionStepEvent({ execution_id: 'exec-orphan', id: 'step-orphan' });
    const terminal = createExecutionTerminatedEvent({
      execution_id: 'exec-orphan',
      id: 'term-orphan',
    });

    const events = [step, terminal];
    const items = groupTimelineEvents(events, makeEventsById(events));

    expect(items).toHaveLength(1);
    const [execItem] = items;
    expect(execItem.kind).toBe('agentTurn');
    if (execItem.kind === 'agentTurn') {
      expect(execItem.key).toBe('exec-orphan');
      expect(execItem.status).toBe('completed');
      expect(execItem.steps).toHaveLength(1);
      expect(execItem.terminal).toBe(terminal);
    }
  });

  it('creates an agentTurn with status failed when only a failed terminal arrives', () => {
    const terminal = createExecutionFailedEvent({
      execution_id: 'exec-orphan-2',
      id: 'term-orphan-2',
    });

    const events = [terminal];
    const items = groupTimelineEvents(events, makeEventsById(events));

    expect(items).toHaveLength(1);
    const [execItem] = items;
    expect(execItem.kind).toBe('agentTurn');
    if (execItem.kind === 'agentTurn') {
      expect(execItem.key).toBe('exec-orphan-2');
      expect(execItem.status).toBe('failed');
      expect(execItem.terminal).toBe(terminal);
    }
  });

  it('skips prompt_response events (no item pushed; attachment refs still folded)', () => {
    const promptResponse = createPromptResponseEvent({ id: 'pr-1' });

    const events = [promptResponse];
    const items = groupTimelineEvents(events, makeEventsById(events));

    expect(items).toHaveLength(0);
  });

  it('handles execution_aborted as aborted status', () => {
    const started = createExecutionStartedEvent({ execution_id: 'exec-abort' });
    const aborted = createExecutionAbortedEvent({ execution_id: 'exec-abort' });

    const events = [started, aborted];
    const items = groupTimelineEvents(events, makeEventsById(events));

    expect(items).toHaveLength(1);
    const [execItem] = items;
    expect(execItem.kind).toBe('agentTurn');
    if (execItem.kind === 'agentTurn') {
      expect(execItem.status).toBe('aborted');
      expect(execItem.terminal).toBe(aborted);
    }
  });
});

describe('groupTimelineEvents deduping a paused tool call', () => {
  const toolCallStep = (results: ToolResult[]) => ({
    type: ConversationRoundStepType.toolCall as const,
    tool_call_id: 'tc-1',
    tool_id: 'platform.core.list_indices',
    params: {},
    results,
  });
  const result: ToolResult = { type: ToolResultType.other, data: {}, tool_result_id: 'r-1' };

  it('drops the unresolved copy once the resume execution resolves the same tool call', () => {
    const user = createUserMessageEvent({ id: 'user-1' });
    const pausedStarted = createExecutionStartedEvent({ execution_id: 'exec-1', id: 'es-1' });
    const pausedStep = createExecutionStepEvent({
      execution_id: 'exec-1',
      id: 'paused-step',
      data: { step: toolCallStep([]), sequence: 0 },
    });
    const pausedTerm = createExecutionTerminatedEvent({ execution_id: 'exec-1', id: 'et-1' });
    const promptResponse = createPromptResponseEvent({ id: 'pr-1' });
    const resumeStarted = createExecutionStartedEvent({ execution_id: 'exec-2', id: 'es-2' });
    const resumeStep = createExecutionStepEvent({
      execution_id: 'exec-2',
      id: 'resume-step',
      data: { step: toolCallStep([result]), sequence: 0 },
    });
    const resumeTerm = createExecutionTerminatedEvent({ execution_id: 'exec-2', id: 'et-2' });

    const events = [
      user,
      pausedStarted,
      pausedStep,
      pausedTerm,
      promptResponse,
      resumeStarted,
      resumeStep,
      resumeTerm,
    ];
    const turns = groupTimelineEvents(events, makeEventsById(events)).filter(
      (item) => item.kind === 'agentTurn'
    );

    const [paused, resumed] = turns;
    expect(paused.kind === 'agentTurn' && paused.steps).toHaveLength(0);
    expect(resumed.kind === 'agentTurn' && resumed.steps).toEqual([resumeStep.data.step]);
  });

  it('keeps an unresolved tool call while the run is still paused on it', () => {
    const user = createUserMessageEvent({ id: 'user-1' });
    const started = createExecutionStartedEvent({ execution_id: 'exec-1', id: 'es-1' });
    const step = createExecutionStepEvent({
      execution_id: 'exec-1',
      id: 'paused-step',
      data: { step: toolCallStep([]), sequence: 0 },
    });

    const events = [user, started, step];
    const [, turn] = groupTimelineEvents(events, makeEventsById(events));

    expect(turn.kind === 'agentTurn' && turn.steps).toEqual([step.data.step]);
  });
});

describe('groupTimelineEvents folding resumed executions', () => {
  it('merges a paused execution and its resume into one agent turn', () => {
    const user = createUserMessageEvent({ id: 'user-1' });
    const started1 = createExecutionStartedEvent({
      id: 'es-1',
      execution_id: 'exec-1',
      trigger_event_id: 'user-1',
    });
    const step1 = createExecutionStepEvent({
      id: 'step-1',
      execution_id: 'exec-1',
      data: {
        step: { type: ConversationRoundStepType.reasoning, reasoning: 'before pause' },
        sequence: 0,
      },
    });
    const pausedTerm = createExecutionPausedEvent({
      id: 'paused-term-1',
      execution_id: 'exec-1',
    });
    const promptResponse = createPromptResponseEvent({
      id: 'pr-1',
      data: {
        prompt_requested_event_id: 'paused-term-1',
        responses: { 'prompt-1': { allow: true } },
      },
    });
    const started2 = createExecutionStartedEvent({
      id: 'es-2',
      execution_id: 'exec-2',
      trigger_event_id: 'pr-1',
    });
    const step2 = createExecutionStepEvent({
      id: 'step-2',
      execution_id: 'exec-2',
      data: {
        step: { type: ConversationRoundStepType.reasoning, reasoning: 'after resume' },
        sequence: 0,
      },
    });
    const finalTerm = createExecutionTerminatedEvent({
      id: 'et-2',
      execution_id: 'exec-2',
    });

    const events = [user, started1, step1, pausedTerm, promptResponse, started2, step2, finalTerm];
    const items = groupTimelineEvents(events, makeEventsById(events));

    const agentTurns = items.filter((i) => i.kind === 'agentTurn');
    expect(agentTurns).toHaveLength(1);

    const [turn] = agentTurns;
    if (turn.kind === 'agentTurn') {
      expect(turn.key).toBe('exec-1');
      expect(turn.status).toBe('completed');
      expect(turn.steps).toHaveLength(2);
      expect(turn.steps[0]).toEqual(step1.data.step);
      expect(turn.steps[1]).toEqual(step2.data.step);
      expect(turn.terminal).toBe(finalTerm);
    }
  });

  it('flattens a two-resume chain into one agent turn', () => {
    const user = createUserMessageEvent({ id: 'user-1' });
    const started1 = createExecutionStartedEvent({
      id: 'es-1',
      execution_id: 'exec-1',
      trigger_event_id: 'user-1',
    });
    const step1 = createExecutionStepEvent({
      id: 'step-1',
      execution_id: 'exec-1',
      data: {
        step: { type: ConversationRoundStepType.reasoning, reasoning: 'first' },
        sequence: 0,
      },
    });
    const pausedTerm1 = createExecutionPausedEvent({
      id: 'paused-term-1',
      execution_id: 'exec-1',
    });
    const pr1 = createPromptResponseEvent({
      id: 'pr-1',
      data: {
        prompt_requested_event_id: 'paused-term-1',
        responses: { 'prompt-1': { allow: true } },
      },
    });

    const started2 = createExecutionStartedEvent({
      id: 'es-2',
      execution_id: 'exec-2',
      trigger_event_id: 'pr-1',
    });
    const step2 = createExecutionStepEvent({
      id: 'step-2',
      execution_id: 'exec-2',
      data: {
        step: { type: ConversationRoundStepType.reasoning, reasoning: 'second' },
        sequence: 0,
      },
    });
    const pausedTerm2 = createExecutionPausedEvent({
      id: 'paused-term-2',
      execution_id: 'exec-2',
    });
    const pr2 = createPromptResponseEvent({
      id: 'pr-2',
      data: {
        prompt_requested_event_id: 'paused-term-2',
        responses: { 'prompt-1': { allow: true } },
      },
    });

    const started3 = createExecutionStartedEvent({
      id: 'es-3',
      execution_id: 'exec-3',
      trigger_event_id: 'pr-2',
    });
    const step3 = createExecutionStepEvent({
      id: 'step-3',
      execution_id: 'exec-3',
      data: {
        step: { type: ConversationRoundStepType.reasoning, reasoning: 'third' },
        sequence: 0,
      },
    });
    const finalTerm = createExecutionTerminatedEvent({
      id: 'et-3',
      execution_id: 'exec-3',
    });

    const events = [
      user,
      started1,
      step1,
      pausedTerm1,
      pr1,
      started2,
      step2,
      pausedTerm2,
      pr2,
      started3,
      step3,
      finalTerm,
    ];
    const items = groupTimelineEvents(events, makeEventsById(events));

    const agentTurns = items.filter((i) => i.kind === 'agentTurn');
    expect(agentTurns).toHaveLength(1);

    const [turn] = agentTurns;
    if (turn.kind === 'agentTurn') {
      expect(turn.key).toBe('exec-1');
      expect(turn.status).toBe('completed');
      expect(turn.steps).toHaveLength(3);
      expect(turn.terminal).toBe(finalTerm);
    }
  });

  const pausedRoundWithResume = (resumeExecutionId: string) => {
    const user = createUserMessageEvent({ id: 'user-1' });
    const started1 = createExecutionStartedEvent({
      id: 'es-1',
      execution_id: 'exec-1',
      trigger_event_id: 'user-1',
    });
    const pausedTerm = createExecutionPausedEvent({
      id: 'paused-term-1',
      execution_id: 'exec-1',
    });
    const promptResponse = createPromptResponseEvent({
      id: 'pr-1',
      data: {
        prompt_requested_event_id: 'paused-term-1',
        responses: { 'prompt-1': { allow: true } },
      },
    });
    const started2 = createExecutionStartedEvent({
      id: 'es-2',
      execution_id: resumeExecutionId,
      trigger_event_id: 'pr-1',
    });
    return { pausedTerm, events: [user, started1, pausedTerm, promptResponse, started2] };
  };

  it('fails the turn when the resume fails: the answered prompt is not asked again', () => {
    const { events: baseEvents } = pausedRoundWithResume('exec-2');
    const failed = createExecutionFailedEvent({ id: 'ef-2', execution_id: 'exec-2' });

    const events = [...baseEvents, failed];
    const agentTurns = groupTimelineEvents(events, makeEventsById(events)).filter(
      (item) => item.kind === 'agentTurn'
    );

    expect(agentTurns).toHaveLength(1);
    const [turn] = agentTurns;
    if (turn.kind === 'agentTurn') {
      expect(turn.key).toBe('exec-1');
      expect(turn.status).toBe('failed');
      expect(turn.terminal).toBe(failed);
      expect(turn.pendingPrompts).toBeUndefined();
    }
  });

  it('aborts the turn when the resume is aborted: the answered prompt is not asked again', () => {
    const { events: baseEvents } = pausedRoundWithResume('exec-2');
    const aborted = createExecutionAbortedEvent({ id: 'ea-2', execution_id: 'exec-2' });

    const events = [...baseEvents, aborted];
    const agentTurns = groupTimelineEvents(events, makeEventsById(events)).filter(
      (item) => item.kind === 'agentTurn'
    );

    expect(agentTurns).toHaveLength(1);
    const [turn] = agentTurns;
    if (turn.kind === 'agentTurn') {
      expect(turn.key).toBe('exec-1');
      expect(turn.status).toBe('aborted');
      expect(turn.terminal).toBe(aborted);
      expect(turn.pendingPrompts).toBeUndefined();
    }
  });

  it('fails the turn when the resume of an answered second pause fails', () => {
    const { events: baseEvents } = pausedRoundWithResume('exec-2');
    const pausedTerm2 = createExecutionPausedEvent({ id: 'paused-term-2', execution_id: 'exec-2' });
    const promptResponse2 = createPromptResponseEvent({
      id: 'pr-2',
      data: {
        prompt_requested_event_id: 'paused-term-2',
        responses: { 'prompt-1': { allow: true } },
      },
    });
    const started3 = createExecutionStartedEvent({
      id: 'es-3',
      execution_id: 'exec-3',
      trigger_event_id: 'pr-2',
    });
    const failed = createExecutionFailedEvent({ id: 'ef-3', execution_id: 'exec-3' });

    const events = [...baseEvents, pausedTerm2, promptResponse2, started3, failed];
    const agentTurns = groupTimelineEvents(events, makeEventsById(events)).filter(
      (item) => item.kind === 'agentTurn'
    );

    expect(agentTurns).toHaveLength(1);
    const [turn] = agentTurns;
    if (turn.kind === 'agentTurn') {
      expect(turn.key).toBe('exec-1');
      expect(turn.status).toBe('failed');
      expect(turn.terminal).toBe(failed);
      expect(turn.pendingPrompts).toBeUndefined();
    }
  });

  it('completes the turn when a second answer succeeds after a failed resume', () => {
    const { events: baseEvents } = pausedRoundWithResume('exec-2');
    const failed = createExecutionFailedEvent({ id: 'ef-2', execution_id: 'exec-2' });
    const promptResponse2 = createPromptResponseEvent({
      id: 'pr-2',
      data: {
        prompt_requested_event_id: 'paused-term-1',
        responses: { 'prompt-1': { allow: true } },
      },
    });
    const started3 = createExecutionStartedEvent({
      id: 'es-3',
      execution_id: 'exec-3',
      trigger_event_id: 'pr-2',
    });
    const finalTerm = createExecutionTerminatedEvent({ id: 'et-3', execution_id: 'exec-3' });

    const events = [...baseEvents, failed, promptResponse2, started3, finalTerm];
    const agentTurns = groupTimelineEvents(events, makeEventsById(events)).filter(
      (item) => item.kind === 'agentTurn'
    );

    expect(agentTurns).toHaveLength(1);
    const [turn] = agentTurns;
    if (turn.kind === 'agentTurn') {
      expect(turn.status).toBe('completed');
      expect(turn.terminal).toBe(finalTerm);
      expect(turn.pendingPrompts).toBeUndefined();
    }
  });
});

describe('groupTimelineEvents while a run streams', () => {
  const streamingEvent = (
    data: ExecutionStreamingEvent['data'],
    executionId = 'exec-live'
  ): ExecutionStreamingEvent => ({
    id: 'round-live::execution_terminated',
    type: EXECUTION_STREAMING_EVENT_TYPE,
    created_at: '2026-01-01T00:00:00.000Z',
    actor: { type: EventActorType.agent, id: 'agent-1' },
    execution_id: executionId,
    data,
  });

  it('keeps the turn running and shows the half-written answer', () => {
    const started = createExecutionStartedEvent({ execution_id: 'exec-live' });
    const events = [started, streamingEvent({ message: 'Hel' })];

    const [turn] = groupTimelineEvents(events, makeEventsById(events));

    expect(turn.kind).toBe('agentTurn');
    if (turn.kind === 'agentTurn') {
      expect(turn.status).toBe('running');
      expect(turn.response).toEqual({ message: 'Hel' });
    }
  });

  it('keeps the turn running during streaming even when prompts are expected', () => {
    const started = createExecutionStartedEvent({ execution_id: 'exec-live' });
    const events = [started, streamingEvent({ message: 'thinking' })];

    const [turn] = groupTimelineEvents(events, makeEventsById(events));

    expect(turn.kind).toBe('agentTurn');
    if (turn.kind === 'agentTurn') {
      expect(turn.status).toBe('running');
    }
  });

  it('moves the turn to awaiting_prompt when the terminal event carries a prompt_requested outcome', () => {
    const prompts: PromptRequest[] = [
      { id: 'p1', type: AgentPromptType.ask_user_question, questions: [] },
    ];
    const paused = createExecutionPausedEvent({
      id: 'round-live::execution_terminated',
      execution_id: 'exec-live',
      data: {
        outcome: { type: 'prompt_requested', prompts },
        model_usage: {
          connector_id: '',
          llm_calls: 1,
          input_tokens: 1,
          output_tokens: 1,
        },
        time_to_first_token: 0,
        time_to_last_token: 0,
      },
    });
    const started = createExecutionStartedEvent({ execution_id: 'exec-live' });
    const events = [started, paused];

    const [turn] = groupTimelineEvents(events, makeEventsById(events));

    expect(turn.kind).toBe('agentTurn');
    if (turn.kind === 'agentTurn') {
      expect(turn.status).toBe('awaiting_prompt');
      expect(turn.pendingPrompts).toEqual(prompts);
    }
  });

  it('lets the real terminal replace the streaming answer', () => {
    const started = createExecutionStartedEvent({ execution_id: 'exec-live' });
    const terminated = createExecutionTerminatedEvent({ execution_id: 'exec-live' });
    const events = [started, streamingEvent({ message: 'half' }), terminated];

    const [turn] = groupTimelineEvents(events, makeEventsById(events));

    expect(turn.kind).toBe('agentTurn');
    if (turn.kind === 'agentTurn') {
      expect(turn.status).toBe('completed');
      expect(turn.terminal).toBe(terminated);
    }
  });
});

describe('buildItems', () => {
  it('resolves origin from the trigger event for execution items', () => {
    const origin = { type: ConversationOriginType.Slack };
    const userMsg = createUserMessageEvent({
      id: 'user-origin-1',
      actor: { type: EventActorType.user, id: 'u1', origin },
    });
    const terminated = createExecutionTerminatedEvent({
      execution_id: 'exec-origin-1',
      trigger_event_id: 'user-origin-1',
    });

    const items = buildItems([userMsg, terminated]);

    expect(items).toHaveLength(2);
    const [, execItem] = items;
    expect(execItem.kind).toBe('agentTurn');
    if (execItem.kind === 'agentTurn') {
      expect(execItem.status).toBe('completed');
      expect(execItem.origin).toEqual(origin);
    }
  });

  it('leaves origin undefined when trigger event is absent', () => {
    const terminated = createExecutionTerminatedEvent({ execution_id: 'exec-no-trigger' });

    const items = buildItems([terminated]);

    expect(items).toHaveLength(1);
    const [execItem] = items;
    expect(execItem.kind).toBe('agentTurn');
    if (execItem.kind === 'agentTurn') {
      expect(execItem.origin).toBeUndefined();
    }
  });

  it('emits agentTurn running for in-flight executions and completed for terminated ones', () => {
    const inFlight = createExecutionStartedEvent({ execution_id: 'exec-in-flight' });
    const terminated = createExecutionTerminatedEvent({ execution_id: 'exec-done' });

    const items = buildItems([inFlight, terminated]);

    expect(items).toHaveLength(2);
    const [inFlightItem, doneItem] = items;

    expect(inFlightItem.kind).toBe('agentTurn');
    if (inFlightItem.kind === 'agentTurn') expect(inFlightItem.status).toBe('running');

    expect(doneItem.kind).toBe('agentTurn');
    if (doneItem.kind === 'agentTurn') expect(doneItem.status).toBe('completed');
  });

  it('returns only the given items when there is nothing else to merge', () => {
    const userMsg = createUserMessageEvent({ id: 'u1' });
    const terminated = createExecutionTerminatedEvent({ execution_id: 'e1' });

    const items = buildItems([userMsg, terminated]);

    expect(items).toHaveLength(2);
    expect(items[0].kind).toBe('userMessage');
    expect(items[1].kind).toBe('agentTurn');
  });
});

describe('groupTimelineEvents attachment refs', () => {
  const ref = (attachment_id: string, version: number) => ({ attachment_id, version });
  const turn = (n: number, refs: Array<{ attachment_id: string; version: number }>) => [
    createUserMessageEvent({
      id: `user-${n}`,
      data: { message: `message ${n}`, attachment_refs: refs },
    }),
    createExecutionStartedEvent({
      id: `started-${n}`,
      execution_id: `execution-${n}`,
      trigger_event_id: `user-${n}`,
    }),
    createExecutionTerminatedEvent({
      id: `terminated-${n}`,
      execution_id: `execution-${n}`,
      trigger_event_id: `user-${n}`,
    }),
  ];
  const turns = (events: TimelineDisplayEvent[]) =>
    groupTimelineEvents(events, makeEventsById(events)).filter((item) => item.kind === 'agentTurn');

  it('gives each turn the highest version of every attachment referenced so far', () => {
    const events = [
      ...turn(1, [ref('a', 1), ref('b', 1)]),
      ...turn(2, [ref('a', 2)]),
      ...turn(3, []),
    ];

    const [first, second, third] = turns(events);

    expect(first).toMatchObject({ attachmentRefs: [ref('a', 1), ref('b', 1)] });
    expect(second).toMatchObject({ attachmentRefs: [ref('a', 2), ref('b', 1)] });
    expect(third).toMatchObject({ attachmentRefs: [ref('a', 2), ref('b', 1)] });
  });

  it("keeps the trigger message's own refs separately", () => {
    const events = [...turn(1, [ref('a', 1)]), ...turn(2, [ref('b', 1)])];

    const [first, second] = turns(events);

    expect(first).toMatchObject({ triggerAttachmentRefs: [ref('a', 1)] });
    expect(second).toMatchObject({ triggerAttachmentRefs: [ref('b', 1)] });
  });

  it('counts refs carried by a prompt response', () => {
    const events = [
      ...turn(1, [ref('a', 1)]),
      createPromptResponseEvent({
        id: 'prompt-response-1',
        data: {
          prompt_requested_event_id: 'prompt-1',
          responses: {},
          input: { message: '', attachment_refs: [ref('a', 2)] },
        },
      }),
      createExecutionStartedEvent({
        id: 'started-2',
        execution_id: 'execution-2',
        trigger_event_id: 'prompt-response-1',
      }),
    ];

    const [, second] = turns(events);

    expect(second).toMatchObject({ attachmentRefs: [ref('a', 2)] });
    expect(second).not.toHaveProperty('triggerAttachmentRefs');
  });

  it('sets nothing when no attachments were referenced', () => {
    const [only] = turns(turn(1, []));

    expect(only).not.toHaveProperty('attachmentRefs');
    expect(only).not.toHaveProperty('triggerAttachmentRefs');
  });
});

describe('groupTimelineEvents with events outside the built-in set', () => {
  const user = createUserMessageEvent({ id: 'user-1' });
  const started = createExecutionStartedEvent({ id: 'es-1', execution_id: 'exec-1' });
  const terminated = createExecutionTerminatedEvent({ id: 'et-1', execution_id: 'exec-1' });

  it('emits an unresolved custom event item keyed by the event id', () => {
    const custom = createCustomEvent({ id: 'note-1' });

    const items = buildItems([user, started, terminated, custom]);

    expect(items).toHaveLength(3);
    expect(items[2]).toEqual({ kind: 'customEvent', key: 'note-1', event: custom });
  });

  it('keeps array order, so a custom event between two turns sits between them', () => {
    const custom = createCustomEvent({ id: 'note-1' });
    const user2 = createUserMessageEvent({ id: 'user-2' });
    const started2 = createExecutionStartedEvent({ id: 'es-2', execution_id: 'exec-2' });
    const terminated2 = createExecutionTerminatedEvent({ id: 'et-2', execution_id: 'exec-2' });

    const items = buildItems([user, started, terminated, custom, user2, started2, terminated2]);

    expect(items.map((item) => item.key)).toEqual([
      'user-1',
      'exec-1',
      'note-1',
      'user-2',
      'exec-2',
    ]);
  });

  it('places a custom event that fell mid-execution after the whole execution', () => {
    const custom = createCustomEvent({ id: 'note-1' });
    const step = createExecutionStepEvent({ id: 'step-1', execution_id: 'exec-1' });
    const step2 = createExecutionStepEvent({ id: 'step-2', execution_id: 'exec-1' });

    const items = buildItems([user, started, step, custom, step2, terminated]);

    expect(items.map((item) => item.key)).toEqual(['user-1', 'exec-1', 'note-1']);
    expect(items[1].kind === 'agentTurn' && items[1].steps).toHaveLength(2);
  });

  it('still marks the pending user message when a custom event follows it', () => {
    const custom = createCustomEvent({ id: 'note-1' });

    const items = buildItems([user, custom], 'user-1');

    expect(items[0]).toEqual({ kind: 'userMessage', key: 'user-1', event: user, isPending: true });
    expect(items[1].kind).toBe('customEvent');
  });

  it('still leaves a paused run awaiting the prompt when a custom event follows it', () => {
    const prompts: PromptRequest[] = [
      { id: 'p1', type: AgentPromptType.ask_user_question, questions: [] },
    ];
    const paused = createExecutionPausedEvent({
      id: 'et-1',
      execution_id: 'exec-1',
      data: {
        outcome: { type: 'prompt_requested', prompts },
        model_usage: { connector_id: '', llm_calls: 1, input_tokens: 1, output_tokens: 1 },
        time_to_first_token: 0,
        time_to_last_token: 0,
      },
    });

    const items = buildItems([user, started, paused, createCustomEvent({ id: 'note-1' })]);

    expect(items.map((item) => item.kind)).toEqual(['userMessage', 'agentTurn', 'customEvent']);
    expect(items[1].kind === 'agentTurn' && items[1].status).toBe('awaiting_prompt');
  });
});

describe('groupTimelineEvents with attachment events', () => {
  const user = createUserMessageEvent({ id: 'user-1' });
  const started = createExecutionStartedEvent({ id: 'es-1', execution_id: 'exec-1' });
  const step = createExecutionStepEvent({ id: 'step-1', execution_id: 'exec-1' });
  const terminated = createExecutionTerminatedEvent({ id: 'et-1', execution_id: 'exec-1' });

  it('emits an unresolved attachment item for an added event flagged render_inline', () => {
    const added = createAttachmentAddedEvent({ id: 'aa-1' });

    const items = buildItems([user, started, terminated, added]);

    expect(items).toHaveLength(3);
    expect(items[2]).toEqual({ kind: 'attachment', key: 'aa-1', event: added });
  });

  it('never emits when render_inline is false', () => {
    const added = createAttachmentAddedEvent({
      id: 'aa-1',
      data: { ...createAttachmentAddedEvent().data, render_inline: false },
    });
    const updated = createAttachmentUpdatedEvent({
      id: 'au-1',
      data: { ...createAttachmentUpdatedEvent().data, render_inline: false },
    });

    const items = buildItems([user, started, terminated, added, updated]);

    expect(items.map((item) => item.kind)).toEqual(['userMessage', 'agentTurn']);
  });

  it('gives an updated event its own item keyed by the event id', () => {
    const added = createAttachmentAddedEvent({ id: 'aa-1' });
    const updated = createAttachmentUpdatedEvent({ id: 'au-1' });

    const items = buildItems([user, started, terminated, added, updated]);

    expect(items.map((item) => item.key)).toEqual(['user-1', 'exec-1', 'aa-1', 'au-1']);
    expect(items[3]).toEqual({ kind: 'attachment', key: 'au-1', event: updated });
  });

  it('emits nothing for a deleted event', () => {
    const deleted = {
      ...createAttachmentAddedEvent({ id: 'ad-1' }),
      type: TimelineEventType.attachmentDeleted,
      data: {
        attachment_id: 'attachment-1',
        attachment_type: 'dashboard',
        hard_delete: true,
        source: 'http_api',
      },
    } as unknown as ConversationEvent;

    const items = buildItems([user, started, terminated, deleted]);

    expect(items.map((item) => item.kind)).toEqual(['userMessage', 'agentTurn']);
  });

  it('keeps array order, so an event between two turns sits between them', () => {
    const added = createAttachmentAddedEvent({ id: 'aa-1' });
    const user2 = createUserMessageEvent({ id: 'user-2' });
    const started2 = createExecutionStartedEvent({ id: 'es-2', execution_id: 'exec-2' });
    const terminated2 = createExecutionTerminatedEvent({ id: 'et-2', execution_id: 'exec-2' });

    const items = buildItems([user, started, terminated, added, user2, started2, terminated2]);

    expect(items.map((item) => item.key)).toEqual(['user-1', 'exec-1', 'aa-1', 'user-2', 'exec-2']);
  });

  it('places an event that fell between two step events after the whole execution', () => {
    const added = createAttachmentAddedEvent({ id: 'aa-1' });
    const step2 = createExecutionStepEvent({ id: 'step-2', execution_id: 'exec-1' });

    const items = buildItems([user, started, step, added, step2, terminated]);

    expect(items.map((item) => item.key)).toEqual(['user-1', 'exec-1', 'aa-1']);
    expect(items[1].kind === 'agentTurn' && items[1].steps).toHaveLength(2);
  });
});
