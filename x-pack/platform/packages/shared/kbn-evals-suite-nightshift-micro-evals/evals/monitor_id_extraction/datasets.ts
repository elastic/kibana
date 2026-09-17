/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvaluationDataset } from '@kbn/evals';
import { readMicroDataset } from '../../src/datasets';
import { exampleSchema, type MonitorExample } from './types';

export const SOURCE_DATASET = 'deductive/monitor_id_extraction';
export const DATASET_NAME = 'nightshift/micro/monitor_id_extraction';
export const SPLITS = ['suite/baseline'];

/** Reads the complete active monitor-id baseline into a Nightshift-owned dataset. */
export const readDataset = (path: string): EvaluationDataset<MonitorExample> =>
  readMicroDataset(
    path,
    exampleSchema,
    SOURCE_DATASET,
    DATASET_NAME,
    'MonitorIdExtraction',
    SPLITS
  );
