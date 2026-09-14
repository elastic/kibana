/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CompactionSummary } from '@kbn/agent-builder-common';
import { timelineFromRounds } from '../../../../test_utils/timeline';
import { toCursorSummary } from './compaction_summary_compat';

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

describe('toCursorSummary', () => {
  const timeline = timelineFromRounds([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);

  it('returns a cursor summary unchanged', () => {
    const summary: CompactionSummary = {
      summarized_up_to_event_id: 'x',
      created_at: 't',
      token_count: 1,
      structured_data: structured,
    };
    expect(toCursorSummary(summary, timeline)).toBe(summary);
  });

  it('translates a legacy summarized_round_count to the last event of the Nth round', () => {
    const legacy = {
      summarized_round_count: 2,
      created_at: 't',
      token_count: 1,
      structured_data: structured,
    };
    const result = toCursorSummary(legacy as any, timeline)!;
    const lastOfB = timeline.filter((e) => e.id.startsWith('b::')).at(-1)!.id;
    expect(result.summarized_up_to_event_id).toBe(lastOfB);
    expect(result).not.toHaveProperty('summarized_round_count');
  });

  it('drops a legacy summary whose round count exceeds the timeline', () => {
    const legacy = {
      summarized_round_count: 9,
      created_at: 't',
      token_count: 1,
      structured_data: structured,
    };
    expect(toCursorSummary(legacy as any, timeline)).toBeUndefined();
  });

  it('returns undefined for undefined', () => {
    expect(toCursorSummary(undefined, timeline)).toBeUndefined();
  });
});
