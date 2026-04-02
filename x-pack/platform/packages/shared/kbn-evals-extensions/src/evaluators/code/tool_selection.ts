/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { AdapterOutput } from '../../types';

export interface ToolSelectionConfig {
  /**
   * F-beta parameter controlling precision/recall balance.
   * beta < 1 favors precision (penalizes extra tools more).
   * beta > 1 favors recall (penalizes missing tools more).
   * beta = 1 is the standard F1 score.
   * Defaults to 1.
   */
  beta?: number;
}

/**
 * Computes F-beta score for tool selection accuracy.
 *
 * Compares the set of tool names actually called against an expected set
 * provided in the example's `expected.tools` (or `expected.expectedTools`).
 */
export const createToolSelectionEvaluator = (config?: ToolSelectionConfig): Evaluator => ({
  name: 'tool-selection',
  kind: 'CODE',
  evaluate: async ({ output, expected }) => {
    const adapterOutput = output as Partial<AdapterOutput> | undefined;
    const toolCalls = adapterOutput?.toolCalls;

    if (!toolCalls || !Array.isArray(toolCalls)) {
      return {
        score: null,
        label: 'unavailable',
        explanation: 'No tool calls found in output',
      };
    }

    const expectedRecord = expected as Record<string, unknown> | undefined;
    const expectedTools =
      (expectedRecord?.tools as string[]) ?? (expectedRecord?.expectedTools as string[]);

    if (!expectedTools || !Array.isArray(expectedTools) || expectedTools.length === 0) {
      return {
        score: null,
        label: 'unavailable',
        explanation: 'No expected tools specified for comparison',
      };
    }

    const actualToolSet = new Set(toolCalls.map((tc) => tc.toolName));
    const expectedToolSet = new Set(expectedTools);

    const truePositives = [...actualToolSet].filter((t) => expectedToolSet.has(t)).length;
    const falsePositives = [...actualToolSet].filter((t) => !expectedToolSet.has(t)).length;
    const falseNegatives = [...expectedToolSet].filter((t) => !actualToolSet.has(t)).length;

    const precision =
      truePositives + falsePositives > 0 ? truePositives / (truePositives + falsePositives) : 0;
    const recall =
      truePositives + falseNegatives > 0 ? truePositives / (truePositives + falseNegatives) : 0;

    const beta = config?.beta ?? 1;
    const betaSquared = beta * beta;

    let fBeta: number;
    if (precision + recall === 0) {
      fBeta = 0;
    } else {
      fBeta = ((1 + betaSquared) * precision * recall) / (betaSquared * precision + recall);
    }

    const extraTools = [...actualToolSet].filter((t) => !expectedToolSet.has(t));
    const missingTools = [...expectedToolSet].filter((t) => !actualToolSet.has(t));

    const explanationParts: string[] = [
      `F${beta === 1 ? '1' : `β(${beta})`}=${fBeta.toFixed(3)}`,
      `precision=${precision.toFixed(3)}`,
      `recall=${recall.toFixed(3)}`,
    ];
    if (extraTools.length > 0) {
      explanationParts.push(`extra: [${extraTools.join(', ')}]`);
    }
    if (missingTools.length > 0) {
      explanationParts.push(`missing: [${missingTools.join(', ')}]`);
    }

    return {
      score: fBeta,
      label: fBeta >= 0.8 ? 'pass' : fBeta >= 0.5 ? 'warn' : 'fail',
      explanation: explanationParts.join(', '),
      metadata: {
        precision,
        recall,
        fBeta,
        beta,
        truePositives,
        falsePositives,
        falseNegatives,
        extraTools,
        missingTools,
      },
    };
  },
});
