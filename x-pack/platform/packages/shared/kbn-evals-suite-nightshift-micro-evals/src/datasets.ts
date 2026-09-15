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

import type { metadataSchema } from './example_schema';

interface DatasetExample {
  input: Record<string, z.infer<ReturnType<typeof z.json>> | undefined>;
  output: Record<string, z.infer<ReturnType<typeof z.json>> | undefined>;
  metadata: z.infer<typeof metadataSchema>;
}

/** Derives an owned dataset while retaining source fields and provenance. */
export const readMicroDataset = <TExample extends DatasetExample>(
  path: string,
  exampleSchema: z.ZodType<TExample>,
  source: string,
  name: string,
  task: string,
  splits: readonly string[]
): EvaluationDataset<TExample> => {
  const snapshot = z
    .object({
      name: z.literal(source),
      examples: z
        .array(z.object({ id: z.string().min(1).max(500) }).and(exampleSchema))
        .max(10_000),
    })
    .parse(JSON.parse(readFileSync(path, 'utf8')));
  const examples = selectDatasetExamples(snapshot.examples, splits).map(
    ({ id, input, output, metadata }) =>
      exampleSchema.parse({ input, output, metadata: { ...metadata, source_kbn_example_id: id } })
  );
  return {
    name,
    description: `Reference Target: ${task} on Kibana inference, derived from ${source}.`,
    tags: ['nightshift', 'micro-eval', task],
    examples,
  };
};
