/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Evaluator } from '@kbn/evals';
import type { AdapterOutput } from '../../types';

export interface PathEfficiencyConfig {
  /**
   * Maximum number of tool calls considered optimal.
   * Scoring degrades linearly above this threshold.
   */
  optimalToolCount: number;
  /**
   * Maximum number of tool calls before score drops to 0.
   * Defaults to 3x optimalToolCount.
   */
  maxToolCount?: number;
}

export const createPathEfficiencyEvaluator = (config: PathEfficiencyConfig): Evaluator => ({
  name: 'path-efficiency',
  kind: 'CODE',
  evaluate: async ({ output }) => {
    const adapterOutput = output as Partial<AdapterOutput> | undefined;
    const toolCalls = adapterOutput?.toolCalls;

    if (!toolCalls || !Array.isArray(toolCalls)) {
      return {
        score: null,
        label: 'unavailable',
        explanation: 'No tool calls found in output — cannot evaluate path efficiency',
      };
    }

    const actualCount = toolCalls.length;
    const { optimalToolCount } = config;
    const maxToolCount = config.maxToolCount ?? optimalToolCount * 3;

    if (actualCount <= optimalToolCount) {
      return {
        score: 1.0,
        label: 'pass',
        explanation: `Used ${actualCount} tool calls (optimal: ≤${optimalToolCount})`,
        metadata: { actualCount, optimalToolCount, maxToolCount },
      };
    }

    if (actualCount >= maxToolCount) {
      return {
        score: 0.0,
        label: 'fail',
        explanation: `Used ${actualCount} tool calls (max: ${maxToolCount}, optimal: ≤${optimalToolCount})`,
        metadata: { actualCount, optimalToolCount, maxToolCount },
      };
    }

    // Linear interpolation between optimal and max
    const score = 1.0 - (actualCount - optimalToolCount) / (maxToolCount - optimalToolCount);

    return {
      score: Math.max(0, Math.min(1, score)),
      label: score >= 0.5 ? 'warn' : 'fail',
      explanation: `Used ${actualCount} tool calls (optimal: ≤${optimalToolCount}, max: ${maxToolCount})`,
      metadata: { actualCount, optimalToolCount, maxToolCount },
    };
  },
});
