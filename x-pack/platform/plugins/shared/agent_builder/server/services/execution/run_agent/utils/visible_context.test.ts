/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { ToolResult } from '@kbn/agent-builder-common';
import { ConversationRoundStepType, ToolResultType } from '@kbn/agent-builder-common';
import type { ToolManager, ToolResultStore } from '@kbn/agent-builder-server/runner';
import type { ProcessedTimelineEvent } from './context_timeline';
import { timelineFromRounds } from '../../../../test_utils/timeline';
import { toolCallAction, executeToolAction, substitutionAction } from '../actions';
import type { ProcessedConversation } from './prepare_conversation';
import { buildVisibleContext, groupActionCycles, type VisibleContextDeps } from './visible_context';

const deps = (): VisibleContextDeps => ({
  resultStore: {
    getEntryByResultId: jest.fn(async (id: string) => ({
      path: `/x/${id}.json`,
      metadata: { token_count: 9000 },
    })),
  } as unknown as ToolResultStore,
  toolManager: {
    getToolIdMapping: () => new Map([['tool', 'platform.tool']]),
  } as unknown as ToolManager,
  resultTransformer: async (tc) => tc.results,
  logger: { warn: jest.fn() } as unknown as Logger,
});

const conversation = (timeline: ProcessedTimelineEvent[]): ProcessedConversation => ({
  timeline,
  nextInput: { message: 'now', attachments: [] },
  attachmentTypes: [],
  attachmentStateManager: {} as any,
});

const rawResults = (id: string): ToolResult[] => [
  { type: ToolResultType.other, tool_result_id: `${id}-r`, data: { big: `RAW_${id}` } },
];
const rawContent = (id: string) => JSON.stringify({ results: rawResults(id) });

const structured = {
  discussion_summary: 's',
  user_intent: 'i',
  key_topics: [],
  entities: [],
  outcomes_and_decisions: [],
  unanswered_questions: [],
  agent_actions: [],
  tool_calls_summary: [],
};

describe('groupActionCycles', () => {
  it('starts a cycle at each tool-call action and attaches trailing actions to the last one', () => {
    const actions = [
      toolCallAction({ toolCalls: [], cycle: 1 }),
      executeToolAction({ toolResults: [], cycle: 1 }),
      toolCallAction({ toolCalls: [], cycle: 2 }),
      executeToolAction({ toolResults: [], cycle: 2 }),
      substitutionAction({
        substituted_tool_call_ids: [],
        trigger: 'intra_round',
        reason: 'input_tokens_threshold',
      }),
    ];
    expect(groupActionCycles(actions)).toEqual([
      { start: 0, end: 1 },
      { start: 2, end: 4 },
    ]);
  });

  it('returns no cycles for no actions', () => {
    expect(groupActionCycles([])).toEqual([]);
  });
});

describe('buildVisibleContext', () => {
  it('applies marks from a later-round substitution step to an earlier-round tool call', async () => {
    const timeline = timelineFromRounds([
      {
        id: 'a',
        input: { message: 'q', attachments: [] },
        steps: [
          {
            type: ConversationRoundStepType.toolCall,
            tool_call_id: 'c1',
            tool_id: 'platform.tool',
            params: {},
            results: rawResults('c1'),
          },
        ],
      },
      {
        id: 'b',
        input: { message: 'q2', attachments: [] },
        steps: [
          {
            type: ConversationRoundStepType.substitution,
            substituted_tool_call_ids: ['c1'],
            trigger: 'round_start',
            reason: 'cache_cold',
          },
        ],
      },
    ]);

    const { history, inFlight } = await buildVisibleContext(
      { conversation: conversation(timeline), actions: [], cycleLimit: 10 },
      deps()
    );

    const text = JSON.stringify([...history, ...inFlight]);
    expect(text).not.toContain('RAW_c1');
    expect(text).toContain('/x/c1-r.json');
  });

  it('applies in-flight substitution actions to in-flight results and hides covered actions', async () => {
    const actions = [
      toolCallAction({
        toolCalls: [{ toolCallId: 'c1', toolName: 'tool', args: {} }],
        cycle: 1,
      }),
      executeToolAction({
        toolResults: [
          { toolCallId: 'c1', content: rawContent('c1'), artifact: { results: rawResults('c1') } },
        ],
        cycle: 1,
      }),
      toolCallAction({
        toolCalls: [{ toolCallId: 'c2', toolName: 'tool', args: {} }],
        cycle: 2,
      }),
      executeToolAction({
        toolResults: [
          { toolCallId: 'c2', content: rawContent('c2'), artifact: { results: rawResults('c2') } },
        ],
        cycle: 2,
      }),
      substitutionAction({
        substituted_tool_call_ids: ['c2'],
        trigger: 'intra_round',
        reason: 'input_tokens_threshold',
      }),
    ];

    const { history, inFlight } = await buildVisibleContext(
      {
        conversation: conversation([]),
        actions,
        cycleLimit: 10,
        compactionCoverage: { actionIndex: 1 },
        compactionSummary: { created_at: 't', token_count: 1, structured_data: structured },
      },
      deps()
    );

    const text = JSON.stringify([...history, ...inFlight]);
    expect(text).not.toContain('c1-r');
    expect(text).toContain('/x/c2-r.json');
    expect(text).not.toContain('RAW_c2');
    expect(text).toContain('compacted');
    expect(JSON.stringify(history)).toContain('now');
  });
});
