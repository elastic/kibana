/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JudgeEvaluator, JudgeOutput } from '../types';
import { normalizeWhitespace } from '../../common/matches_evidence_text';

const BUDGET_THRESHOLD = 8;

/**
 * CODE evaluator: when `toolUsage.total_calls >= 8` (budget exhausted) OR
 * when any evidence entry from `inputDiscoveries` has no corresponding key
 * in `execute_esql_per_evidence` (judge skipped it entirely), `assessment_note`
 * must be non-empty on all significant events.
 * Score 1 if condition not triggered or all events have an assessment_note.
 */
export const assessmentNotePresenceEvaluator: JudgeEvaluator = {
  name: 'assessment_note_presence',
  kind: 'CODE',
  evaluate: ({ output }) => {
    const { significantEvents, toolUsage, inputDiscoveries } = output as JudgeOutput;
    const evidenceMap = toolUsage?.execute_esql_per_evidence ?? {};
    const totalCalls = toolUsage?.total_calls ?? 0;

    // Check if any evidence entry from the input was skipped entirely
    // (has an esql_query but no corresponding key in evidenceMap).
    // Entries in evidenceMap always have called:true — so we cross-reference
    // against inputDiscoveries instead of looking for called:false in the map.
    let hasSkippedEvidence = false;
    outer: for (const discovery of inputDiscoveries ?? []) {
      const evidences = (discovery as Record<string, unknown>).evidences as
        | Array<Record<string, unknown>>
        | undefined;
      if (!evidences) continue;
      for (const ev of evidences) {
        const q = ev.esql_query as string | null | undefined;
        if (!q) continue;
        if (!evidenceMap[normalizeWhitespace(q)]) {
          hasSkippedEvidence = true;
          break outer;
        }
      }
    }

    const conditionTriggered = totalCalls >= BUDGET_THRESHOLD || hasSkippedEvidence;

    if (!conditionTriggered) {
      return Promise.resolve({
        score: 1,
        explanation: `Budget not exhausted (total_calls=${totalCalls}) and no skipped evidence entries`,
      });
    }

    const events = significantEvents ?? [];
    if (events.length === 0) {
      return Promise.resolve({
        score: 0,
        explanation: `Condition triggered (total_calls=${totalCalls}, skippedEvidence=${hasSkippedEvidence}) but no significant events returned`,
      });
    }

    const missingNote = events.filter((e) => {
      const note = (e as Record<string, unknown>).assessment_note as string | null | undefined;
      return !note || note.trim().length === 0;
    });

    if (missingNote.length === 0) {
      return Promise.resolve({
        score: 1,
        explanation: `All ${events.length} significant events have assessment_note when condition triggered`,
      });
    }

    const score = (events.length - missingNote.length) / events.length;
    return Promise.resolve({
      score,
      explanation: `${missingNote.length}/${
        events.length
      } events missing assessment_note despite budget exhaustion or skipped evidence (score=${score.toFixed(
        2
      )})`,
    });
  },
};
