/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationResult, Evaluator, Example, TaskOutput } from '@kbn/evals';
import { skippedResult } from '../evaluator_utils';
import type { ExtractedVisualization } from '../extract_visualization';

export const VISUALIZATION_REFUSAL_EVALUATOR_NAME = 'Visualization Refusal';

/** Why the agent should decline instead of drawing something. */
export type RefusalReason =
  | 'missing_index'
  | 'missing_field'
  | 'unsupported_chart'
  | 'ambiguous'
  | 'out_of_scope';

export interface ExpectedRefusal {
  reason: RefusalReason;
}

/**
 * CODE evaluator for negative examples: the agent should produce no
 * visualization and should answer with text. Skips positive examples.
 */
export function createVisualizationRefusalEvaluator<
  TExample extends Example = Example,
  TTaskOutput extends TaskOutput = TaskOutput
>(config: {
  visualizationExtractor: (output: TTaskOutput) => ExtractedVisualization[];
  messagesExtractor: (output: TTaskOutput) => string[];
  /** Structured prompts (clarifying questions) count as answering the user. */
  promptsExtractor?: (output: TTaskOutput) => unknown[];
  expectedRefusalExtractor: (expected: TExample['output']) => ExpectedRefusal | undefined;
  name?: string;
}): Evaluator<TExample, TTaskOutput> {
  const {
    visualizationExtractor,
    messagesExtractor,
    promptsExtractor = () => [],
    expectedRefusalExtractor,
    name = VISUALIZATION_REFUSAL_EVALUATOR_NAME,
  } = config;

  return {
    name,
    kind: 'CODE',
    direction: 'maximize',
    evaluate: async ({ output, expected }): Promise<EvaluationResult> => {
      const refusal = expectedRefusalExtractor(expected);
      if (!refusal) {
        return skippedResult('Positive example; refusal is not expected.');
      }

      const visualizations = visualizationExtractor(output);
      const message = messagesExtractor(output).join('\n').trim();
      const prompts = promptsExtractor(output);
      const refused = visualizations.length === 0;
      const askedUser = prompts.length > 0;
      const explained = message.length > 0 || askedUser;

      const score = refused ? (explained ? 1 : 0.5) : 0;
      const label = !refused
        ? 'drew-anyway'
        : !explained
        ? 'silent-refusal'
        : message.length > 0
        ? 'refused'
        : 'asked-clarification';
      return {
        score,
        label,
        explanation: !refused
          ? `Expected a refusal (${refusal.reason}) but ${visualizations.length} visualization(s) were produced.`
          : label === 'asked-clarification'
          ? `Declined (${refusal.reason}) by asking the user a clarifying question.`
          : explained
          ? `Refused (${refusal.reason}) with an explanation.`
          : `Refused (${refusal.reason}) but returned no message to the user.`,
        metadata: {
          reason: refusal.reason,
          producedVisualizations: visualizations.length,
          promptCount: prompts.length,
          messageExcerpt: message.slice(0, 300),
        },
      };
    },
  };
}
