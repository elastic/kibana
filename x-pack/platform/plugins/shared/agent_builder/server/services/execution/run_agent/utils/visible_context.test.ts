/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage } from '@langchain/core/messages';
import { loggerMock } from '@kbn/logging-mocks';
import type {
  CompactionCursor,
  CompactionSummary,
  ConversationRoundStep,
  ToolCallStep,
  ToolResult,
} from '@kbn/agent-builder-common';
import {
  ConversationRoundStepType,
  ToolResultType,
  createSubstitutionStep,
} from '@kbn/agent-builder-common';
import type { ToolResultStore } from '@kbn/agent-builder-server/runner';
import { timelineFromRounds } from '../../../../test_utils/timeline';
import type { ProcessedTimelineEvent } from './context_timeline';
import type { ProcessedConversation } from './prepare_conversation';
import type { CurrentRun, ToolRenderStateMap } from '../transient_state';
import { listVisibleUnits } from './context_coverage';
import {
  buildContextView,
  renderUnit,
  renderVisibleContext,
  type VisibleContextDeps,
} from './visible_context';

const deps = (): VisibleContextDeps => ({
  resultStore: {
    getEntryByResultId: jest.fn(async (id: string) => ({
      path: `/x/${id}.json`,
      metadata: { token_count: 9000 },
    })),
  } as unknown as ToolResultStore,
  resultTransformer: async (toolCall) => toolCall.results,
  logger: loggerMock.create(),
});

const conversation = (timeline: ProcessedTimelineEvent[]): ProcessedConversation => ({
  timeline,
  nextInput: { message: 'NEXT_INPUT', attachments: [] },
  attachmentTypes: [],
  attachmentStateManager: {} as ProcessedConversation['attachmentStateManager'],
});

const rawResults = (id: string): ToolResult[] => [
  { type: ToolResultType.other, tool_result_id: `${id}-r`, data: { big: `RAW_${id}` } },
];

const call = (id: string): ToolCallStep => ({
  type: ConversationRoundStepType.toolCall,
  tool_call_id: id,
  tool_id: 'platform.tool',
  tool_call_group_id: `g-${id}`,
  params: {},
  results: rawResults(id),
  progression: [],
});

const renderStateOf = (ids: string[]): ToolRenderStateMap =>
  Object.fromEntries(
    ids.map((id, index) => [
      id,
      {
        toolName: 'platform_tool',
        kind: 'server' as const,
        cycle: index + 1,
        content: JSON.stringify({ results: rawResults(id) }),
      },
    ])
  );

const run = (
  steps: ConversationRoundStep[],
  { cursor, renderState = {} }: { cursor?: CompactionCursor; renderState?: ToolRenderStateMap } = {}
): CurrentRun => ({
  roundId: 'current',
  steps,
  cycleLimit: 30,
  renderState,
  pendingToolCallIds: [],
  retryNotices: [],
  ...(cursor ? { compactionSummary: summary(cursor) } : {}),
});

const summary = (cursor: CompactionCursor): CompactionSummary => ({
  summarized_up_to: cursor,
  summarized_round_count: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  token_count: 1,
  structured_data: {
    discussion_summary: 'SUMMARY_TEXT',
    user_intent: 'i',
    key_topics: [],
    entities: [],
    outcomes_and_decisions: [],
    unanswered_questions: [],
    agent_actions: [],
    tool_calls_summary: [],
  },
});

const text = (messages: BaseMessage[]) => JSON.stringify(messages.map((m) => m.content));

const twoRoundTimeline = () =>
  timelineFromRounds([
    {
      id: 'a',
      input: { message: 'FIRST_INPUT', attachments: [] },
      steps: [call('a1'), call('a2')],
      response: { message: 'FIRST_ANSWER' },
    },
    {
      id: 'b',
      input: { message: 'SECOND_INPUT', attachments: [] },
      steps: [call('b1')],
      response: { message: 'SECOND_ANSWER' },
    },
  ]);

