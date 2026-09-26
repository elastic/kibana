/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CompactionSummary,
  ConversationRoundStep,
  ReasoningStep,
  ToolCallStep,
} from '@kbn/agent-builder-common';
import {
  ConversationRoundStepType,
  EventActorType,
  TimelineEventType,
  ToolResultType,
} from '@kbn/agent-builder-common';
import {
  eventsNativeConversation,
  pausedRoundTimeline,
  timelineFromRounds,
} from '../../../../test_utils/timeline';
import type { ProcessedConversation } from './prepare_conversation';
import {
  eventsForContext,
  groupTimelineEntries,
  isTimelineRound,
  type ProcessedTimelineEvent,
  type TimelineRound,
} from './context_timeline';
import {
  FULLY_VISIBLE,
  fullyCoveredRoundIds,
  groupStepCycles,
  historyView,
  listVisibleUnits,
  resolveVisibility,
  translateLegacySummary,
  unitAnchor,
  type ContextUnit,
} from './context_coverage';

const call = (id: string, group = `g-${id}`): ToolCallStep => ({
  type: ConversationRoundStepType.toolCall,
  tool_call_id: id,
  tool_id: 'my.tool',
  tool_call_group_id: group,
  params: {},
  results: [{ tool_result_id: `r-${id}`, type: ToolResultType.other, data: {} }],
  progression: [],
});

const reasoning = (text: string, group?: string): ReasoningStep => ({
  type: ConversationRoundStepType.reasoning,
  reasoning: text,
  ...(group ? { tool_call_group_id: group } : {}),
});

const standaloneMessage = (id: string): ProcessedTimelineEvent =>
  ({
    id,
    type: TimelineEventType.userMessage,
    created_at: new Date(0).toISOString(),
    actor: { type: EventActorType.user, id: 'u1', username: 'user1' },
    data: { message: 'standalone', attachments: [] },
  } as unknown as ProcessedTimelineEvent);

const conversationOf = (timeline: ProcessedTimelineEvent[]): ProcessedConversation =>
  ({
    timeline,
    nextInput: { message: 'next', attachments: [] },
    attachments: [],
    attachmentTypes: [],
  } as unknown as ProcessedConversation);

const input = (message: string) => ({ message, attachments: [] });

/** Rounds `a` (two cycles), `b` (one cycle), then a standalone message and round `c` (no steps). */
const fixture = () => {
  const timeline = [
    ...timelineFromRounds([
      { id: 'a', input: input('first'), steps: [call('a1'), call('a2')] },
      { id: 'b', input: input('second'), steps: [call('b1')] },
    ]),
    standaloneMessage('sm'),
    ...timelineFromRounds([{ id: 'c', input: input('third'), steps: [] }]),
  ];
  const { entries } = historyView(conversationOf(timeline));
  const rounds = entries.filter(isTimelineRound) as Array<TimelineRound<ProcessedTimelineEvent>>;
  return { entries, rounds };
};

describe('groupStepCycles', () => {
  it('returns no cycle for no steps and a single cycle without tool calls', () => {
    expect(groupStepCycles([])).toEqual([]);
    expect(groupStepCycles([reasoning('x'), reasoning('y')])).toEqual([{ start: 0, end: 1 }]);
  });

  it('ends each cycle with its tool call group and joins trailing steps to the last one', () => {
    const steps: ConversationRoundStep[] = [
      reasoning('first', 'g1'),
      call('c1', 'g1'),
      call('c2', 'g1'),
      reasoning('second', 'g2'),
      call('c3', 'g2'),
      { type: ConversationRoundStepType.updateTodos, todos: [] },
    ];
    expect(groupStepCycles(steps)).toEqual([
      { start: 0, end: 2 },
      { start: 3, end: 5 },
    ]);
  });
});

describe('historyView', () => {
  it('keeps every entry and the next input when nothing is paused', () => {
    const timeline = timelineFromRounds([{ id: 'a', input: input('first') }]);
    const view = historyView(conversationOf(timeline), '2026-01-01T00:00:00.000Z');
    expect(view.entries).toHaveLength(1);
    expect(view.input).toEqual(input('next'));
    expect(view.inputTimestamp).toBe('2026-01-01T00:00:00.000Z');
  });

  it('leaves out the round paused on a prompt and uses its user message as the input', () => {
    const timeline = [
      ...timelineFromRounds([{ id: 'a', input: input('first') }]),
      ...(eventsForContext(eventsNativeConversation(pausedRoundTimeline('p', ['c1']))).map(
        (event) =>
          event.type === TimelineEventType.userMessage
            ? { ...event, data: { ...event.data, attachments: [] } }
            : event
      ) as ProcessedTimelineEvent[]),
    ];
    const view = historyView(conversationOf(timeline));
    expect(view.entries.map((entry) => (isTimelineRound(entry) ? entry.id : 'message'))).toEqual([
      'a',
    ]);
    expect(view.input).toEqual(expect.objectContaining({ message: 'hello p' }));
  });
});

