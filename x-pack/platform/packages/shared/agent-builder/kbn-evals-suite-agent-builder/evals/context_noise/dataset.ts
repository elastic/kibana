/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Starter dataset for the context-noise eval. Two seeded scenarios so
 * reviewers can see the shape; the full ~40-example set lands in a
 * follow-up commit once the harness is agreed on.
 *
 * See `../../docs/context_noise_eval.md` §4 for the design and the
 * remaining example slots.
 */

export interface ContextNoiseExample {
  readonly input: { question: string };
  readonly output: {
    expected: string;
    /**
     * Terms that MUST appear literally in the final assistant message for
     * the deterministic `taskComplete` evaluator to score 1. Keep it small
     * (2-4 anchors) so the check catches "didn't answer at all" rather
     * than "phrased slightly differently".
     */
    requiredTerms: readonly string[];
  };
  readonly metadata: {
    readonly category:
      | 'cross-file-trace'
      | 'config-surface'
      | 'behavioral-question'
      | 'data-flow'
      | 'refactor-prep'
      | 'header-relevant-holdout';
    /** Files the agent should have opened to answer correctly. */
    readonly expectedFiles: readonly string[];
    /** Upper bound on assistant turns before the harness cuts the run. */
    readonly turnBudget: number;
  };
}

export const CONTEXT_NOISE_EXAMPLES: readonly ContextNoiseExample[] = [
  {
    input: {
      question:
        'Kibana has a rule in AGENTS.md about how server plugin entry files (server/index.ts) should load ./plugin. Read the evals plugin server entry and tell me whether it complies. Cite the exact lines.',
    },
    output: {
      expected:
        'The evals plugin server/index.ts complies: it uses `import type` for types from ./plugin and instantiates via `await import(\'./plugin\')` inside the async plugin initializer, so ./plugin is not parsed at boot when the plugin is disabled.',
      requiredTerms: ['import type', "await import('./plugin')"],
    },
    metadata: {
      category: 'behavioral-question',
      expectedFiles: ['x-pack/platform/plugins/shared/evals/server/index.ts'],
      turnBudget: 4,
    },
  },
  {
    input: {
      question:
        'What license header does x-pack/platform/plugins/shared/evals/kibana.jsonc fall under? Quote the exact copyright line from the top of the file.',
    },
    output: {
      expected:
        "The file falls under Elastic License 2.0, AGPL v3.0, and SSPL v1 (triple-licensed). The copyright line reads 'Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one'.",
      // If the stripper is active, this example MUST fail — that's the point.
      requiredTerms: ['Copyright Elasticsearch B.V.'],
    },
    metadata: {
      category: 'header-relevant-holdout',
      expectedFiles: ['x-pack/platform/plugins/shared/evals/kibana.jsonc'],
      turnBudget: 2,
    },
  },
];
