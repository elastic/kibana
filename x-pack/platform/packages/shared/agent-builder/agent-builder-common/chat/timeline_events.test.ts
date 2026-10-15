/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationEvent } from './timeline_events';
import {
  BUILT_IN_CONVERSATION_EVENT_TYPES,
  EventActorType,
  TimelineEventType,
  answeredPromptRequestIds,
  assertValidConversationEventType,
  interruptionOfTerminal,
  isAttachmentEvent,
  isBuiltInConversationEventType,
  isExecutionTerminalEvent,
  lastExecutionTerminal,
  pendingPromptRequest,
} from './timeline_events';
import { AgentPromptType } from '../agents/prompts';

describe('isExecutionTerminalEvent', () => {
  it.each([
    TimelineEventType.executionTerminated,
    TimelineEventType.executionFailed,
    TimelineEventType.executionAborted,
  ])('is true for %s', (type) => {
    expect(isExecutionTerminalEvent({ type })).toBe(true);
  });

  it.each([
    TimelineEventType.executionStarted,
    TimelineEventType.executionStep,
    TimelineEventType.userMessage,
    TimelineEventType.attachmentAdded,
  ])('is false for %s', (type) => {
    expect(isExecutionTerminalEvent({ type })).toBe(false);
  });
});

describe('attachment timeline events', () => {
  const actor = { type: EventActorType.system, id: 'system' };

  it.each([
    TimelineEventType.attachmentAdded,
    TimelineEventType.attachmentUpdated,
    TimelineEventType.attachmentDeleted,
  ])('isAttachmentEvent returns true for %s', (type) => {
    const event = { id: 'e1', type, data: {}, created_at: 'now', actor };
    expect(isAttachmentEvent(event)).toBe(true);
  });

  it('isAttachmentEvent returns false for a non-attachment event', () => {
    expect(isAttachmentEvent({ type: TimelineEventType.userMessage })).toBe(false);
    expect(isAttachmentEvent({ type: 'my_custom_event' })).toBe(false);
  });

  it.each(['attachment_added', 'attachment_updated', 'attachment_deleted'])(
    '%s is a built-in conversation event type',
    (type) => {
      expect(isBuiltInConversationEventType(type)).toBe(true);
      expect(BUILT_IN_CONVERSATION_EVENT_TYPES).toContain(type);
    }
  );
});

describe('assertValidConversationEventType', () => {
  it('accepts a valid custom type', () => {
    expect(() => assertValidConversationEventType('my.custom_event')).not.toThrow();
    expect(() => assertValidConversationEventType('text_note')).not.toThrow();
    expect(() => assertValidConversationEventType('a.b.c')).not.toThrow();
  });

  it('throws when the type contains the id delimiter "::"', () => {
    expect(() => assertValidConversationEventType('bad::type')).toThrow('must not contain "::"');
  });

  it('throws when the type is the reserved word "execution"', () => {
    expect(() => assertValidConversationEventType('execution')).toThrow('reserved');
  });

  it('throws when the type is the reserved word "step"', () => {
    expect(() => assertValidConversationEventType('step')).toThrow('reserved');
  });

  it('throws for every built-in timeline event type', () => {
    for (const builtInType of BUILT_IN_CONVERSATION_EVENT_TYPES) {
      expect(() => assertValidConversationEventType(builtInType)).toThrow(
        'built-in timeline event type'
      );
    }
  });
});

const agent = { type: EventActorType.agent, id: 'agent-1' };
const user = { type: EventActorType.user, id: 'u1' };
const usage = { connector_id: 'c', llm_calls: 1, input_tokens: 1, output_tokens: 1 };

const paused = (id: string, executionId: string): ConversationEvent => ({
  id,
  type: TimelineEventType.executionTerminated,
  created_at: '2026-01-01T00:00:00.000Z',
  actor: agent,
  execution_id: executionId,
  data: {
    model_usage: usage,
    time_to_first_token: 1,
    time_to_last_token: 2,
    outcome: {
      type: 'prompt_requested',
      prompts: [{ id: 'p1', type: AgentPromptType.ask_user_question, questions: [] }],
    },
  },
});

