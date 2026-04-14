/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KIQueryGenerationEvaluator } from '../types';
import { getQueriesFromOutput } from '../types';
import { matchesEvidenceText } from '../../common/matches_evidence_text';

/**
 * Checks that every evidence string in every generated query is grounded
 * in the input sample logs. Only scores queries that provide evidence.
 * Returns `null` if no evidence strings are present across all queries.
 * Returns `0` if no evidence strings are grounded in the sample logs.
 * Returns `1` if all evidence strings are grounded in the sample logs.
 * Returns a score between `0` and `1` based on the proportion of evidence strings that are grounded in the sample logs.
 */
export const evidenceGroundingEvaluator: KIQueryGenerationEvaluator = {
  name: 'evidence_grounding',
  kind: 'CODE' as const,
  evaluate: async ({ input, output }) => {
    const queries = getQueriesFromOutput(output);
    const { sample_logs: sampleLogs } = input;

    let totalEvidence = 0;
    let groundedEvidence = 0;
    const ungroundedItems: string[] = [];

    for (const query of queries) {
      const evidence = query.evidence ?? [];
      if (evidence.length === 0) continue;

      for (const ev of evidence) {
        totalEvidence++;
        if (sampleLogs.some((logLine) => matchesEvidenceText(logLine, ev))) {
          groundedEvidence++;
        } else {
          ungroundedItems.push(`"${query.title}": "${ev}"`);
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
          ? `Evidence not found in sample logs: ${ungroundedItems.slice(0, 5).join(', ')}`
          : `All ${totalEvidence} evidence strings are grounded in sample logs`,
      details: {
        totalEvidence,
        groundedEvidence,
        ungroundedItems,
      },
    };
  },
};
