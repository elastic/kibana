/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationDataset } from '@kbn/evals';
import { readMicroDataset } from '../../src/datasets';
import { exampleSchema, type PlanMergeExample } from './types';

export const SOURCE_DATASET = 'deductive/context_graph_mutation';
export const DATASET_NAME = 'nightshift/micro/context_graph_mutation';
export const SPLITS: string[] = [];

/** Reads every active mutation example into a Nightshift-owned dataset. */
export const readDataset = (path: string): EvaluationDataset<PlanMergeExample> =>
  readMicroDataset(path, exampleSchema, SOURCE_DATASET, DATASET_NAME, 'PlanMerge', SPLITS);
