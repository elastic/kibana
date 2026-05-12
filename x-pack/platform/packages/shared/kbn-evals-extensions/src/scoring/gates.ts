/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CiGateConfig, CiGateResult, GateFailure } from '../types';

export const evaluateCiGates = (
  evaluatorResults: Array<{ evaluator: string; score: number | null }>,
  compositeScore: number,
  config: CiGateConfig
): CiGateResult => {
  const failedGates: GateFailure[] = [];

  // Check composite threshold
  if (config.compositeThreshold != null && compositeScore < config.compositeThreshold) {
    failedGates.push({
      gate: 'composite-threshold',
      expected: config.compositeThreshold,
      actual: compositeScore,
      message: `Composite score ${compositeScore.toFixed(3)} below threshold ${
        config.compositeThreshold
      }`,
    });
  }

  // Check required-pass evaluators: "must not fail" = score must be non-null and > 0.
  // For strict thresholds (e.g., safety must be 1.0), use perEvaluator min instead.
  for (const required of config.requiredPass ?? []) {
    const result = evaluatorResults.find((r) => r.evaluator === required);
    if (!result || result.score === null || result.score === 0) {
      failedGates.push({
        gate: 'required-pass',
        evaluator: required,
        expected: 0,
        actual: result?.score ?? 0,
        message: `Required evaluator "${required}" failed (score: ${result?.score ?? 'null'})`,
      });
    }
  }

  // Check per-evaluator thresholds
  for (const [evaluator, thresholds] of Object.entries(config.perEvaluator ?? {})) {
    const result = evaluatorResults.find((r) => r.evaluator === evaluator);
    if (result?.score != null && thresholds.min != null && result.score < thresholds.min) {
      failedGates.push({
        gate: 'per-evaluator-min',
        evaluator,
        expected: thresholds.min,
        actual: result.score,
        message: `Evaluator "${evaluator}" score ${result.score.toFixed(3)} below minimum ${
          thresholds.min
        }`,
      });
    }
  }

  return { passed: failedGates.length === 0, failedGates };
};
