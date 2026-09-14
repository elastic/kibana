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
} from '@kbn/agent-builder-common';
import {
  groupThreadEvents,
  toThreadItems,
  activeExecutionToItem,
  ACTIVE_EXECUTION_ITEM_KEY,
} from './to_thread_items';
import { createUserMessageEvent } from './items/user_message.factory';
import { createExecutionStartedEvent } from './items/execution_started.factory';
import { createExecutionTerminatedEvent } from './items/execution_terminated.factory';
import { createExecutionFailedEvent } from './items/execution_failed.factory';
import { createExecutionAbortedEvent } from './items/execution_aborted.factory';
import { createExecutionStepEvent } from './items/execution_step.factory';
import { createPromptResponseEvent } from './items/prompt_response.factory';
import type { ActiveExecutionDraft } from '../../../../services/events/active_execution_reducer';
import type { TimelineEvent } from '@kbn/agent-builder-common';

const makeEventsById = (events: TimelineEvent[]) => new Map(events.map((e) => [e.id, e]));

describe('groupThreadEvents', () => {
  it('returns empty array for empty input', () => {
    expect(groupThreadEvents([], new Map())).toEqual([]);
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
    const items = groupThreadEvents(events, makeEventsById(events));

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
    const items = groupThreadEvents(events, makeEventsById(events));

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
    const items = groupThreadEvents(events, makeEventsById(events));

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
    const items = groupThreadEvents(events, makeEventsById(events));

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
    const items = groupThreadEvents(events, makeEventsById(events));

    expect(items).toHaveLength(1);
    const [execItem] = items;
    expect(execItem.kind).toBe('agentTurn');
    if (execItem.kind === 'agentTurn') {
      expect(execItem.key).toBe('exec-orphan-2');
      expect(execItem.status).toBe('failed');
      expect(execItem.terminal).toBe(terminal);
    }
  });

  it('renders prompt_response as its own promptResponse item', () => {
    const promptResponse = createPromptResponseEvent({ id: 'pr-1' });

    const events = [promptResponse];
    const items = groupThreadEvents(events, makeEventsById(events));

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ kind: 'promptResponse', key: 'pr-1', event: promptResponse });
  });

  it('handles execution_aborted as aborted status', () => {
    const started = createExecutionStartedEvent({ execution_id: 'exec-abort' });
    const aborted = createExecutionAbortedEvent({ execution_id: 'exec-abort' });

    const events = [started, aborted];
    const items = groupThreadEvents(events, makeEventsById(events));

    expect(items).toHaveLength(1);
    const [execItem] = items;
    expect(execItem.kind).toBe('agentTurn');
    if (execItem.kind === 'agentTurn') {
      expect(execItem.status).toBe('aborted');
      expect(execItem.terminal).toBe(aborted);
    }
  });
});

