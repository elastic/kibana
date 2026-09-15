/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { z } from '@kbn/zod/v4';
import type { EvaluationDataset } from '@kbn/evals';
import { selectDatasetExamples } from '@kbn/evals-extensions';
import { goldenExampleSchema, type GoldenExample } from './types';

export const GOLDEN_SOURCE_DATASET = 'deductive/doordashv2';
export const GOLDEN_DATASET_NAME = 'nightshift/investigate-lite';
export const GOLDEN_SPLITS = ['suite/investigate-lite'];

const snapshotSchema = z.object({
  name: z.literal(GOLDEN_SOURCE_DATASET),
  examples: z.array(goldenExampleSchema.extend({ id: z.string().min(1).max(500) })).max(10_000),
});

/** Derives the owned lite dataset from the source snapshot without retaining its persisted IDs. */
export const readGoldenDataset = (
  snapshotPath: string,
  splits: readonly string[] = GOLDEN_SPLITS
): EvaluationDataset<GoldenExample> => {
  const snapshot = snapshotSchema.parse(JSON.parse(readFileSync(snapshotPath, 'utf8')));
  const examples = selectDatasetExamples(snapshot.examples, splits).map(
    ({ id, input, output, metadata }) => ({
      input,
      output,
      metadata: { ...metadata, source_kbn_example_id: id },
    })
  );
  return {
    name: GOLDEN_DATASET_NAME,
    description:
      'Harness Parity: approved investigate-lite inputs against the Nightshift Deductive Investigator without source telemetry access.',
    tags: ['nightshift', 'harness-parity', 'investigate-lite'],
    examples,
  };
};