describe('resolveVisibility', () => {
  const resolve = (
    entries: ReturnType<typeof fixture>['entries'],
    cursor: Parameters<typeof resolveVisibility>[0]['cursor'],
    steps: ConversationRoundStep[] = []
  ) => resolveVisibility({ entries, roundId: 'current', steps, cursor });

  it('leaves everything visible without a cursor or when the anchor is not found', () => {
    const { entries } = fixture();
    expect(resolve(entries, undefined)).toEqual(FULLY_VISIBLE);
    expect(resolve(entries, { round_id: 'a', tool_call_id: 'unknown' })).toEqual(FULLY_VISIBLE);
    expect(resolve(entries, { round_id: 'unknown', tool_call_id: 'a1' })).toEqual(FULLY_VISIBLE);
  });

  it('hides the rounds up to a terminal anchor', () => {
    const { entries, rounds } = fixture();
    expect(resolve(entries, { event_id: rounds[0].terminal.id })).toEqual({
      hiddenEntryCount: 1,
      entryFromStep: 0,
      currentFromStep: 0,
    });
  });

  it('keeps the rest of a round anchored on one of its middle cycles', () => {
    const { entries } = fixture();
    expect(resolve(entries, { round_id: 'a', tool_call_id: 'a1' })).toEqual({
      hiddenEntryCount: 0,
      entryFromStep: 1,
      currentFromStep: 0,
    });
  });

  it('hides a round anchored on its last cycle', () => {
    const { entries } = fixture();
    expect(resolve(entries, { round_id: 'a', tool_call_id: 'a2' })).toEqual({
      hiddenEntryCount: 1,
      entryFromStep: 0,
      currentFromStep: 0,
    });
  });

  it('hides up to a standalone message anchor', () => {
    const { entries } = fixture();
    expect(resolve(entries, { event_id: 'sm' })).toEqual({
      hiddenEntryCount: 3,
      entryFromStep: 0,
      currentFromStep: 0,
    });
  });

  it('hides the history and the current cycles up to a current-run anchor', () => {
    const { entries } = fixture();
    const steps = [call('x1'), call('x2')];
    expect(resolve(entries, { round_id: 'current', tool_call_id: 'x1' }, steps)).toEqual({
      hiddenEntryCount: entries.length,
      entryFromStep: 0,
      currentFromStep: 1,
    });
  });

  it('resolves a tool call id reused across rounds in the round of the anchor', () => {
    const { entries } = fixture();
    const steps = [call('a1'), call('x2')];
    expect(resolve(entries, { round_id: 'current', tool_call_id: 'a1' }, steps)).toEqual({
      hiddenEntryCount: entries.length,
      entryFromStep: 0,
      currentFromStep: 1,
    });
    expect(resolve(entries, { round_id: 'a', tool_call_id: 'a1' }, steps)).toEqual({
      hiddenEntryCount: 0,
      entryFromStep: 1,
      currentFromStep: 0,
    });
  });
});

describe('listVisibleUnits', () => {
  const describeUnit = (unit: ContextUnit) =>
    unit.kind === 'message'
      ? 'message'
      : unit.kind === 'round_cycle'
      ? `${unit.round.id}:${unit.range?.start ?? '-'}:${unit.first ? 'first' : ''}${
          unit.last ? 'last' : ''
        }`
      : `current:${unit.range.start}`;

  it('lists history cycles, standalone messages and current cycles in render order', () => {
    const { entries } = fixture();
    const units = listVisibleUnits({
      entries,
      steps: [call('x1'), call('x2')],
      visibility: FULLY_VISIBLE,
    });
    expect(units.map(describeUnit)).toEqual([
      'a:0:first',
      'a:1:last',
      'b:0:firstlast',
      'message',
      'c:-:firstlast',
      'current:0',
      'current:1',
    ]);
  });

  it('starts from the visible cycles of a partially covered round and of the current run', () => {
    const { entries } = fixture();
    const units = listVisibleUnits({
      entries,
      steps: [call('x1'), call('x2')],
      visibility: { hiddenEntryCount: 0, entryFromStep: 1, currentFromStep: 1 },
    });
    expect(units.map(describeUnit)).toEqual([
      'a:1:last',
      'b:0:firstlast',
      'message',
      'c:-:firstlast',
      'current:1',
    ]);
  });
});

