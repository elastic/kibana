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
  groupTimelineEvents,
  toTimelineItems,
  buildSavedItems,
  buildLiveItems,
  assembleTimelineItems,
  activeExecutionToItem,
  findSavedReplacement,
  ACTIVE_EXECUTION_ITEM_KEY,
} from './to_timeline_items';
import { createUserMessageEvent } from './items/user_message_event.factory';
import { createExecutionStartedEvent } from './items/execution_started.factory';
import { createExecutionTerminatedEvent } from './items/execution_terminated_event.factory';
import { createExecutionFailedEvent } from './items/execution_failed_event.factory';
import { createExecutionAbortedEvent } from './items/execution_aborted_event.factory';
import { createExecutionStepEvent } from './items/execution_step.factory';
import { createPromptResponseEvent } from './items/prompt_response_event.factory';
import type { ActiveExecutionDraft } from '../../../../services/events/active_execution_reducer';
import type { TimelineEvent } from '@kbn/agent-builder-common';

const makeEventsById = (events: TimelineEvent[]) => new Map(events.map((e) => [e.id, e]));

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

  it('renders prompt_response as its own promptResponse item', () => {
    const promptResponse = createPromptResponseEvent({ id: 'pr-1' });

    const events = [promptResponse];
    const items = groupTimelineEvents(events, makeEventsById(events));

    expect(items).toHaveLength(1);
    expect(items[0]).toEqual({ kind: 'promptResponse', key: 'pr-1', event: promptResponse });
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

describe('toTimelineItems', () => {
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

    const items = toTimelineItems({ events: [userMsg, terminated] });

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

    const items = toTimelineItems({ events: [terminated] });

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

    const items = toTimelineItems({ events: [inFlight, terminated] });

    expect(items).toHaveLength(2);
    const [inFlightItem, doneItem] = items;

    expect(inFlightItem.kind).toBe('agentTurn');
    if (inFlightItem.kind === 'agentTurn') expect(inFlightItem.status).toBe('running');

    expect(doneItem.kind).toBe('agentTurn');
    if (doneItem.kind === 'agentTurn') expect(doneItem.status).toBe('completed');
  });

  it('appends a pending user message item with isPending=true', () => {
    const pending = createUserMessageEvent({ id: 'pending::user_message' });

    const items = toTimelineItems({ events: [], pendingUserMessage: pending });

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

    const items = toTimelineItems({ events: [], pendingUserMessage: pending });

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

    const items = toTimelineItems({
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

    const items = toTimelineItems({ events: [], activeExecution: draft });

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

    const items = toTimelineItems({ events: [userMsg, terminated] });

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

  it('uses executionId as key when present', () => {
    const draft: ActiveExecutionDraft = {
      status: 'running',
      steps: [],
      message: '',
      executionId: 'exec-real',
    };
    const item = activeExecutionToItem(draft);
    expect(item.key).toBe('exec-real');
    expect(item.executionId).toBe('exec-real');
  });

  it('uses startedAt from draft when present', () => {
    const draft: ActiveExecutionDraft = {
      status: 'running',
      steps: [],
      message: '',
      startedAt: '2026-01-01T00:00:00.000Z',
    };
    const item = activeExecutionToItem(draft);
    expect(item.startedAt).toBe('2026-01-01T00:00:00.000Z');
  });

  it('sealed draft maps to completed agentTurn with terminal event and response', () => {
    const terminal = createExecutionTerminatedEvent({
      id: 'term-1',
      execution_id: 'exec-sealed',
    });
    const draft: ActiveExecutionDraft = {
      status: 'completed',
      steps: [],
      message: '',
      executionId: 'exec-sealed',
      startedAt: '2026-06-01T10:00:00.000Z',
      terminalEvent: terminal,
    };
    const item = activeExecutionToItem(draft);
    expect(item.status).toBe('completed');
    expect(item.key).toBe('exec-sealed');
    expect(item.terminal).toBe(terminal);
    expect(item.response).toEqual({ message: 'Here is a summary of your active hosts.' });
  });

  it('sealed draft with prompt_requested outcome does not set response', () => {
    const terminal = createExecutionTerminatedEvent({
      id: 'term-pr',
      execution_id: 'exec-pr',
      data: {
        steps: [],
        model_usage: {
          connector_id: '',
          llm_calls: 1,
          input_tokens: 10,
          output_tokens: 5,
          model: 'test',
        },
        time_to_first_token: 100,
        time_to_last_token: 200,
        outcome: { type: 'prompt_requested', prompts: [] },
      },
    });
    const draft: ActiveExecutionDraft = {
      status: 'completed',
      steps: [],
      message: '',
      terminalEvent: terminal,
    };
    const item = activeExecutionToItem(draft);
    expect(item.status).toBe('completed');
    expect(item.response).toBeUndefined();
  });
});

describe('toTimelineItems - dedupe', () => {
  const completedDraft = (executionId: string, triggerEventId?: string): ActiveExecutionDraft => ({
    status: 'completed',
    steps: [],
    message: '',
    executionId,
    triggerEventId,
    terminalEvent: createExecutionTerminatedEvent({ execution_id: executionId }),
  });

  it('drops the draft when a completed persisted turn with the same executionId exists', () => {
    const terminated = createExecutionTerminatedEvent({
      id: 'term-1',
      execution_id: 'exec-real',
    });

    const items = toTimelineItems({
      events: [terminated],
      activeExecution: completedDraft('exec-real'),
    });

    const agentTurns = items.filter((it) => it.kind === 'agentTurn');
    expect(agentTurns).toHaveLength(1);
    expect(agentTurns[0].key).toBe('exec-real');
  });

  it('appends the draft when its executionId is not yet in persisted items', () => {
    const terminated = createExecutionTerminatedEvent({
      id: 'term-other',
      execution_id: 'exec-other',
    });
    const draft: ActiveExecutionDraft = {
      status: 'running',
      steps: [],
      message: 'in flight',
      executionId: 'exec-new',
    };

    const items = toTimelineItems({ events: [terminated], activeExecution: draft });

    const agentTurns = items.filter((it) => it.kind === 'agentTurn');
    expect(agentTurns).toHaveLength(2);
    expect(agentTurns.map((it) => it.key)).toEqual(['exec-other', 'exec-new']);
  });

  it('gives the live turn and its saved replacement the same key', () => {
    const live = toTimelineItems({
      events: [],
      activeExecution: completedDraft('exec-1'),
    });
    const saved = toTimelineItems({
      events: [createExecutionTerminatedEvent({ id: 'term-1', execution_id: 'exec-1' })],
    });
    expect(live[0].key).toBe('exec-1');
    expect(saved[0].key).toBe('exec-1');
  });

  it('drops the pending user message once the saved user message it triggered is present', () => {
    const savedUser = createUserMessageEvent({ id: 'round-1::user_message' });
    const pending = createUserMessageEvent({ id: 'pending::user_message' });

    const items = toTimelineItems({
      events: [savedUser],
      pendingUserMessage: pending,
      activeExecution: completedDraft('exec-1', 'round-1::user_message'),
    });

    const userMessages = items.filter((it) => it.kind === 'userMessage');
    expect(userMessages).toHaveLength(1);
    expect(userMessages[0].key).toBe('round-1::user_message');
  });

  it('keeps the pending user message when the saved user message is not the trigger', () => {
    const savedUser = createUserMessageEvent({ id: 'round-0::user_message' });
    const pending = createUserMessageEvent({ id: 'pending::user_message' });

    const items = toTimelineItems({
      events: [savedUser],
      pendingUserMessage: pending,
      activeExecution: completedDraft('exec-1', 'round-1::user_message'),
    });

    expect(items.filter((it) => it.kind === 'userMessage')).toHaveLength(2);
  });

  it('keeps the pending user message while the trigger id is unknown', () => {
    const savedUser = createUserMessageEvent({ id: 'round-1::user_message' });
    const pending = createUserMessageEvent({ id: 'pending::user_message' });

    const items = toTimelineItems({
      events: [savedUser],
      pendingUserMessage: pending,
      activeExecution: { status: 'running', steps: [], message: '' },
    });

    expect(items.filter((it) => it.kind === 'userMessage')).toHaveLength(2);
  });
});

describe('findSavedReplacement', () => {
  it('reports both replacements once the saved user message and completed turn exist', () => {
    const saved = buildSavedItems([
      createUserMessageEvent({ id: 'round-1::user_message' }),
      createExecutionTerminatedEvent({ id: 'term-1', execution_id: 'exec-1' }),
    ]);

    expect(
      findSavedReplacement(saved, {
        executionId: 'exec-1',
        triggerEventId: 'round-1::user_message',
      })
    ).toEqual({ turn: true, userMessage: true });
  });

  it('reports nothing for a draft without identity or without saved counterparts', () => {
    const saved = buildSavedItems([createUserMessageEvent({ id: 'round-1::user_message' })]);

    expect(findSavedReplacement(saved, null)).toEqual({ turn: false, userMessage: false });
    expect(findSavedReplacement(saved, { executionId: 'exec-1', triggerEventId: 'other' })).toEqual(
      {
        turn: false,
        userMessage: false,
      }
    );
  });
});

describe('assembleTimelineItems', () => {
  it('reuses saved items without modifying them as live content changes', () => {
    const savedItems = buildSavedItems([createUserMessageEvent({ id: 'saved-user' })]);
    const draft: ActiveExecutionDraft = {
      status: 'running',
      steps: [],
      message: 'Hello',
      executionId: 'live-execution',
    };
    const firstLiveItems = buildLiveItems({ activeExecution: draft });
    const firstItems = assembleTimelineItems(savedItems, firstLiveItems);
    const nextLiveItems = buildLiveItems({
      activeExecution: { ...draft, message: 'Hello again' },
    });
    const nextItems = assembleTimelineItems(savedItems, nextLiveItems);

    expect(savedItems).toHaveLength(1);
    expect(firstLiveItems).toHaveLength(1);
    expect(firstItems[0]).toBe(savedItems[0]);
    expect(nextItems[0]).toBe(savedItems[0]);
    expect(firstItems[1]).toBe(firstLiveItems[0]);
    expect(nextItems[1]).toBe(nextLiveItems[0]);
    expect(firstItems[1]).toMatchObject({ response: { message: 'Hello' } });
    expect(nextItems[1]).toMatchObject({ response: { message: 'Hello again' } });
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
  const turns = (events: TimelineEvent[]) =>
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
