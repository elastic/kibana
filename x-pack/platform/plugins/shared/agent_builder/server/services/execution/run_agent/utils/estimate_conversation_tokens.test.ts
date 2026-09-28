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
import {
  eventsNativeConversation,
  failedExec0Timeline,
  processedCustomEventFixture,
  timelineFromRounds,
} from '../../../../test_utils/timeline';
import type { ProcessedTimelineEvent } from './context_timeline';
import { eventsForContext, groupTimelineRounds } from './context_timeline';
import { roundToLangchain } from './to_langchain_messages';
import { createSummarizationTransformer, type ToolSummarizationDeps } from './tool_summarization';

const estimatePerRoundTokens = (
  rounds: ProcessedConversationRound[],
  deps: ToolSummarizationDeps
) => estimateTimelineTokens(timelineFromRounds(rounds), createSummarizationTransformer(deps));

/** A processed round fixture with a distinct id and a fixed started_at for timeline ordering tests. */
const roundAt = (id: string, started_at: string): ProcessedConversationRound =>
  ({ ...createMockRound(id), id, started_at } as unknown as ProcessedConversationRound);

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

describe('interrupted rounds', () => {
  it('estimates an interrupted round including its steps and the notice', async () => {
    const toolStep = createMockRound('r'.repeat(200)).steps[0];
    const timeline = eventsForContext(
      eventsNativeConversation(failedExec0Timeline('r1', [toolStep]))
    ).map((event) =>
      event.type === 'user_message' ? { ...event, data: { ...event.data, attachments: [] } } : event
    ) as ProcessedTimelineEvent[];
    const transformer = createSummarizationTransformer({
      toolManager: createMockToolManager(),
      toolRegistry: createMockToolRegistry(),
    });

    const [tokens] = await estimateTimelineTokens(timeline, transformer);
    const [round] = groupTimelineRounds(timeline);
    const messages = await roundToLangchain(round);

    expect(tokens).toBe(estimateMessagesTokens(messages));
    expect(messages.some((message) => String(message.content).includes('<system_notice>'))).toBe(
      true
    );
    expect(messages.some((message) => message.getType() === 'tool')).toBe(true);
  });

  describe('custom events', () => {
    // r1 → N (between r1 and r2) → r2
    const withNote: ProcessedTimelineEvent[] = [
      ...timelineFromRounds([roundAt('r1', '2026-01-01T00:00:00.000Z')]),
      processedCustomEventFixture({
        id: 'note',
        created_at: '2026-01-01T00:01:00.000Z',
        representation: 'n'.repeat(4000),
      }),
      ...timelineFromRounds([roundAt('r2', '2026-01-01T00:02:00.000Z')]),
    ];

    it('estimates each custom event as its rendered notice, keyed by event id', () => {
      const counts = estimateFailedEntryTokens(withNote);

      expect(Array.from(counts.keys())).toEqual(['note']);
      // ~4000 chars of representation (~1000 tokens) + the wrapper
      expect(counts.get('note')!).toBeGreaterThan(1000);
    });

    it('sums only the custom events that survive the cut', () => {
      const counts = estimateFailedEntryTokens(withNote);

      expect(survivingFailedEntryTokens(withNote, 0, counts)).toBe(counts.get('note'));
      // cutting at r2 drops N, which is older than r2
      expect(survivingFailedEntryTokens(withNote, 1, counts)).toBe(0);
    });
  });
});
