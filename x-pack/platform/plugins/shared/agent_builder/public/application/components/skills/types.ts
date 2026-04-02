/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface EvalResults {
  summary: { meanScore: number; passRate: number; examplesRan: number };
  evaluatorScores: Array<{
    name: string;
    meanScore: number;
    passCount: number;
    failCount: number;
  }>;
}
