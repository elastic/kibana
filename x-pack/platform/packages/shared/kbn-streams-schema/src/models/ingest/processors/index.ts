/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';
import { Condition, conditionSchema } from '../conditions';
import { createIsNarrowSchema } from '../../../helpers';

export interface ProcessorBase {
  description?: string;
  if: Condition;
  ignore_failure?: boolean;
}

export interface GrokProcessorConfig extends ProcessorBase {
  field: string;
  patterns: string[];
  pattern_definitions?: Record<string, string>;
  ignore_missing?: boolean;
}

export interface GrokProcessorDefinition {
  grok: GrokProcessorConfig;
}

const processorBaseSchema = z.object({
  description: z.optional(z.string()),
  if: conditionSchema,
  ignore_failure: z.optional(z.boolean()),
});

export const grokProcessorDefinitionSchema: z.Schema<GrokProcessorDefinition> = z.strictObject({
  grok: z.intersection(
    processorBaseSchema,
    z.object({
      field: NonEmptyString,
      patterns: z.array(NonEmptyString).nonempty(),
      pattern_definitions: z.optional(z.record(z.string())),
      ignore_missing: z.optional(z.boolean()),
    })
  ),
});

export interface DissectProcessorConfig extends ProcessorBase {
  field: string;
  pattern: string;
  append_separator?: string;
  ignore_missing?: boolean;
}

export interface DissectProcessorDefinition {
  dissect: DissectProcessorConfig;
}

export const dissectProcessorDefinitionSchema: z.Schema<DissectProcessorDefinition> =
  z.strictObject({
    dissect: z.intersection(
      processorBaseSchema,
      z.object({
        field: NonEmptyString,
        pattern: NonEmptyString,
        append_separator: z.optional(NonEmptyString),
        ignore_missing: z.optional(z.boolean()),
      })
    ),
  });

export type ProcessorDefinition = DissectProcessorDefinition | GrokProcessorDefinition;

type UnionKeysOf<T extends Record<string, any>> = T extends T ? keyof T : never;
type BodyOf<T extends Record<string, any>> = T extends T ? T[keyof T] : never;

export type ProcessorConfig = BodyOf<ProcessorDefinition>;

export type ProcessorType = UnionKeysOf<ProcessorDefinition>;

export type ProcessorTypeOf<TProcessorDefinition extends ProcessorDefinition> =
  UnionKeysOf<TProcessorDefinition> & ProcessorType;

export const processorDefinitionSchema: z.ZodType<ProcessorDefinition> = z.union([
  grokProcessorDefinitionSchema,
  dissectProcessorDefinitionSchema,
]);

export const isGrokProcessorDefinition = createIsNarrowSchema(
  processorDefinitionSchema,
  grokProcessorDefinitionSchema
);

export const isDissectProcessorDefinition = createIsNarrowSchema(
  processorDefinitionSchema,
  dissectProcessorDefinitionSchema
);

const processorTypes: ProcessorType[] = (processorDefinitionSchema as z.ZodUnion<any>).options.map(
  (option: z.ZodUnion<any>['options'][number]) => Object.keys(option.shape)[0]
);

export function getProcessorType<TProcessorDefinition extends ProcessorDefinition>(
  processor: TProcessorDefinition
): ProcessorTypeOf<TProcessorDefinition> {
  return processorTypes.find((type) => type in processor) as ProcessorTypeOf<TProcessorDefinition>;
}

export function getProcessorConfig<TProcessorDefinition extends ProcessorDefinition>(
  processor: TProcessorDefinition
): ProcessorConfig {
  const type = getProcessorType(processor);

  return processor[type as keyof TProcessorDefinition];
}
