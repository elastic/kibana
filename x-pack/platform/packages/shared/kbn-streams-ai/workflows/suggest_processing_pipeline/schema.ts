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
import { NonEmptyString } from '@kbn/zod-helpers/v4';

const postParseProcessorUnionSchema = z.union([
  dateProcessorSchema,
  removeProcessorSchema,
  renameProcessorSchema,
  convertProcessorSchema,
]);

const fullProcessorUnionSchema = z.union([
  grokProcessorSchema,
  dissectProcessorSchema,
  dateProcessorSchema,
  removeProcessorSchema,
  renameProcessorSchema,
  convertProcessorSchema,
]);

export const pipelineDefinitionSchema = z
  .object({
    steps: z
      .array(
        // Explicitly set list of processors we want to include in suggestions
        // Currently focused on extract and parse date use cases
        // Future: add set, replace, drop, append processors
        fullProcessorUnionSchema
      )
      .describe(
        'Ordered list of processors that transform documents. Processors execute sequentially'
      ),
  })
  .describe('The pipeline definition object containing processing steps');

/**
 * When a system-managed grok/dissect step runs first, the agent only proposes
 * post-parse processors; grok/dissect are excluded to avoid duplicate parsing.
 */
export const postParsePipelineDefinitionSchema = z
  .object({
    steps: z
      .array(postParseProcessorUnionSchema)
      .describe(
        'Ordered list of post-parse processors (no grok/dissect). Processors execute sequentially'
      ),
  })
  .describe('Pipeline definition for post-parse-only suggested steps (no grok/dissect)');

export type PipelineDefinition = z.infer<typeof pipelineDefinitionSchema>;
export type PostParsePipelineDefinition = z.infer<typeof postParsePipelineDefinitionSchema>;

export const FULL_PIPELINE_ACTIONS = new Set([
  'grok',
  'dissect',
  'date',
  'remove',
  'rename',
  'convert',
]);
export const POST_PARSE_PIPELINE_ACTIONS = new Set(['date', 'remove', 'rename', 'convert']);

/** Zod schema passed to `suggestProcessingPipeline` to constrain tool calls; chosen by the caller. */
export type SuggestPipelineAgentSchema =
  | typeof pipelineDefinitionSchema
  | typeof postParsePipelineDefinitionSchema;

export function getPipelineDefinitionJsonSchema(schema: z.ZodType) {
  // Register recurring schemas with IDs for cleaner $defs output
  const registry = z.registry<{ id?: string }>();
  registry.add(NonEmptyString, { id: 'NonEmptyString' });
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
