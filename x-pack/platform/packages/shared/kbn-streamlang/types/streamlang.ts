/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { Condition, conditionSchema } from './conditions';
import { StreamlangProcessorDefinition, streamlangProcessorSchema } from './processors';

// Recursive schema for ConditionWithSteps
export const conditionWithStepsSchema: z.ZodType<ConditionWithSteps> = z.lazy(() =>
  z.intersection(
    conditionSchema,
    z.object({
      steps: z.array(streamlangStepSchema),
    })
  )
);

export type ConditionWithSteps = Condition & { steps: StreamlangStep[] };

/**
 * Nested where block (recursive)
 */
export interface StreamlangWhereBlock {
  where: ConditionWithSteps;
}

/**
 * Zod schema for a where block
 */
export const streamlangWhereBlockSchema: z.ZodType<StreamlangWhereBlock> = z.object({
  where: conditionWithStepsSchema,
});

/**
 * A step can be either a processor or a where block (optionally recursive)
 */
export type StreamlangStep = StreamlangProcessorDefinition | StreamlangWhereBlock;
export const streamlangStepSchema: z.ZodType<StreamlangStep> = z.lazy(() =>
  z.union([streamlangProcessorSchema, streamlangWhereBlockSchema])
);

/**
 * Streamlang DSL Root Type
 */
export interface StreamlangDSL {
  steps: StreamlangStep[];
}

/**
 * Zod schema for the Streamlang DSL root
 */
export const streamlangDSLSchema = z.object({
  steps: z.array(streamlangStepSchema),
});