describe('toThreadItems', () => {
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

    const items = toThreadItems({ events: [userMsg, terminated] });

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

    const items = toThreadItems({ events: [terminated] });

    expect(items).toHaveLength(1);
    const [execItem] = items;
    expect(execItem.kind).toBe('agentTurn');
    if (execItem.kind === 'agentTurn') {
      expect(execItem.origin).toBeUndefined();
    }
  });

  it('emits agentTurn running for in-flight persisted executions and completed for terminated ones', () => {
    const inFlight = createExecutionStartedEvent({ execution_id: 'exec-in-flight' });
    const terminated = createExecutionTerminatedEvent({ execution_id: 'exec-done' });

    const items = toThreadItems({ events: [inFlight, terminated] });

    expect(items).toHaveLength(2);
    const [inFlightItem, doneItem] = items;

    expect(inFlightItem.kind).toBe('agentTurn');
    if (inFlightItem.kind === 'agentTurn') expect(inFlightItem.status).toBe('running');

    expect(doneItem.kind).toBe('agentTurn');
    if (doneItem.kind === 'agentTurn') expect(doneItem.status).toBe('completed');
  });

  it('appends a pending user message item with isPending=true', () => {
    const pending = createUserMessageEvent({ id: 'pending::user_message' });

    const items = toThreadItems({ events: [], pendingUserMessage: pending });

    expect(items).toHaveLength(2);
    const [userItem] = items;
    expect(userItem.kind).toBe('userMessage');
    if (userItem.kind === 'userMessage') {
      expect(userItem.event).toBe(pending);
      expect(userItem.isPending).toBe(true);
    }
  });

  it('appends an agentTurn running placeholder with empty steps when pendingUserMessage is set but activeExecution is absent', () => {
    const pending = createUserMessageEvent({ id: 'pending::user_message' });

    const items = toThreadItems({ events: [], pendingUserMessage: pending });

    expect(items).toHaveLength(2);
    const [, execItem] = items;
    expect(execItem.kind).toBe('agentTurn');
    if (execItem.kind === 'agentTurn') {
      expect(execItem.key).toBe(ACTIVE_EXECUTION_ITEM_KEY);
      expect(execItem.status).toBe('running');
      expect(execItem.steps).toHaveLength(0);
    }
  });

  it('appends an agentTurn item from the draft when activeExecution is present', () => {
    const pending = createUserMessageEvent({ id: 'pending::user_message' });
    const draft: ActiveExecutionDraft = {
      status: 'running',
      steps: [],
      message: 'hello',
    };

    const items = toThreadItems({
      events: [],
      pendingUserMessage: pending,
      activeExecution: draft,
    });

    expect(items).toHaveLength(2);
    const [, execItem] = items;
    expect(execItem.kind).toBe('agentTurn');
    if (execItem.kind === 'agentTurn') {
      expect(execItem.key).toBe(ACTIVE_EXECUTION_ITEM_KEY);
      expect(execItem.status).toBe('running');
      expect(execItem.response).toEqual({ message: 'hello' });
    }
  });

  it('appends an agentTurn item even when pendingUserMessage is absent', () => {
    const draft: ActiveExecutionDraft = {
      status: 'running',
      steps: [],
      message: '',
    };

    const items = toThreadItems({ events: [], activeExecution: draft });

    expect(items).toHaveLength(1);
    const [execItem] = items;
    expect(execItem.kind).toBe('agentTurn');
    if (execItem.kind === 'agentTurn') {
      expect(execItem.key).toBe(ACTIVE_EXECUTION_ITEM_KEY);
      expect(execItem.status).toBe('running');
    }
  });

  it('returns only persisted items when both pendingUserMessage and activeExecution are absent', () => {
    const userMsg = createUserMessageEvent({ id: 'u1' });
    const terminated = createExecutionTerminatedEvent({ execution_id: 'e1' });

    const items = toThreadItems({ events: [userMsg, terminated] });

    expect(items).toHaveLength(2);
    expect(items[0].kind).toBe('userMessage');
    expect(items[1].kind).toBe('agentTurn');
    if (items[1].kind === 'agentTurn') {
      expect(items[1].key).not.toBe(ACTIVE_EXECUTION_ITEM_KEY);
    }
  });
});

describe('activeExecutionToItem', () => {
  it('normalizes running draft', () => {
    const draft: ActiveExecutionDraft = { status: 'running', steps: [], message: 'partial' };
    const item = activeExecutionToItem(draft);
    expect(item.kind).toBe('agentTurn');
    expect(item.status).toBe('running');
    expect(item.key).toBe(ACTIVE_EXECUTION_ITEM_KEY);
    expect(item.response).toEqual({ message: 'partial' });
  });

  it('normalizes awaiting_prompt draft', () => {
    const draft: ActiveExecutionDraft = {
      status: 'awaiting_prompt',
      steps: [],
      message: '',
      pendingPrompts: [],
    };
    const item = activeExecutionToItem(draft);
    expect(item.status).toBe('awaiting_prompt');
    expect(item.response).toBeUndefined();
    expect(item.pendingPrompts).toEqual([]);
  });

  it('omits response when message is empty', () => {
    const draft: ActiveExecutionDraft = { status: 'running', steps: [], message: '' };
    const item = activeExecutionToItem(draft);
    expect(item.response).toBeUndefined();
  });

  // @todo: Add test covering sealed draft vs server events producing deep-equal items
});