describe('unitAnchor', () => {
  it('anchors history units on their last call, else on the round terminal or message id', () => {
    const { entries, rounds } = fixture();
    const units = listVisibleUnits({ entries, steps: [], visibility: FULLY_VISIBLE });
    const anchors = units.map((unit) =>
      unitAnchor(unit, { roundId: 'current', steps: [], renderState: {} })
    );
    expect(anchors).toEqual([
      { round_id: 'a', tool_call_id: 'a1' },
      { round_id: 'a', tool_call_id: 'a2' },
      { round_id: 'b', tool_call_id: 'b1' },
      { event_id: 'sm' },
      { event_id: rounds[2].terminal.id },
    ]);
  });

  it('anchors current cycles on their last persisted call only', () => {
    const steps = [call('s1', 'g'), call('b1', 'g'), call('b2')];
    const renderState = {
      s1: { toolName: 's', kind: 'server' as const },
      b1: { toolName: 'b', kind: 'browser' as const },
      b2: { toolName: 'b', kind: 'browser' as const },
    };
    const units = listVisibleUnits({ entries: [], steps, visibility: FULLY_VISIBLE });
    expect(
      units.map((unit) => unitAnchor(unit, { roundId: 'current', steps, renderState }))
    ).toEqual([{ round_id: 'current', tool_call_id: 's1' }, undefined]);
  });
});

describe('fullyCoveredRoundIds', () => {
  it('lists the hidden rounds only', () => {
    const { entries } = fixture();
    expect(
      fullyCoveredRoundIds(entries, { hiddenEntryCount: 3, entryFromStep: 0, currentFromStep: 0 })
    ).toEqual(['a', 'b']);
    expect(
      fullyCoveredRoundIds(entries, { hiddenEntryCount: 0, entryFromStep: 1, currentFromStep: 0 })
    ).toEqual([]);
  });
});

describe('translateLegacySummary', () => {
  const summary = (parts: Partial<CompactionSummary>): CompactionSummary => ({
    summarized_round_count: 0,
    created_at: '2026-01-01T00:00:00.000Z',
    token_count: 10,
    structured_data: {
      discussion_summary: 's',
      user_intent: 'i',
      key_topics: [],
      entities: [],
      outcomes_and_decisions: [],
      unanswered_questions: [],
      agent_actions: [],
      tool_calls_summary: [],
    },
    ...parts,
  });

  const twoRounds = () => {
    const timeline = timelineFromRounds([
      { id: 'a', input: input('first') },
      { id: 'b', input: input('second') },
      { id: 'c', input: input('third') },
    ]);
    return groupTimelineEntries(timeline) as Array<TimelineRound<ProcessedTimelineEvent>>;
  };

  it('keeps a summary that already has a cursor', () => {
    const withCursor = summary({ summarized_up_to: { round_id: 'a', tool_call_id: 'x' } });
    expect(
      translateLegacySummary({
        summary: withCursor,
        entries: twoRounds(),
        legacyEligibleIds: new Set(),
      })
    ).toBe(withCursor);
  });

  it('anchors on the terminal of the last covered round of the covered prefix', () => {
    const entries = twoRounds();
    expect(
      translateLegacySummary({
        summary: summary({ covered_round_ids: ['a', 'b'], summarized_round_count: 2 }),
        entries,
        legacyEligibleIds: new Set(),
      }).summarized_up_to
    ).toEqual({ event_id: entries[1].terminal.id });
  });

  it('stops at the first gap so later covered rounds stay visible', () => {
    const entries = twoRounds();
    expect(
      translateLegacySummary({
        summary: summary({ covered_round_ids: ['a', 'c'], summarized_round_count: 2 }),
        entries,
        legacyEligibleIds: new Set(),
      }).summarized_up_to
    ).toEqual({ event_id: entries[0].terminal.id });
  });

  it('reads a count-only summary over the legacy eligible rounds', () => {
    const entries = twoRounds();
    expect(
      translateLegacySummary({
        summary: summary({ summarized_round_count: 1 }),
        entries,
        legacyEligibleIds: new Set(['a', 'b', 'c']),
      }).summarized_up_to
    ).toEqual({ event_id: entries[0].terminal.id });
  });

  it('leaves the summary without a cursor when the first round is not covered', () => {
    const legacy = summary({ covered_round_ids: ['b'], summarized_round_count: 1 });
    expect(
      translateLegacySummary({
        summary: legacy,
        entries: twoRounds(),
        legacyEligibleIds: new Set(),
      })
    ).toEqual(legacy);
  });
});
