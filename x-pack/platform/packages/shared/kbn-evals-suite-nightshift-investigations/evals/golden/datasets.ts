/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationDataset } from '@kbn/evals';
import type { GoldenExample } from './types';

/**
 * The Nightshift-owned lite slice. Its examples live on the evaluations cluster and are resolved
 * by name when the experiment starts, so none are committed or derived here.
 */
export const GOLDEN_SPLIT = 'suite/investigate-lite';
/** Size of the approved lite slice; the acceptance run must evaluate exactly these examples. */
export const GOLDEN_EXAMPLE_COUNT = 4;

export const goldenDataset: EvaluationDataset<GoldenExample> = {
  name: 'nightshift/investigate-lite',
  description:
    'Harness Parity: approved investigate-lite inputs against the Nightshift Deductive Investigator without source telemetry access.',
  examples: [],
};
