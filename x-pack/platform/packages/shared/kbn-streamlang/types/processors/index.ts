/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';
import { createIsNarrowSchema } from '@kbn/zod-helpers';
import type { Condition } from '../conditions';
import { conditionSchema } from '../conditions';
import {
  NoMustacheValue,
  NoMustacheArrayValues,
  StreamlangSourceField,
  StreamlangTargetField,
  StreamlangSeparator,
} from './fields';
import type { ElasticsearchProcessorType } from './manual_ingest_pipeline_processors';
import { elasticsearchProcessorTypes } from './manual_ingest_pipeline_processors';
import type { ConvertType } from '../formats/convert_types';
import { convertTypes } from '../formats/convert_types';

/**
 * Base processor
 */
export interface ProcessorBase {
  /* Optional property that can be used to identify / relate the processor block in transpilation targets.
  This will be mapped as a tag for ingest pipelines.
  This can then be used to relate transpilation output back to the DSL definition,
  useful for things like simulation handling, debugging, or gathering of metrics. */
  customIdentifier?: string;
  description?: string;
  ignore_failure?: boolean;
}

const processorBaseSchema = z.object({
  customIdentifier: z.optional(NonEmptyString),
  description: z.optional(z.string()),
  ignore_failure: z.optional(z.boolean()),
});

/**
 * Base with where
 */
export interface ProcessorBaseWithWhere extends ProcessorBase {
  where?: Condition;
}

const processorBaseWithWhereSchema = processorBaseSchema.extend({
  where: z.optional(conditionSchema),
});

/* Manual ingest pipeline processor */

// Not 100% accurate, but close enough for our use case to provide minimal safety
// without having to check all details
export type ElasticsearchProcessor = Partial<Record<ElasticsearchProcessorType, unknown>>;

export interface ManualIngestPipelineProcessor extends ProcessorBaseWithWhere {
  action: 'manual_ingest_pipeline';
  processors: ElasticsearchProcessor[];
  /* Ignore failure of individual processors */
  ignore_failure?: boolean;
  tag?: string;
  on_failure?: Array<Record<string, unknown>>;
}

export const manualIngestPipelineProcessorSchema = processorBaseWithWhereSchema.extend({
  action: z.literal('manual_ingest_pipeline'),
  processors: z.array(z.record(z.enum(elasticsearchProcessorTypes), z.unknown())),
  tag: z.optional(z.string()),
  on_failure: z.optional(z.array(z.record(z.unknown()))),
}) satisfies z.Schema<ManualIngestPipelineProcessor>;

/**
 * Grok processor
 */
export interface GrokProcessor extends ProcessorBaseWithWhere {
  action: 'grok';
  from: string;
  patterns: string[];
  pattern_definitions?: Record<string, string>;
  ignore_missing?: boolean;
}

export const grokProcessorSchema = processorBaseWithWhereSchema.extend({
  action: z.literal('grok'),
  from: StreamlangSourceField,
  patterns: z.array(NonEmptyString).nonempty(),
  pattern_definitions: z.optional(z.record(z.string())),
  ignore_missing: z.optional(z.boolean()),
}) satisfies z.Schema<GrokProcessor>;

/**
 * Dissect processor
 */

export interface DissectProcessor extends ProcessorBaseWithWhere {
  action: 'dissect';
  from: string;
  pattern: string;
  append_separator?: string;
  ignore_missing?: boolean;
}

export const dissectProcessorSchema = processorBaseWithWhereSchema.extend({
  action: z.literal('dissect'),
  from: StreamlangSourceField,
  pattern: NonEmptyString,
  append_separator: z.optional(StreamlangSeparator),
  ignore_missing: z.optional(z.boolean()),
}) satisfies z.Schema<DissectProcessor>;

/**
 * Date processor
 */

export interface DateProcessor extends ProcessorBaseWithWhere {
  action: 'date';
  from: string;
  to?: string;
  formats: string[];
  output_format?: string;
  timezone?: string;
  locale?: string;
}

export const dateProcessorSchema = processorBaseWithWhereSchema.extend({
  action: z.literal('date'),
  from: StreamlangSourceField,
  to: z.optional(StreamlangTargetField),
  formats: z.array(NonEmptyString),
  output_format: z.optional(NonEmptyString),
  timezone: z.optional(NonEmptyString),
  locale: z.optional(NonEmptyString),
}) satisfies z.Schema<DateProcessor>;

/**
 * Rename processor
 */

export interface RenameProcessor extends ProcessorBaseWithWhere {
  action: 'rename';
  from: string;
  to: string;
  ignore_missing?: boolean;
  override?: boolean;
}

export const renameProcessorSchema = processorBaseWithWhereSchema.extend({
  action: z.literal('rename'),
  from: StreamlangSourceField,
  to: StreamlangTargetField,
  ignore_missing: z.optional(z.boolean()),
  override: z.optional(z.boolean()),
}) satisfies z.Schema<RenameProcessor>;

/**
 * Set processor
 */

export interface SetProcessor extends ProcessorBaseWithWhere {
  action: 'set';
  to: string;
  override?: boolean;
  // One of these must be provided, and this is enforced via the Zod schema refinement.
  // We can't use a union type as this means we can't use a discriminated union.
  value?: unknown; // Allow string, number, boolean, etc.
  copy_from?: string;
}