describe('renderVisibleContext', () => {
  it('applies marks from a later-round substitution step to an earlier-round tool call', async () => {
    const timeline = timelineFromRounds([
      { id: 'a', input: { message: 'q', attachments: [] }, steps: [call('c1')] },
      {
        id: 'b',
        input: { message: 'q2', attachments: [] },
        steps: [
          createSubstitutionStep({
            substituted_tool_calls: [{ round_id: 'a', tool_call_id: 'c1' }],
            trigger: 'round_start',
            threshold_tokens: 1_000,
          }),
        ],
      },
    ]);

    const messages = await renderVisibleContext(
      { conversation: conversation(timeline), run: run([]), phase: 'research' },
      deps()
    );

    expect(text(messages)).not.toContain('RAW_c1');
    expect(text(messages)).toContain('/x/c1-r.json');
  });

  it('applies the current run substitution steps to its own results', async () => {
    const steps = [
      call('c1'),
      call('c2'),
      createSubstitutionStep({
        substituted_tool_calls: [{ round_id: 'current', tool_call_id: 'c2' }],
        trigger: 'intra_round',
        threshold_tokens: 1_000,
      }),
    ];
    const messages = await renderVisibleContext(
      {
        conversation: conversation([]),
        run: run(steps, { renderState: renderStateOf(['c1', 'c2']) }),
        phase: 'research',
      },
      deps()
    );

    expect(text(messages)).toContain('RAW_c1');
    expect(text(messages)).not.toContain('RAW_c2');
    expect(text(messages)).toContain('/x/c2-r.json');
  });

  it('renders the summary, then the rest of a partially covered round with its user message', async () => {
    const messages = await renderVisibleContext(
      {
        conversation: conversation(twoRoundTimeline()),
        run: run([], { cursor: { round_id: 'a', tool_call_id: 'a1' } }),
        phase: 'research',
      },
      deps()
    );
    const rendered = text(messages);

    expect(rendered.indexOf('SUMMARY_TEXT')).toBeLessThan(rendered.indexOf('FIRST_INPUT'));
    expect(rendered).not.toContain('RAW_a1');
    expect(rendered).toContain('RAW_a2');
    expect(rendered).toContain('FIRST_ANSWER');
    expect(rendered).toContain('SECOND_INPUT');
    expect(rendered).toContain('NEXT_INPUT');
  });

  it('hides the history and the current cycles covered by a current-run cursor', async () => {
    const steps = [call('x1'), call('x2')];
    const messages = await renderVisibleContext(
      {
        conversation: conversation(twoRoundTimeline()),
        run: run(steps, {
          cursor: { round_id: 'current', tool_call_id: 'x1' },
          renderState: renderStateOf(['x1', 'x2']),
        }),
        phase: 'research',
      },
      deps()
    );
    const rendered = text(messages);

    expect(rendered).toContain('SUMMARY_TEXT');
    expect(rendered).not.toContain('FIRST_INPUT');
    expect(rendered).not.toContain('SECOND_ANSWER');
    expect(rendered).not.toContain('RAW_x1');
    expect(rendered).toContain('RAW_x2');
    // the current input is never covered
    expect(rendered).toContain('NEXT_INPUT');
  });
});

describe('renderUnit', () => {
  it('renders round cycles with their user message first and their outcome last', async () => {
    const convo = conversation(twoRoundTimeline());
    const currentRun = run([call('x1')], { renderState: renderStateOf(['x1']) });
    const view = buildContextView({ conversation: convo, run: currentRun }, deps());
    const units = listVisibleUnits({
      entries: view.history.entries,
      steps: currentRun.steps,
      visibility: view.visibility,
    });

    const rendered = await Promise.all(
      units.map(async (unit) =>
        text(await renderUnit(unit, { view, run: currentRun, conversation: convo }))
      )
    );

    expect(rendered).toHaveLength(4);
    expect(rendered[0]).toContain('FIRST_INPUT');
    expect(rendered[0]).toContain('RAW_a1');
    expect(rendered[0]).not.toContain('FIRST_ANSWER');
    expect(rendered[1]).not.toContain('FIRST_INPUT');
    expect(rendered[1]).toContain('RAW_a2');
    expect(rendered[1]).toContain('FIRST_ANSWER');
    expect(rendered[2]).toContain('SECOND_INPUT');
    expect(rendered[2]).toContain('SECOND_ANSWER');
    expect(rendered[3]).toContain('RAW_x1');
  });
});