const responded = (id: string, executionId: string): ConversationEvent => ({
  id,
  type: TimelineEventType.executionTerminated,
  created_at: '2026-01-01T00:00:00.000Z',
  actor: agent,
  execution_id: executionId,
  data: {
    model_usage: usage,
    time_to_first_token: 1,
    time_to_last_token: 2,
    outcome: { type: 'responded', response: { message: 'ok' } },
  },
});

const promptResponse = (id: string, answers: string): ConversationEvent => ({
  id,
  type: TimelineEventType.promptResponse,
  created_at: '2026-01-01T00:01:00.000Z',
  actor: user,
  data: { prompt_requested_event_id: answers, responses: {} },
});

const failed = (id: string, executionId: string): ConversationEvent => ({
  id,
  type: TimelineEventType.executionFailed,
  created_at: '2026-01-01T00:02:00.000Z',
  actor: agent,
  execution_id: executionId,
  data: { time_to_last_token: 3, error: { code: 'internalError', message: 'boom' } },
});

const aborted = (id: string, executionId: string, source?: 'api'): ConversationEvent => ({
  id,
  type: TimelineEventType.executionAborted,
  created_at: '2026-01-01T00:02:00.000Z',
  actor: agent,
  execution_id: executionId,
  data: { time_to_last_token: 3, ...(source ? { aborted_by: { source } } : {}) },
});

describe('answeredPromptRequestIds', () => {
  it('is empty without prompt responses', () => {
    expect(answeredPromptRequestIds([paused('t0', 'r1::execution')])).toEqual(new Set());
  });

  it('collects one and several answered request ids', () => {
    expect(
      answeredPromptRequestIds([paused('t0', 'r1::execution'), promptResponse('pr1', 't0')])
    ).toEqual(new Set(['t0']));
    expect(
      answeredPromptRequestIds([
        promptResponse('pr1', 't0'),
        promptResponse('pr2', 't0'),
        promptResponse('pr3', 't5'),
      ])
    ).toEqual(new Set(['t0', 't5']));
  });
});

describe('lastExecutionTerminal', () => {
  it('returns undefined without terminals', () => {
    expect(lastExecutionTerminal([promptResponse('pr1', 't0')])).toBeUndefined();
  });

  it('picks an interrupted terminal over an earlier execution_terminated', () => {
    const events = [paused('t0', 'r1::execution'), failed('f1', 'r1::execution::1')];
    expect(lastExecutionTerminal(events)?.id).toBe('f1');
  });
});

describe('pendingPromptRequest', () => {
  it('is the unanswered pause', () => {
    expect(pendingPromptRequest([paused('t0', 'r1::execution')])?.id).toBe('t0');
  });

  it('is undefined once the pause is answered', () => {
    expect(
      pendingPromptRequest([paused('t0', 'r1::execution'), promptResponse('pr1', 't0')])
    ).toBeUndefined();
  });

  it('is undefined when the last terminal is interrupted', () => {
    expect(
      pendingPromptRequest([
        paused('t0', 'r1::execution'),
        promptResponse('pr1', 't0'),
        failed('f1', 'r1::execution::1'),
      ])
    ).toBeUndefined();
    expect(pendingPromptRequest([aborted('a1', 'r1::execution')])).toBeUndefined();
  });

  it('is undefined when the last terminal responded', () => {
    expect(pendingPromptRequest([responded('t0', 'r1::execution')])).toBeUndefined();
  });

  it('does not mistake an earlier pause for pending behind an interrupted round', () => {
    expect(
      pendingPromptRequest([paused('t0', 'r1::execution'), aborted('a2', 'r2::execution')])
    ).toBeUndefined();
  });
});

describe('interruptionOfTerminal', () => {
  it('maps a failed terminal', () => {
    expect(interruptionOfTerminal(failed('f1', 'r1::execution') as never)).toEqual({
      type: 'failed',
      error: { code: 'internalError', message: 'boom' },
    });
  });

  it('maps an aborted terminal with and without aborted_by', () => {
    expect(interruptionOfTerminal(aborted('a1', 'r1::execution') as never)).toEqual({
      type: 'aborted',
    });
    expect(interruptionOfTerminal(aborted('a1', 'r1::execution', 'api') as never)).toEqual({
      type: 'aborted',
      aborted_by: { source: 'api' },
    });
  });
});
