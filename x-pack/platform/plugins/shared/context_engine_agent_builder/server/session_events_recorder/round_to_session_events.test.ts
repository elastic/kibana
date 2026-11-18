/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRound } from '@kbn/agent-builder-common';
import { ConversationRoundStepType } from '@kbn/agent-builder-common';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import { roundToSessionEvents } from './round_to_session_events';

const round = {
  id: 'round-1',
  started_at: '2026-11-18T10:00:00.000Z',
  input: { message: 'Remember that I prefer metric units.' },
  steps: [
    { type: ConversationRoundStepType.reasoning, reasoning: 'Save it as a memory.' },
    { type: ConversationRoundStepType.reasoning, reasoning: 'thinking…', transient: true },
    {
      type: ConversationRoundStepType.toolCall,
      tool_call_id: 'call-1',
      tool_id: 'platform.context_engine.remember',
      params: { content: 'The user prefers metric units.' },
      results: [{ type: ToolResultType.other, data: { id: 'memory-1' } }],
    },
  ],
  response: { message: 'Got it, metric units from now on.' },
} as unknown as ConversationRound;

const base = { turn_id: 'round-1', event_at: '2026-11-18T10:00:00.000Z' };

describe('roundToSessionEvents', () => {
  it('maps the user message, reasoning, tool calls and results, and the answer, in order', () => {
    expect(roundToSessionEvents(round)).toEqual([
      { ...base, seq: 0, id: 'round-1:user', type: 'user', content: round.input.message },
      {
        ...base,
        seq: 1,
        id: 'round-1:reasoning:0',
        type: 'reasoning',
        content: 'Save it as a memory.',
      },
      {
        ...base,
        seq: 2,
        id: 'round-1:tool_call:call-1',
        type: 'assistant',
        tool_calls: [
          {
            id: 'call-1',
            name: 'platform.context_engine.remember',
            args: { content: 'The user prefers metric units.' },
          },
        ],
      },
      {
        ...base,
        seq: 3,
        id: 'round-1:tool:call-1',
        type: 'tool',
        tool_call_id: 'call-1',
        tool_name: 'platform.context_engine.remember',
        result: [{ type: 'other', data: { id: 'memory-1' } }],
        status: 'successful',
      },
      {
        ...base,
        seq: 4,
        id: 'round-1:answer',
        type: 'assistant',
        content: 'Got it, metric units from now on.',
      },
    ]);
  });

  it('marks a tool call that returned an error as failed, and an interrupted one as unknown', () => {
    const [failed, interrupted] = ['call-1', 'call-2'].map((toolCallId, index) => ({
      type: ConversationRoundStepType.toolCall,
      tool_call_id: toolCallId,
      tool_id: 'some_tool',
      params: {},
      results: index === 0 ? [{ type: ToolResultType.error, data: { message: 'boom' } }] : [],
      ...(index === 1 && { interrupted: true }),
    }));

    const events = roundToSessionEvents({
      ...round,
      steps: [failed, interrupted],
      response: { message: '' },
    } as unknown as ConversationRound);

    expect(
      events.filter(({ type }) => type === 'tool').map((event) => 'status' in event && event.status)
    ).toEqual(['failed', null]);
    expect(events.some(({ id }) => id === 'round-1:answer')).toBe(false);
  });
});
