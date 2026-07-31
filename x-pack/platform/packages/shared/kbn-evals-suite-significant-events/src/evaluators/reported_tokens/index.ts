/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator, Example, TaskOutput } from '@kbn/evals';
import type { ChatCompletionTokenCount } from '@kbn/inference-common';

/**
 * Key a task should use to expose the token counts reported by the inference
 * provider, summed over every LLM call the task made.
 */
export interface TaskOutputWithReportedTokens {
  tokens_used?: ChatCompletionTokenCount;
}

export const readReportedTokens = (output: TaskOutput): ChatCompletionTokenCount | undefined => {
  if (!output || typeof output !== 'object' || Array.isArray(output)) {
    return undefined;
  }
  return (output as TaskOutputWithReportedTokens).tokens_used;
};

const createReportedTokensEvaluator = <TExample extends Example, TTaskOutput extends TaskOutput>({
  name,
  select,
}: {
  name: string;
  select: (tokens: ChatCompletionTokenCount) => number;
}): Evaluator<TExample, TTaskOutput> => ({
  name,
  kind: 'CODE',
  evaluate: async ({ output }) => {
    const tokens = readReportedTokens(output);

    // `sumTokens` normalizes an absent provider count to an all-zero object, so a zero
    // total means "not reported". Scoring it 0 would average in as a real observation.
    if (!tokens || tokens.total === 0) {
      return {
        score: null,
        explanation: 'Task did not report provider token counts',
      };
    }

    return {
      score: select(tokens),
      explanation: `Provider-reported tokens: ${tokens.prompt} input, ${tokens.completion} output`,
      details: { ...tokens },
    };
  },
});

/**
 * `Input Tokens` and `Output Tokens` derive their values from exported trace
 * spans. These report the same quantities straight from the inference provider's
 * response instead, so a gap between the two pairs is a collection artefact
 * rather than a change in model behaviour.
 *
 * Two causes produce a gap, and they differ in sign. An unfinished trace export
 * makes the trace pair lower. A retried call makes it higher: the trace sums
 * every attempt, while `streamToResponse` returns the first token event it sees,
 * which for a retry is the discarded attempt's. The trace pair is the one that
 * reflects true spend.
 */
export const createReportedTokenEvaluators = <
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
>(): Array<Evaluator<TExample, TTaskOutput>> => [
  createReportedTokensEvaluator<TExample, TTaskOutput>({
    name: 'reported_input_tokens',
    select: ({ prompt }) => prompt,
  }),
  createReportedTokensEvaluator<TExample, TTaskOutput>({
    name: 'reported_output_tokens',
    select: ({ completion }) => completion,
  }),
];
