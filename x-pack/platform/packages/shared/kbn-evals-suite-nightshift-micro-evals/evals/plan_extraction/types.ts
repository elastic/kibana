/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { Evaluator } from '@kbn/evals';
import type { InvestigationPlan } from '../../src/investigation_plan';
import { metadataSchema, textSchema } from '../../src/example_schema';

export const exampleSchema = z.object({
  input: z
    .object({
      messages: z
        .array(
          z
            .object({ type: z.string().max(100).optional(), content: textSchema.optional() })
            .catchall(z.json())
        )
        .max(10_000)
        .nullable()
        .optional(),
      existing_tree_mermaid: textSchema.nullable().optional(),
    })
    .catchall(z.json()),
  output: z
    .object({
      expected_tree_mermaid: textSchema.nullable().optional(),
      expected_decision_tree_mermaid: textSchema.nullable().optional(),
    })
    .catchall(z.json()),
  metadata: metadataSchema,
});

export type PlanExtractionExample = z.infer<typeof exampleSchema>;
export type PlanExtractionOutput =
  | InvestigationPlan
  | { decision_tree_mermaid: string; error: string };
export type PlanExtractionEvaluator = Evaluator<PlanExtractionExample, PlanExtractionOutput>;
