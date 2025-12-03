/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OpenAPIV3 } from 'openapi-types';
import { z } from '@kbn/zod';
import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  NonEmptyString,
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

export function getPipelineDefinitionJsonSchema(schema: z.ZodSchema) {
  return zodToJsonSchema(schema, {
    target: 'openApi3',
    $refStrategy: 'root',
    name: 'PipelineDefinition',
    // Manually add recurring schemas for cleaner output
    definitions: {
      NonEmptyString,
      StringOrNumberOrBoolean: stringOrNumberOrBoolean,
      RangeCondition: rangeConditionSchema,
      ShorthandBinaryFilterCondition: shorthandBinaryFilterConditionSchema,
      ShorthandUnaryFilterCondition: shorthandUnaryFilterConditionSchema,
      FilterCondition: filterConditionSchema,
      AndCondition: andConditionSchema,
      OrCondition: orConditionSchema,
      NotCondition: notConditionSchema,
      NeverCondition: neverConditionSchema,
      AlwaysCondition: alwaysConditionSchema,
      Condition: conditionSchema,
      ProcessorBase: processorBaseWithWhereSchema,
    },
  }) as OpenAPIV3.SchemaObject;
}
