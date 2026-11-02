/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRoundStatus, ConversationRoundStepType } from '@kbn/agent-builder-common';
import type { ConversationRound } from '@kbn/agent-builder-common';
import { buildRoundTranscript, MAX_TOOL_RESULT_CHARS } from './build_round_transcript';

export const buildRound = (overrides: Partial<ConversationRound> = {}): ConversationRound =>
  ({
    id: 'round-1',
    status: ConversationRoundStatus.completed,
    input: { message: 'What does the user prefer?' },
    steps: [],
    response: { message: 'Dark mode.' },
    started_at: '2026-01-01T00:00:00.000Z',
    time_to_first_token: 1,
    time_to_last_token: 2,
    model_usage: { connector_id: 'c-1', model: 'm', input_tokens: 0, output_tokens: 0 },
    ...overrides,
  } as ConversationRound);

describe('buildRoundTranscript', () => {
  it('renders the user message, tool calls with results, and the response', () => {
    const transcript = buildRoundTranscript(
      buildRound({
        steps: [
          {
            type: ConversationRoundStepType.toolCall,
            tool_id: 'search',
            tool_call_id: 'tc-1',
            params: { query: 'prefs' },
            results: [{ tool_result_id: 'r-1', type: 'other', data: { hits: 2 } }],
          } as ConversationRound['steps'][number],
        ],
      })
    );

    expect(transcript).toBe(
      [
        'user: What does the user prefer?',
        '[tool search] {"query":"prefs"}',
        '[result search] {"hits":2}',
        'agent: Dark mode.',
      ].join('\n')
    );
  });

  it('bounds oversized tool results', () => {
    const transcript = buildRoundTranscript(
      buildRound({
        steps: [
          {
            type: ConversationRoundStepType.toolCall,
            tool_id: 'read',
            tool_call_id: 'tc-1',
            params: {},
            results: [
              {
                tool_result_id: 'r-1',
                type: 'other',
                data: 'x'.repeat(MAX_TOOL_RESULT_CHARS + 50),
              },
            ],
          } as ConversationRound['steps'][number],
        ],
      })
    );

    expect(transcript).toContain('… [truncated');
    expect(transcript.length).toBeLessThan(MAX_TOOL_RESULT_CHARS + 200);
  });
});
