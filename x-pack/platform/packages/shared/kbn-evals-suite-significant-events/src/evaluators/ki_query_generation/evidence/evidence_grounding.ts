/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KIQueryGenerationEvaluator } from '../types';
import { getQueriesFromOutput } from '../types';
import { isEvidenceGrounded } from '../../ki_feature_extraction/evidence/is_evidence_grounded';
import { matchesEvidenceText } from '../../common/matches_evidence_text';

/**
 * Strips LLM-added annotations and wrapping quotes from evidence strings.
 *
 * LLMs often append contextual annotations to evidence, e.g.:
 *   `attributes.msg: "Charge request received." (4% of sampled logs)`
 *   `body.text: "payment went through..." — normal path; absence signals failure`
 *
 * They also wrap values in quotes (`key: "value"`), which prevents
 * `isEvidenceGrounded`'s key-value matching from succeeding because the parsed
 * value retains the surrounding quotes.
 */
function stripEvidenceAnnotations(evidence: string): string {
  let cleaned = evidence
    .replace(/\s*\([^)]*\)\s*$/, '')
    .replace(/\s*[—–]\s+.*$/, '')
    .trimEnd();

  cleaned = cleaned.replace(/^([^:=]+[=:]\s*)"(.*)"$/, '$1$2');

  return cleaned;
}

/**
 * Checks that every evidence string in every generated query is grounded
 * in the input sample documents. Uses full `_source` documents when available
 * for structured field-path matching (via `isEvidenceGrounded`), falling back
 * to text substring matching against `sample_logs`.
 *
 * Returns `null` if no evidence strings are present across all queries.
 */
export const evidenceGroundingEvaluator: KIQueryGenerationEvaluator = {
  name: 'evidence_grounding',
  kind: 'CODE' as const,
  evaluate: async ({ input, output }) => {
    const queries = getQueriesFromOutput(output);
    const { sample_logs: sampleLogs, sample_docs: sampleDocs } = input;

    let totalEvidence = 0;
    let groundedEvidence = 0;
    const ungroundedItems: string[] = [];

    for (const query of queries) {
      const evidence = query.evidence ?? [];
      if (evidence.length === 0) continue;

      for (const rawEv of evidence) {
        totalEvidence++;
        const ev = stripEvidenceAnnotations(rawEv);

        const grounded = sampleDocs?.length
          ? isEvidenceGrounded(ev, sampleDocs)
          : sampleLogs.some((logLine) => matchesEvidenceText(logLine, ev));

        if (grounded) {
          groundedEvidence++;
        } else {
          ungroundedItems.push(`"${query.title}": "${rawEv}"`);
        }
      }
    }

    if (totalEvidence === 0) {
      return { score: null, explanation: 'No evidence strings to check' };
    }

    const score = groundedEvidence / totalEvidence;

    return {
      score,
      explanation:
        ungroundedItems.length > 0
          ? `Evidence not found in sample docs: ${ungroundedItems.slice(0, 5).join(', ')}`
          : `All ${totalEvidence} evidence strings are grounded in sample docs`,
      details: {
        totalEvidence,
        groundedEvidence,
        ungroundedItems,
      },
    };
  },
};
