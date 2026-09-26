/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CompactionStructuredData, CompactionSummary } from '@kbn/agent-builder-common';
import { coveredRoundIds, legacyEligibleRoundIds } from './compaction_coverage';
import {
  completedRoundTimeline,
  failedExec0Timeline,
  pausedThenInterruptedResumeTimeline,
  timelineFromRounds,
} from '../../../../test_utils/timeline';

const emptyStructuredData: CompactionStructuredData = {
  discussion_summary: 'Existing compacted context',
  user_intent: 'Continue the conversation',
  key_topics: [],
  entities: [],
  outcomes_and_decisions: [],
  unanswered_questions: [],
  tool_calls_summary: [],
  agent_actions: [],
};

const summary = (parts: Partial<CompactionSummary>): CompactionSummary => ({
  summarized_round_count: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  token_count: 10,
  structured_data: emptyStructuredData,
  ...parts,
});
const ids = (list: string[]) => list.map((id) => ({ id }));

describe('legacyEligibleRoundIds', () => {
  it('includes rounds whose exec_0 terminated, whatever later executions did; excludes interrupted exec_0', () => {
    const events = [
      ...completedRoundTimeline('A'),
      ...failedExec0Timeline('X'),
      ...pausedThenInterruptedResumeTimeline('P'),
      ...completedRoundTimeline('B'),
    ];
    expect(legacyEligibleRoundIds(events)).toEqual(new Set(['A', 'P', 'B']));
  });

  it('a rounds-only document: every completed round is eligible', () => {
    // a stored `input` types the fixture as a raw (not processed) round
    const stored = (id: string) => ({ id, input: { message: `hello ${id}` } });
    expect(legacyEligibleRoundIds(timelineFromRounds([stored('a'), stored('b')]))).toEqual(
      new Set(['a', 'b'])
    );
  });
});

describe('coveredRoundIds', () => {
  it('a covered_round_ids summary ∩ current rounds; a removed round drops out', () => {
    expect(
      coveredRoundIds({
        summary: summary({ covered_round_ids: ['A', 'X', 'B'] }),
        rounds: ids(['A', 'B', 'C']),
        legacyEligibleIds: new Set(),
      })
    ).toEqual(new Set(['A', 'B']));
  });

  it('legacy count 2 over [A, X(interrupted exec_0), B, C] → {A, B}', () => {
    expect(
      coveredRoundIds({
        summary: summary({ summarized_round_count: 2 }),
        rounds: ids(['A', 'X', 'B', 'C']),
        legacyEligibleIds: new Set(['A', 'B', 'C']),
      })
    ).toEqual(new Set(['A', 'B']));
  });

  it('legacy count 2 over [A, P(paused then interrupted), B] → {A, P}', () => {
    expect(
      coveredRoundIds({
        summary: summary({ summarized_round_count: 2 }),
        rounds: ids(['A', 'P', 'B']),
        legacyEligibleIds: new Set(['A', 'P', 'B']),
      })
    ).toEqual(new Set(['A', 'P']));
  });

  it('no summary → empty', () => {
    expect(
      coveredRoundIds({ summary: undefined, rounds: ids(['A']), legacyEligibleIds: new Set(['A']) })
    ).toEqual(new Set());
  });
});
