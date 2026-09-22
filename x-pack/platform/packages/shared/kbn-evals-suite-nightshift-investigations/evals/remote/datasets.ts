/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';
import { z } from '@kbn/zod/v4';
import type { EvaluationDataset } from '@kbn/evals';
import { createInvestigationExampleSchema, type InvestigationExample } from '../golden/types';
import { ELASTIC_INVESTIGATION_EVAL_CONSTRAINTS } from './prompts';

export const REMOTE_EXAMPLES_FILE_ENV = 'NIGHTSHIFT_REMOTE_EXAMPLES_FILE';
export const DEFAULT_REMOTE_DATASET_NAME = 'nightshift/remote-smoke';

/** Only Nightshift-owned datasets may be written; approved source datasets are never upserted. */
const OWNED_DATASET_PREFIX = 'nightshift/';

export const remoteExampleSchema = createInvestigationExampleSchema(
  ELASTIC_INVESTIGATION_EVAL_CONSTRAINTS.length
);

/** The local examples file: labels only, never committed, written by the operator's skill. */
export const remoteExamplesFileSchema = z.object({
  dataset: z
    .string()
    .min(OWNED_DATASET_PREFIX.length + 1)
    .max(200)
    .startsWith(OWNED_DATASET_PREFIX)
    .default(DEFAULT_REMOTE_DATASET_NAME),
  description: z.string().max(2_000).optional(),
  tags: z.array(z.string().min(1).max(100)).max(20).default([]),
  examples: z.array(remoteExampleSchema).min(1).max(1_000),
});

export type RemoteExamplesFile = z.infer<typeof remoteExamplesFileSchema>;

/** Reads the operator-supplied examples into an owned dataset for the remote-telemetry eval. */
export const readRemoteDataset = (path: string): EvaluationDataset<InvestigationExample> => {
  const file = remoteExamplesFileSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
  return {
    name: file.dataset,
    description:
      file.description ??
      'Capability Baseline: operator-labelled incidents investigated against a remote telemetry cluster.',
    tags: [...new Set(['nightshift', 'capability-baseline', ...file.tags])],
    examples: file.examples,
  };
};

export const resolveRemoteExamplesFile = (): string => {
  const path = process.env[REMOTE_EXAMPLES_FILE_ENV];
  if (!path)
    throw new Error(
      `${REMOTE_EXAMPLES_FILE_ENV} must point at a local examples file when NIGHTSHIFT_DATASETS=remote.`
    );
  return path;
};
