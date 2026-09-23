/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AIMessage, HumanMessage, ToolMessage } from '@langchain/core/messages';
import type { ToolCallWithResult, ToolResult } from '@kbn/agent-builder-common';
import {
  ConversationRoundStatus,
  ConversationRoundStepType,
  ToolResultType,
} from '@kbn/agent-builder-common';
import type { ToolManager } from '@kbn/agent-builder-server/runner';
import type { ToolRegistry } from '@kbn/agent-builder-server';
import type { ProcessedConversationRound } from '../../../../test_utils/timeline';
import {
  estimateFailedEntryTokens,
  estimateMessagesTokens,
  estimatePerRoundTokens as estimateTimelineTokens,
  survivingFailedEntryTokens,
} from './estimate_conversation_tokens';
import { timelineFromRounds } from '../../../../test_utils/timeline';
import type { ProcessedTimelineEvent } from './context_timeline';

const estimatePerRoundTokens = (
  rounds: ProcessedConversationRound[],
  deps: Parameters<typeof estimateTimelineTokens>[1]
) => estimateTimelineTokens(timelineFromRounds(rounds), deps);

const createMockToolManager = (
  summarizers: Map<
    string,
    (step: ToolCallWithResult) => ToolResult[] | null | undefined
  > = new Map()
): ToolManager =>
  ({
    getSummarizer: jest.fn((toolId: string) => summarizers.get(toolId)),
  } as unknown as ToolManager);

const createMockToolRegistry = (): ToolRegistry =>
  ({ get: jest.fn(async () => undefined) } as unknown as ToolRegistry);

const createMockRound = (toolResultValue: string): ProcessedConversationRound =>
  ({
    id: 'round-1',
    status: ConversationRoundStatus.completed,
    input: { message: 'hello', attachments: [] },
    steps: [
      {
        type: ConversationRoundStepType.toolCall,
        tool_call_id: 'tc-1',
        tool_id: 'search',
        params: { query: 'test' },
        results: [
          { type: ToolResultType.other, tool_result_id: 'r-1', data: { value: toolResultValue } },
        ],
        progression: [],
      },
    ],
    response: { message: 'done' },
  } as unknown as ProcessedConversationRound);

describe('estimateMessagesTokens', () => {
  it('counts message content (~4 chars per token)', () => {
    expect(estimateMessagesTokens([new HumanMessage('a'.repeat(40))])).toBe(10);
  });

  it('counts tool_calls on AI messages in addition to content', () => {
    const withTools = estimateMessagesTokens([
      new AIMessage({
        content: '',
        tool_calls: [
          { id: '1', name: 'search', args: { query: 'x'.repeat(80) }, type: 'tool_call' },
        ],
      }),
    ]);
    const withoutTools = estimateMessagesTokens([new AIMessage({ content: '' })]);
    expect(withTools).toBeGreaterThan(withoutTools);
  });

  it('counts tool result message content', () => {
    expect(
      estimateMessagesTokens([new ToolMessage({ content: 'x'.repeat(40), tool_call_id: '1' })])
    ).toBe(10);
  });

  it('uses a flat cost for image_url content parts instead of character-based estimation', () => {
    const bigBase64 = 'a'.repeat(400_000); // ~1 MB PNG-scale payload
    const withImage = estimateMessagesTokens([
      new HumanMessage({
        content: [
          { type: 'text', text: 'What is this?' },
          { type: 'image_url', image_url: { url: `data:image/png;base64,${bigBase64}` } },
        ],
      }),
    ]);
    // If we were estimating char/4, this would be ~100k. Flat cost keeps it well below that.
    expect(withImage).toBeLessThan(2_000);
  });
});

describe('estimatePerRoundTokens', () => {
  it('returns one positive count per round', async () => {
    const counts = await estimatePerRoundTokens(
      [createMockRound('data'), createMockRound('data')],
      {
        toolManager: createMockToolManager(),
        toolRegistry: createMockToolRegistry(),
      }
    );
    expect(counts).toHaveLength(2);
    counts.forEach((count) => expect(count).toBeGreaterThan(0));
  });

  it('reflects tool-result summarization in the estimate', async () => {
    const bigRound = createMockRound('x'.repeat(4000));

    const rawCounts = await estimatePerRoundTokens([bigRound], {
      toolManager: createMockToolManager(),
      toolRegistry: createMockToolRegistry(),
    });

    const summarizedCounts = await estimatePerRoundTokens([bigRound], {
      toolManager: createMockToolManager(
        new Map([
          [
            'search',
            () => [{ type: ToolResultType.other, tool_result_id: 'r-1', data: { value: 'tiny' } }],
          ],
        ])
      ),
      toolRegistry: createMockToolRegistry(),
    });

    expect(summarizedCounts[0]).toBeLessThan(rawCounts[0]);
  });
});

describe('failed-entry token accounting', () => {
  const failedEntry = (id: string, createdAt: string, message: string): ProcessedTimelineEvent[] =>
    [
      {
        id: `${id}::user_message`,
        type: 'user_message',
        created_at: createdAt,
        actor: { type: 'user', id: 'u1' },
        data: { message, attachments: [] },
      },
      {
        id: `${id}::execution_started`,
        type: 'execution_started',
        created_at: createdAt,
        actor: { type: 'agent', id: 'a' },
        execution_id: `${id}::execution`,
        trigger_event_id: `${id}::user_message`,
        data: { trigger_type: 'user_message' },
      },
      {
        id: `${id}::execution_failed`,
        type: 'execution_failed',
        created_at: createdAt,
        actor: { type: 'agent', id: 'a' },
        execution_id: `${id}::execution`,
        trigger_event_id: `${id}::user_message`,
        data: { time_to_last_token: 1, error: { code: 'internalError', message: 'boom' } },
      },
    ] as unknown as ProcessedTimelineEvent[];

  const round = (id: string, startedAt: string): ProcessedConversationRound =>
    ({
      ...createMockRound('v'),
      id,
      started_at: startedAt,
    } as ProcessedConversationRound);

  // r1 → F (between r1 and r2) → r2
  const timeline: ProcessedTimelineEvent[] = [
    ...timelineFromRounds([round('r1', '2026-01-01T00:00:00.000Z')]),
    ...failedEntry('f', '2026-01-01T00:01:00.000Z', 'x'.repeat(4000)),
    ...timelineFromRounds([round('r2', '2026-01-01T00:02:00.000Z')]),
  ];

  it('estimates each failed entry as its rendered user message plus notice, keyed by user message id', () => {
    const counts = estimateFailedEntryTokens(timeline);

    expect(Array.from(counts.keys())).toEqual(['f::user_message']);
    // ~4000 chars of message (~1000 tokens) + the notice
    expect(counts.get('f::user_message')!).toBeGreaterThan(1000);
  });

  it('sums only the failed entries that survive the cut', () => {
    const counts = estimateFailedEntryTokens(timeline);

    expect(survivingFailedEntryTokens(timeline, 0, counts)).toBe(counts.get('f::user_message'));
    // cutting at r2 drops F, which is older than r2
    expect(survivingFailedEntryTokens(timeline, 1, counts)).toBe(0);
    expect(survivingFailedEntryTokens(timeline, 0, new Map())).toBe(0);
  });
});
