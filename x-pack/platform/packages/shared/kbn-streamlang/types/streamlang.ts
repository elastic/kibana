/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { isSchema } from '@kbn/zod-helpers';
import type { Condition } from './conditions';
import { conditionSchema } from './conditions';
import type { StreamlangProcessorDefinition } from './processors';
import { streamlangProcessorSchema } from './processors';
import type { StreamlangStepWithUIAttributes } from './ui';

/**
 * Stream type for filtering available Streamlang actions and validation rules.
 * - 'wired': Wired streams (excludes manual_ingest_pipeline)
 * - 'classic': Classic streams (all actions available)
 */
export type StreamType = 'wired' | 'classic';

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
 * Nested condition block (recursive)
 */
export interface StreamlangConditionBlock {
  customIdentifier?: string;
  condition: ConditionWithSteps;
}

/**
 * Zod schema for a condition block
 */
export const streamlangConditionBlockSchema: z.ZodType<StreamlangConditionBlock> = z.object({
  customIdentifier: z.string().optional(),
  condition: conditionWithStepsSchema,
});

export const isConditionBlockSchema = (obj: any): obj is StreamlangConditionBlock => {
  return isSchema(streamlangConditionBlockSchema, obj);
};

// Cheap check that bypasses having to do full schema checks.
// This is useful for quickly identifying condition blocks without full recursive validation.
export const isConditionBlock = (obj: any): obj is StreamlangConditionBlock => {
  return 'condition' in obj && !('action' in obj);
};

/**
 * A step can be either a processor or a condition block (optionally recursive)
 */
export type StreamlangStep = StreamlangProcessorDefinition | StreamlangConditionBlock;
export const streamlangStepSchema: z.ZodType<StreamlangStep> = z.lazy(() =>
  z.union([streamlangProcessorSchema, streamlangConditionBlockSchema])
);

export const isActionBlockSchema = (obj: any): obj is StreamlangProcessorDefinition => {
  return isSchema(streamlangProcessorSchema, obj);
};

// Cheap check that bypasses having to do full schema checks.
// This is useful for quickly identifying action blocks without full recursive validation.
export const isActionBlock = <TBlock extends StreamlangStep | StreamlangStepWithUIAttributes>(
  obj?: TBlock
): obj is Extract<TBlock, { action: string }> => {
  return obj !== undefined && 'action' in obj;
};

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

export const isStreamlangDSLSchema = (obj: any): obj is StreamlangDSL => {
  return isSchema(streamlangDSLSchema, obj);
};
