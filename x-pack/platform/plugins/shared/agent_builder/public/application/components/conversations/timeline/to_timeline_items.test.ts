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
import { groupTimelineEvents, buildItems } from './to_timeline_items';
import { createUserMessageEvent } from './items/user_message_event.factory';
import { createExecutionStartedEvent } from './items/execution_started.factory';
import { createExecutionTerminatedEvent } from './items/execution_terminated_event.factory';
import { createExecutionFailedEvent } from './items/execution_failed_event.factory';
import { createExecutionAbortedEvent } from './items/execution_aborted_event.factory';
import { createExecutionStepEvent } from './items/execution_step.factory';
import { createPromptResponseEvent } from './items/prompt_response_event.factory';
import {
  createConfirmationPrompt,
  createExecutionPausedEvent,
} from './items/execution_paused_event.factory';
import type { ExecutionStreamingEvent, TimelineDisplayEvent } from '../../../../services/events';
import { EXECUTION_STREAMING_EVENT_TYPE } from '../../../../services/events';
import { AgentPromptType } from '@kbn/agent-builder-common/agents';

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

  it('gives an answer no item of its own', () => {
    const events = [createPromptResponseEvent({ id: 'pr-1' })];

    expect(groupTimelineEvents(events, makeEventsById(events))).toEqual([]);
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

describe('groupTimelineEvents for a paused run', () => {
  const PAUSE_ID = 'round-1::execution_terminated';

  const pausedRun = () => {
    const started = createExecutionStartedEvent({ execution_id: 'exec-1' });
    const paused = createExecutionPausedEvent({ id: PAUSE_ID, execution_id: 'exec-1' });
    return { started, paused };
  };

  it('keeps a saved pause open, so a reload shows the same prompt', () => {
    const { started, paused } = pausedRun();
    const events = [started, paused];

    const [turn] = groupTimelineEvents(events, makeEventsById(events));

    expect(turn.kind).toBe('agentTurn');
    if (turn.kind === 'agentTurn') {
      expect(turn.status).toBe('awaiting_prompt');
      expect(turn.pendingPrompts).toEqual([createConfirmationPrompt()]);
      expect(turn.terminal).toBe(paused);
    }
  });

  it('closes the pause once an answer joins back to it', () => {
    const { started, paused } = pausedRun();
    const answer = createPromptResponseEvent({
      id: 'round-1::prompt_response::1',
      data: { prompt_requested_event_id: PAUSE_ID, responses: { 'prompt-1': { allow: true } } },
    });
    const events = [started, paused, answer];

    const items = groupTimelineEvents(events, makeEventsById(events));

    expect(items).toHaveLength(1);
    const [turn] = items;
    expect(turn.kind).toBe('agentTurn');
    if (turn.kind === 'agentTurn') {
      expect(turn.status).toBe('completed');
      expect(turn.pendingPrompts).toBeUndefined();
    }
  });

  it('ignores an answer pointing at a different pause', () => {
    const { started, paused } = pausedRun();
    const answer = createPromptResponseEvent({
      data: { prompt_requested_event_id: 'some-other-pause', responses: {} },
    });
    const events = [started, paused, answer];

    const [turn] = groupTimelineEvents(events, makeEventsById(events));

    expect(turn.kind).toBe('agentTurn');
    if (turn.kind === 'agentTurn') {
      expect(turn.status).toBe('awaiting_prompt');
    }
  });
});

describe('groupTimelineEvents for an answered question', () => {
  // Shapes taken from a real conversation: the question step is saved without answers, and the
  // answers only exist on the prompt_response that resumed the run.
  const ROUND_ID = 'round-1';
  const PROMPT_ID = 'prompt-66199c65';
  const PAUSE_ID = `${ROUND_ID}::execution_terminated`;

  const questionStep = {
    type: ConversationRoundStepType.askUserQuestion,
    prompt_id: PROMPT_ID,
    questions: [
      {
        question: 'Which Kibana app are you most interested in exploring today?',
        options: [{ label: 'Discover' }, { label: 'Dashboard' }],
        multi_select: false,
      },
    ],
  } as const;

  const answeredQuestionEvents = () => [
    createExecutionStartedEvent({ execution_id: `${ROUND_ID}::execution` }),
    createExecutionStepEvent({
      id: `${ROUND_ID}::step::0`,
      execution_id: `${ROUND_ID}::execution`,
      data: { step: questionStep, sequence: 0 },
    }),
    createExecutionPausedEvent({
      id: PAUSE_ID,
      execution_id: `${ROUND_ID}::execution`,
      data: {
        outcome: {
          type: 'prompt_requested',
          prompts: [{ type: AgentPromptType.ask_user_question, id: PROMPT_ID, questions: [] }],
        },
      } as never,
    }),
    createPromptResponseEvent({
      id: `${ROUND_ID}::prompt_response::1`,
      data: {
        prompt_requested_event_id: PAUSE_ID,
        responses: { [PROMPT_ID]: { answers: [{ choice: [0] }] } },
      },
    }),
  ];

  it('joins the answers onto the question step so the turn can show them', () => {
    const events = answeredQuestionEvents();

    const [turn] = groupTimelineEvents(events, makeEventsById(events));

    expect(turn.kind).toBe('agentTurn');
    if (turn.kind === 'agentTurn') {
      expect(turn.status).toBe('completed');
      expect(turn.steps).toEqual([{ ...questionStep, answers: [{ choice: [0] }] }]);
    }
  });

  it('adds no item of its own for the answer, the step already shows it', () => {
    const events = answeredQuestionEvents();

    const items = groupTimelineEvents(events, makeEventsById(events));

    expect(items.map((item) => item.kind)).toEqual(['agentTurn']);
  });
});

describe('groupTimelineEvents across a pause and its resume', () => {
  const ROUND = 'round-1';
  const PAUSE_ID = `${ROUND}::execution_terminated`;
  const question = {
    type: ConversationRoundStepType.askUserQuestion,
    prompt_id: 'prompt-1',
    questions: [{ question: 'Which app?', options: [{ label: 'Discover' }], multi_select: false }],
  } as const;

  const firstRun = () => [
    createExecutionStartedEvent({
      id: `${ROUND}::execution_started`,
      execution_id: `${ROUND}::execution`,
      trigger_event_id: `${ROUND}::user_message`,
    }),
    createExecutionStepEvent({
      id: `${ROUND}::step::0`,
      execution_id: `${ROUND}::execution`,
      data: { step: question, sequence: 0 },
    }),
    createExecutionPausedEvent({
      id: PAUSE_ID,
      execution_id: `${ROUND}::execution`,
      data: {
        outcome: {
          type: 'prompt_requested',
          prompts: [{ type: AgentPromptType.ask_user_question, id: 'prompt-1', questions: [] }],
        },
      } as never,
    }),
  ];

  const answer = () =>
    createPromptResponseEvent({
      id: `${ROUND}::prompt_response::1`,
      data: {
        prompt_requested_event_id: PAUSE_ID,
        responses: { 'prompt-1': { answers: [{ choice: [0] }] } },
      },
    });

  const resumeStart = () =>
    createExecutionStartedEvent({
      id: `${ROUND}::execution::1::execution_started`,
      execution_id: `${ROUND}::execution::1`,
      trigger_event_id: `${ROUND}::prompt_response::1`,
    });

  const resumeEnd = () =>
    createExecutionTerminatedEvent({
      id: `${ROUND}::execution::1::execution_terminated`,
      execution_id: `${ROUND}::execution::1`,
      trigger_event_id: `${ROUND}::prompt_response::1`,
    });

  it('renders the whole round as one turn, keyed by the round', () => {
    const events = [...firstRun(), answer(), resumeStart(), resumeEnd()];

    const items = groupTimelineEvents(events, makeEventsById(events));

    expect(items).toHaveLength(1);
    const [turn] = items;
    expect(turn.kind).toBe('agentTurn');
    if (turn.kind === 'agentTurn') {
      expect(turn.key).toBe(ROUND);
      expect(turn.status).toBe('completed');
      // The question and the final answer live in the same bubble.
      expect(turn.steps).toEqual([{ ...question, answers: [{ choice: [0] }] }]);
      expect(turn.response).toEqual({ message: 'Here is a summary of your active hosts.' });
    }
  });

  it('keeps the turn running while the resume streams, not completed by the pause', () => {
    const events = [...firstRun(), answer(), resumeStart()];

    const [turn] = groupTimelineEvents(events, makeEventsById(events));

    expect(turn.kind).toBe('agentTurn');
    if (turn.kind === 'agentTurn') {
      expect(turn.status).toBe('running');
      expect(turn.terminal).toBeUndefined();
      expect(turn.executionId).toBe(`${ROUND}::execution::1`);
    }
  });

  it('waits on the pause until an answer arrives', () => {
    const events = firstRun();

    const [turn] = groupTimelineEvents(events, makeEventsById(events));

    expect(turn.kind).toBe('agentTurn');
    if (turn.kind === 'agentTurn') {
      expect(turn.status).toBe('awaiting_prompt');
      expect(turn.executionId).toBe(`${ROUND}::execution`);
    }
  });

  it('keeps the round trigger as the turn author, not the answer that resumed it', () => {
    const userMessage = createUserMessageEvent({ id: `${ROUND}::user_message` });
    const events = [userMessage, ...firstRun(), answer(), resumeStart(), resumeEnd()];

    const [, turn] = groupTimelineEvents(events, makeEventsById(events));

    expect(turn.kind).toBe('agentTurn');
    if (turn.kind === 'agentTurn') {
      expect(turn.triggerEventId).toBe(`${ROUND}::user_message`);
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
