/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { isSchema } from '@kbn/zod-helpers';
import type { Condition } from './conditions';
import { conditionSchema, ensureConditionType } from './conditions';
import type { StreamlangProcessorDefinition } from './processors';
import { streamlangProcessorSchema } from './processors';
import type { StreamlangStepWithUIAttributes } from './ui';

// Recursive schema for ConditionWithSteps
export type ConditionWithSteps = Condition & { steps: StreamlangStep[] };

export const conditionWithStepsSchema: z.ZodType<ConditionWithSteps> = z.lazy(() =>
  z.intersection(
    conditionSchema,
    z.object({
      steps: z.array(streamlangStepSchema),
    })
  )
) as any;

/**
 * Nested where block (recursive)
 */
export interface StreamlangWhereBlock {
  customIdentifier?: string;
  where: ConditionWithSteps;
}

/**
 * Zod schema for a where block
 */
export const streamlangWhereBlockSchema: z.ZodType<StreamlangWhereBlock> = z.object({
  customIdentifier: z.string().optional(),
  where: conditionWithStepsSchema,
});

export const isWhereBlockSchema = (obj: any): obj is StreamlangWhereBlock => {
  return isSchema(streamlangWhereBlockSchema, obj);
};

// Cheap check that bypasses having to do full schema checks.
// This is useful for quickly identifying where blocks without full recursive validation.
export const isWhereBlock = (obj: any): obj is StreamlangWhereBlock => {
  return 'where' in obj && !('action' in obj);
};

/**
 * A step can be either a processor or a where block (optionally recursive)
 */
export type StreamlangStep = StreamlangProcessorDefinition | StreamlangWhereBlock;

export const streamlangStepSchema: z.ZodType<StreamlangStep> = z.lazy(() =>
  z.union([streamlangProcessorSchema, streamlangWhereBlockSchema])
) as any;

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

const ensureConditionWithStepsHasType = (condition: ConditionWithSteps): ConditionWithSteps => {
  const { steps, ...rest } = condition;
  const typedCondition = ensureConditionType(rest as Condition);
  return {
    ...typedCondition,
    steps: steps.map(ensureStreamlangStepHasTypedConditions),
  };
};

const ensureWhereBlockHasTypedConditions = (block: StreamlangWhereBlock): StreamlangWhereBlock => ({
  ...block,
  where: ensureConditionWithStepsHasType(block.where),
});

const ensureProcessorHasTypedCondition = <TProcessor extends StreamlangProcessorDefinition>(
  processor: TProcessor
): TProcessor => {
  if (!(processor as any).where) {
    return processor;
  }

  return {
    ...processor,
    where: ensureConditionType((processor as any).where as Condition),
  };
};

const ensureStreamlangStepHasTypedConditions = (step: StreamlangStep): StreamlangStep => {
  if (isWhereBlock(step)) {
    return ensureWhereBlockHasTypedConditions(step);
  }

  if (isActionBlock(step)) {
    return ensureProcessorHasTypedCondition(step);
  }

  return step;
};

export const ensureStreamlangDSLHasTypedConditions = (dsl: StreamlangDSL): StreamlangDSL => ({
  ...dsl,
  steps: dsl.steps.map(ensureStreamlangStepHasTypedConditions),
});
