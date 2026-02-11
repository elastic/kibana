/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OpenAPIV3 } from 'openapi-types';
import { z } from '@kbn/zod/v4';
import {
  conditionSchema,
  filterConditionSchema,
  shorthandBinaryFilterConditionSchema,
  shorthandUnaryFilterConditionSchema,
  andConditionSchema,
  orConditionSchema,
  notConditionSchema,
  neverConditionSchema,
  alwaysConditionSchema,
  rangeConditionSchema,
  stringOrNumberOrBoolean,
  processorBaseWithWhereSchema,
  grokProcessorSchema,
  dissectProcessorSchema,
  dateProcessorSchema,
  removeProcessorSchema,
  renameProcessorSchema,
  convertProcessorSchema,
} from '@kbn/streamlang';

export const pipelineDefinitionSchema = z
  .object({
    steps: z
      .array(
        // Explicitly set list of processors we want to include in suggestions
        // Currently focused on extract and parse date use cases
        // Future: add set, replace, drop, append processors
        z.union([
          grokProcessorSchema,
          dissectProcessorSchema,
          dateProcessorSchema,
          removeProcessorSchema,
          renameProcessorSchema,
          convertProcessorSchema,
        ])
      )
      .describe(
        'Ordered list of processors that transform documents. Processors execute sequentially'
      ),
  })
  .describe('The pipeline definition object containing processing steps');

export type PipelineDefinition = z.infer<typeof pipelineDefinitionSchema>;

export function getPipelineDefinitionJsonSchema(schema: z.ZodType) {
  // Register recurring schemas with IDs for cleaner $defs output
  const registry = z.registry<{ id?: string }>();
  // NonEmptyString, TODO: Fix
  registry.add(stringOrNumberOrBoolean, { id: 'StringOrNumberOrBoolean' });
  registry.add(rangeConditionSchema, { id: 'RangeCondition' });
  registry.add(shorthandBinaryFilterConditionSchema, { id: 'ShorthandBinaryFilterCondition' });
  registry.add(shorthandUnaryFilterConditionSchema, { id: 'ShorthandUnaryFilterCondition' });
  registry.add(filterConditionSchema, { id: 'FilterCondition' });
  registry.add(andConditionSchema, { id: 'AndCondition' });
  registry.add(orConditionSchema, { id: 'OrCondition' });
  registry.add(notConditionSchema, { id: 'NotCondition' });
  registry.add(neverConditionSchema, { id: 'NeverCondition' });
  registry.add(alwaysConditionSchema, { id: 'AlwaysCondition' });
  registry.add(conditionSchema, { id: 'Condition' });
  registry.add(processorBaseWithWhereSchema, { id: 'ProcessorBase' });

  return z.toJSONSchema(schema, {
    target: 'draft-7',
    metadata: registry,
    reused: 'ref',
  }) as OpenAPIV3.SchemaObject;
}
