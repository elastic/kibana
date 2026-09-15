/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { Evaluator } from '@kbn/evals';
import { metadataSchema, textSchema } from '../../src/example_schema';

export const exampleSchema = z.object({
  input: z
    .object({
      user_message: textSchema.optional(),
      existing_monitors: z
        .array(
          z.union([
            z.tuple([textSchema, textSchema]),
            z.object({ monitor_id: textSchema, symptom: textSchema }).catchall(z.json()),
          ])
        )
        .max(10_000)
        .nullable()
        .optional(),
    })
    .catchall(z.json()),
  output: z.object({ expected_monitor_id: textSchema.nullable().optional() }).catchall(z.json()),
  metadata: metadataSchema,
});

export type MonitorExample = z.infer<typeof exampleSchema>;
export interface MonitorOutput {
  monitor_id: string;
  error?: string;
}
export type MonitorEvaluator = Evaluator<MonitorExample, MonitorOutput>;
