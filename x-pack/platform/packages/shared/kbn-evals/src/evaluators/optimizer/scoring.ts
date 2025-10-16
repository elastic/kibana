/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OptimizerAnalysis } from './types';

export function calculateOptimizerScore(analysis: OptimizerAnalysis): number {
  const rawScore = analysis.satisfaction_score;

  if (typeof rawScore !== 'number' || isNaN(rawScore)) {
    throw new Error('Invalid satisfaction score: must be a number');
  }

  if (rawScore < 0 || rawScore > 10) {
    throw new Error(`Satisfaction score out of range: ${rawScore}. Must be between 0 and 10`);
  }

  return rawScore / 10;
}
