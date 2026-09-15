/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { Evaluator } from '@kbn/evals';
import { metadataSchema, textSchema } from '../../src/example_schema';

const nodeIds = z.array(z.string().max(500)).max(10_000).nullable().optional();
export const exampleSchema = z.object({
  input: z
    .object({
      initial_tree_mermaid: textSchema.nullable().optional(),
      causal_summary: textSchema.nullable().optional(),
      question: textSchema.nullable().optional(),
    })
    .catchall(z.json()),
  output: z
    .object({
      expected_merged_mermaid: textSchema.nullable().optional(),
      mutation_spec: z
        .object({
          preserved_node_ids: nodeIds,
          nodes_added: nodeIds,
          nodes_deleted: nodeIds,
          correct_terminal: z.string().max(500).nullable().optional(),
          terminals_without_checkmark: nodeIds,
        })
        .catchall(z.json())
        .nullable()
        .optional(),
    })
    .catchall(z.json()),
  metadata: metadataSchema,
});

export type PlanMergeExample = z.infer<typeof exampleSchema>;
export interface PlanMergeOutput {
  merged_mermaid?: string;
  decision_tree_mermaid?: string;
  error?: string;
}
export type PlanMergeEvaluator = Evaluator<PlanMergeExample, PlanMergeOutput>;
