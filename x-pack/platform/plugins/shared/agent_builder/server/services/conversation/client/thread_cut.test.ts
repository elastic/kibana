/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CompactionSummary, Conversation, TimelineEvent } from '@kbn/agent-builder-common';
import { EventActorType, TimelineEventType } from '@kbn/agent-builder-common';
import {
  completedRoundTimeline,
  eventsNativeConversation,
  failedExec0Timeline,
  pausedRoundTimeline,
  userMessageEvent,
} from '../../../test_utils/timeline';
import { eventsToRounds } from './events_to_rounds';
import { copyForThread, cutIndexForThread, toThreadView } from './thread_cut';

const terminalOf = (events: TimelineEvent[], roundId: string) => {
  const terminal = events.find(
    (event) =>
      event.type === TimelineEventType.executionTerminated && event.id.startsWith(`${roundId}::`)
  );

  if (!terminal) {
    throw new Error(`no terminal for ${roundId}`);
  }

  return terminal;
};

const conversationOf = (events: TimelineEvent[], summary?: CompactionSummary): Conversation => ({
  ...eventsNativeConversation(events),
  rounds: eventsToRounds(events),
  ...(summary ? { state: { compaction_summary: summary } } : {}),
});

const summaryOf = (overrides: Partial<CompactionSummary>): CompactionSummary => ({
  summarized_round_count: 1,
  created_at: '2026-01-01T00:00:00.000Z',
  token_count: 10,
  structured_data: {} as CompactionSummary['structured_data'],
  ...overrides,
});

const twoRounds = [...completedRoundTimeline('r1'), ...completedRoundTimeline('r2')];

describe('cutIndexForThread', () => {
  it('copies nothing from an empty parent', () => {
    expect(cutIndexForThread([])).toBe(0);
  });

  it('cuts after the last terminal event by default', () => {
    const events = [
      ...twoRounds,
      {
        id: 'activity-1',
        type: 'title_updated',
        created_at: '2026-01-01T00:00:00.000Z',
        actor: { type: EventActorType.agent, id: 'agent-1' },
        data: { previous_title: 'a', title: 'b' },
      } as unknown as TimelineEvent,
    ];

    expect(cutIndexForThread(events)).toBe(twoRounds.length);
  });

  it('extends the default cut over trailing standalone messages', () => {
    const standalone = { ...userMessageEvent('standalone'), id: 'standalone-message' };

    expect(cutIndexForThread([...twoRounds, standalone])).toBe(twoRounds.length + 1);
  });

  it('cuts a failed turn in by default, since it ended', () => {
    const events = [...completedRoundTimeline('r1'), ...failedExec0Timeline('r2')];

    expect(cutIndexForThread(events)).toBe(events.length);
  });

  it('leaves a round paused on a prompt out of the default cut', () => {
    const events = [...completedRoundTimeline('r1'), ...pausedRoundTimeline('r2')];

    expect(cutIndexForThread(events)).toBe(completedRoundTimeline('r1').length);
  });

  it('cuts just before a user message', () => {
    expect(cutIndexForThread(twoRounds, 'r2::user_message')).toBe(
      completedRoundTimeline('r1').length
    );
  });

  it('cuts just after an execution terminated event', () => {
    const terminal = terminalOf(twoRounds, 'r1');

    expect(cutIndexForThread(twoRounds, terminal.id)).toBe(twoRounds.indexOf(terminal) + 1);
  });

  it('refuses a cut at a turn paused on a prompt', () => {
    const events = [...completedRoundTimeline('r1'), ...pausedRoundTimeline('r2')];

    expect(() => cutIndexForThread(events, terminalOf(events, 'r2').id)).toThrow(
      /paused on a prompt/
    );
  });

  it('refuses a cut at any other event or an unknown id', () => {
    const started = twoRounds.find((event) => event.type === TimelineEventType.executionStarted);

    expect(() => cutIndexForThread(twoRounds, started?.id)).toThrow(/not a user message/);
    expect(() => cutIndexForThread(twoRounds, 'missing')).toThrow(/not a user message/);
  });
});

describe('copyForThread', () => {
  it('copies events up to the cut unchanged, with their rounds', () => {
    const copy = copyForThread(conversationOf(twoRounds), 'r2::user_message');

    expect(copy.events).toEqual(completedRoundTimeline('r1'));
    expect(copy.rounds.map(({ id }) => id)).toEqual(['r1']);
    expect(copy.cutEventId).toBe(terminalOf(twoRounds, 'r1').id);
  });

  it('copies nothing from a parent without events', () => {
    expect(copyForThread(conversationOf([]))).toEqual({ events: [], rounds: [] });
  });

  it('keeps the compaction summary when every round it covers is copied', () => {
    const summary = summaryOf({
      covered_round_ids: ['r1'],
      summarized_up_to: { event_id: terminalOf(twoRounds, 'r1').id },
    });

    const copy = copyForThread(conversationOf(twoRounds, summary), 'r2::user_message');

    expect(copy.compactionSummary).toBe(summary);
  });

  it('drops the compaction summary when it covers a round past the cut', () => {
    const summary = summaryOf({
      summarized_round_count: 2,
      covered_round_ids: ['r1', 'r2'],
      summarized_up_to: { event_id: terminalOf(twoRounds, 'r2').id },
    });

    const copy = copyForThread(conversationOf(twoRounds, summary), 'r2::user_message');

    expect(copy.compactionSummary).toBeUndefined();
  });
});

describe('toThreadView', () => {
  it('drops the events copied from the parent and their rounds', () => {
    const threadStarted = {
      id: 'thread-started',
      type: TimelineEventType.threadStarted,
      created_at: '2026-01-01T00:02:00.000Z',
      actor: { type: EventActorType.user, id: 'u1', username: 'user1' },
      data: { parent_conversation_id: 'parent', parent_title: 'Parent' },
    } as TimelineEvent;
    const events = [
      ...completedRoundTimeline('r1'),
      threadStarted,
      ...completedRoundTimeline('r2'),
    ];

    const view = toThreadView(conversationOf(events));

    expect(view.events).toEqual([threadStarted, ...completedRoundTimeline('r2')]);
    expect(view.rounds.map(({ id }) => id)).toEqual(['r2']);
  });

  it('returns a conversation without thread_started as is', () => {
    const conversation = conversationOf(twoRounds);

    expect(toThreadView(conversation)).toBe(conversation);
  });
});
