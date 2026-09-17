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

export const GOLDEN_DATASET_NAME = 'nightshift/investigate-lite';
export const GOLDEN_SPLITS = ['suite/investigate-lite'];

const snapshotSchema = z.object({
  name: z.string().min(1).max(500),
  examples: z.array(goldenExampleSchema.extend({ id: z.string().min(1).max(500) })).max(10_000),
});

/** Reads the approved source name from private runtime configuration. */
export const getGoldenSourceDatasetName = (): string => {
  const name = process.env.NIGHTSHIFT_GOLDEN_SOURCE_DATASET;
  if (!name?.trim() || name.length > 500) {
    throw new Error(
      'Set NIGHTSHIFT_GOLDEN_SOURCE_DATASET to the approved source dataset name (1–500 characters).'
    );
  }
  return name;
};

/** Derives the owned lite dataset from the source snapshot without retaining its persisted IDs. */
export const readGoldenDataset = (
  snapshotPath: string,
  sourceDatasetName: string,
  splits: readonly string[] = GOLDEN_SPLITS
): EvaluationDataset<GoldenExample> => {
  const snapshot = snapshotSchema.parse(JSON.parse(readFileSync(snapshotPath, 'utf8')));
  if (snapshot.name !== sourceDatasetName) {
    throw new Error('Golden snapshot does not match the configured source dataset.');
  }
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
