/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate as base } from '../../src/evaluate';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';
import { CONTEXT_NOISE_EXAMPLES } from './dataset';

/**
 * Multi-turn context-noise A/B eval. Runs the same task under three
 * file-read-tool variants (`raw` / `stripped-header` / `stripped-per-agents-md`)
 * so we can quantify what the license-header boilerplate costs us in
 * quality AND in tokens.
 *
 * DRAFT: this spec wires the dataset through `createEvaluateDataset` for
 * a baseline `raw` measurement. The variant plumbing (header-stripping
 * file-read wrapper, AGENTS.md-only offset instruction) lands in a
 * follow-up commit — see docs/context_noise_eval.md §5.
 */

const evaluate = base.extend<{ evaluateDataset: EvaluateDataset }, {}>({
  evaluateDataset: [
    ({ chatClient, evaluators, executorClient, traceEsClient, log }, use) => {
      use(
        createEvaluateDataset({
          chatClient,
          evaluators,
          executorClient,
          traceEsClient,
          log,
        })
      );
    },
    { scope: 'test' },
  ],
});

evaluate.describe(
  'context-noise: license-header impact on agent quality',
  { tag: tags.serverless.search },
  () => {
    evaluate('baseline (raw file reads)', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder: context-noise-baseline-raw',
          description:
            'Multi-turn coding scenarios evaluated against unmodified file-read tool output (with license headers).',
          examples: CONTEXT_NOISE_EXAMPLES.map((example) => ({
            input: example.input,
            output: { expected: example.output.expected },
            metadata: {
              category: example.metadata.category,
              expectedFiles: example.metadata.expectedFiles,
              turnBudget: example.metadata.turnBudget,
              requiredTerms: example.output.requiredTerms,
              variant: 'raw',
            },
          })),
        },
      });
    });

    // TODO(context-noise-eval): mirror this block with variant='stripped-header'
    // once the file-read tool wrapper is wired via the AgentBuilder configuration.
    // TODO(context-noise-eval): mirror with variant='stripped-per-agents-md'
    // once we can override AGENTS.md content per-run.
  }
);
