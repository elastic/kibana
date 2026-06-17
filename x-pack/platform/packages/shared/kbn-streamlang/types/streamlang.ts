/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { isSchema } from '@kbn/zod-helpers/v4';
import type { Condition } from './conditions';
import {
  alwaysConditionSchema,
  neverConditionSchema,
  andConditionSchema,
  orConditionSchema,
  notConditionSchema,
  shorthandBinaryFilterConditionSchema,
  shorthandUnaryFilterConditionSchema,
} from './conditions';
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
export const conditionWithStepsSchema: z.ZodType<ConditionWithSteps> = z
  .lazy(() => {
    const stepsExtension = {
      steps: z.array(streamlangStepSchema),
      else: z.array(streamlangStepSchema).optional(),
    };
    return z.union([
      alwaysConditionSchema.extend(stepsExtension),
      neverConditionSchema.extend(stepsExtension),
      andConditionSchema.extend(stepsExtension),
      orConditionSchema.extend(stepsExtension),
      notConditionSchema.extend(stepsExtension),
      shorthandBinaryFilterConditionSchema.extend(stepsExtension),
      shorthandUnaryFilterConditionSchema.extend(stepsExtension),
    ]);
  })
  .meta({ id: 'ConditionWithSteps' });

export type ConditionWithSteps = Condition & { steps: StreamlangStep[]; else?: StreamlangStep[] };

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
export const streamlangConditionBlockSchema: z.ZodType<StreamlangConditionBlock> = z
  .strictObject({
    customIdentifier: z.string().optional(),
    condition: conditionWithStepsSchema,
  })
  .meta({ id: 'StreamlangConditionBlock' });

export const isConditionBlockSchema = (obj: unknown): obj is StreamlangConditionBlock => {
  return isSchema(streamlangConditionBlockSchema, obj);
};

// Cheap check that bypasses having to do full schema checks.
// This is useful for quickly identifying condition blocks without full recursive validation.
export const isConditionBlock = (obj: unknown): obj is StreamlangConditionBlock => {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    Object.hasOwn(obj, 'condition') &&
    !Object.hasOwn(obj, 'action')
  );
};

/**
 * A step can be either a processor or a condition block (optionally recursive)
 */
export type StreamlangStep = StreamlangProcessorDefinition | StreamlangConditionBlock;
export const streamlangStepSchema: z.ZodType<StreamlangStep> = z
  .lazy(() => z.union([streamlangProcessorSchema, streamlangConditionBlockSchema]))
  .meta({ id: 'StreamlangStep' });

export const isActionBlockSchema = (obj: unknown): obj is StreamlangProcessorDefinition => {
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
 * Streamlang as stored on stream `ingest.processing`: the DSL plus the server-managed
 * `updated_at` cursor. Use {@link StreamlangDSL} anywhere you need the pipeline document only
 * (YAML, simulation body, DeepStrict validation).
 */
export type StreamlangDSLWithUpdatedAt = StreamlangDSL & {
  updated_at: string;
};

/**
 * Zod schema for the Streamlang DSL root
 */
export const streamlangDSLSchema = z.strictObject({
  steps: z.array(streamlangStepSchema),
  updated_at: z.iso.datetime().optional(),
});

export const isStreamlangDSLSchema = (obj: unknown): obj is StreamlangDSL => {
  return isSchema(streamlangDSLSchema, obj);
};
