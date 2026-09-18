/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationDataset } from '@kbn/evals';
import { readMicroDataset } from '../../src/datasets';
import { exampleSchema, type PlanExtractionExample } from './types';

export const SOURCE_DATASET = 'deductive/context_graph';
export const DATASET_NAME = 'nightshift/micro/context_graph';

/** Reads the approved extraction split from private runtime configuration. */
export const getPlanExtractionSplit = (): string => {
  const split = process.env.NIGHTSHIFT_PLAN_EXTRACTION_SPLIT;
  if (!split?.trim() || split.length > 500) {
    throw new Error(
      'Set NIGHTSHIFT_PLAN_EXTRACTION_SPLIT to the approved extraction split (1–500 characters).'
    );
  }
  return split;
};

/** Reads the complete active extraction split into a Nightshift-owned dataset. */
export const readDataset = (
  path: string,
  split: string = getPlanExtractionSplit()
): EvaluationDataset<PlanExtractionExample> =>
  readMicroDataset(path, exampleSchema, SOURCE_DATASET, DATASET_NAME, 'PlanExtraction', [split]);