const setProcessorSchema = processorBaseWithWhereSchema
  .extend({
    action: z.literal('set'),
    to: StreamlangTargetField,
    override: z.optional(z.boolean()),
    value: z.optional(NoMustacheValue),
    copy_from: z.optional(StreamlangSourceField),
  })
  .refine((obj) => (obj.value && !obj.copy_from) || (!obj.value && obj.copy_from), {
    message: 'Set processor must have either value or copy_from, but not both.',
    path: ['value', 'copy_from'],
  }) satisfies z.Schema<SetProcessor>;

/**
 * Append processor
 */

export interface AppendProcessor extends ProcessorBaseWithWhere {
  action: 'append';
  to: string;
  value: unknown[];
  allow_duplicates?: boolean;
}

export const appendProcessorSchema = processorBaseWithWhereSchema.extend({
  action: z.literal('append'),
  to: StreamlangTargetField,
  value: NoMustacheArrayValues, // Rejects values like ["production", "{{{app}}}"]
  allow_duplicates: z.optional(z.boolean()),
}) satisfies z.Schema<AppendProcessor>;

/**
 * Convert processor
 */

export interface BaseConvertProcessor extends ProcessorBase {
  action: 'convert';
  from: string;
  type: ConvertType;
  ignore_missing?: boolean;
}

export type ConvertProcessor = BaseConvertProcessor &
  (
    | {
        to?: string;
      }
    | {
        to: string;
        where: Condition;
      }
  );

export const convertProcessorSchema = processorBaseWithWhereSchema
  .extend({
    action: z.literal('convert'),
    from: StreamlangSourceField,
    to: z.optional(StreamlangTargetField),
    type: z.enum(convertTypes),
    ignore_missing: z.optional(z.boolean()),
  })
  .refine((obj) => (obj.where && obj.to && obj.from !== obj.to) || !obj.where, {
    message:
      'Convert processor must have the "to" parameter when there is a "where" condition. It should not be the same as the source field.',
    path: ['to', 'where'],
  }) satisfies z.Schema<ConvertProcessor>;

/**
 * RemoveByPrefix processor
 */

export interface RemoveByPrefixProcessor extends ProcessorBase {
  action: 'remove_by_prefix';
  from: string;
}

export const removeByPrefixProcessorSchema = processorBaseSchema.extend({
  action: z.literal('remove_by_prefix'),
  from: StreamlangSourceField,
}) satisfies z.Schema<RemoveByPrefixProcessor>;

/**
 * Remove processor
 */

export interface RemoveProcessor extends ProcessorBaseWithWhere {
  action: 'remove';
  from: string;
  ignore_missing?: boolean;
}

export const removeProcessorSchema = processorBaseWithWhereSchema.extend({
  action: z.literal('remove'),
  from: StreamlangSourceField,
  ignore_missing: z.optional(z.boolean()),
}) satisfies z.Schema<RemoveProcessor>;

export type StreamlangProcessorDefinition =
  | DateProcessor
  | DissectProcessor
  | GrokProcessor
  | RenameProcessor
  | SetProcessor
  | AppendProcessor
  | ConvertProcessor
  | RemoveByPrefixProcessor
  | RemoveProcessor
  | ManualIngestPipelineProcessor;

export const streamlangProcessorSchema = z.union([
  grokProcessorSchema,
  dissectProcessorSchema,
  dateProcessorSchema,
  renameProcessorSchema,
  setProcessorSchema,
  appendProcessorSchema,
  removeByPrefixProcessorSchema,
  removeProcessorSchema,
  convertProcessorSchema,
  manualIngestPipelineProcessorSchema,
]);

export const isProcessWithOverrideOption = createIsNarrowSchema(
  processorBaseSchema,
  z.union([renameProcessorSchema, setProcessorSchema])
);

export const isProcessWithIgnoreMissingOption = createIsNarrowSchema(
  processorBaseSchema,
  z.union([
    renameProcessorSchema,
    grokProcessorSchema,
    dissectProcessorSchema,
    convertProcessorSchema,
  ])
);

export const isGrokProcessorDefinition = createIsNarrowSchema(
  streamlangProcessorSchema,
  grokProcessorSchema
);

export const isDissectProcessorDefinition = createIsNarrowSchema(
  streamlangProcessorSchema,
  dissectProcessorSchema
);

export const isDateProcessorDefinition = createIsNarrowSchema(
  streamlangProcessorSchema,
  dateProcessorSchema
);

/**
 * ProcessorType is the union of all possible 'action' values
 */
export type ProcessorType = StreamlangProcessorDefinition['action'];

/**
 * Get all processor types as a string array (derived from the Zod schema)
 */
export const processorTypes: ProcessorType[] = (
  streamlangProcessorSchema._def.options as Array<
    z.ZodObject<any, any, any, any, any> | z.ZodEffects<any, any, any>
  >
).map((schema) => {
  // Handle ZodEffects (from .refine()) by unwrapping to get the base schema
  const baseSchema = '_def' in schema && 'schema' in schema._def ? schema._def.schema : schema;
  return baseSchema.shape.action.value;
}) as ProcessorType[];

/**
 * Get the processor type (action) from a processor definition
 */
export function getProcessorType<TProcessorDefinition extends StreamlangProcessorDefinition>(
  processor: TProcessorDefinition
): ProcessorType {
  return processor.action;
}
