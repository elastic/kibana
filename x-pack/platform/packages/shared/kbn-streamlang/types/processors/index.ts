/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';
import { createIsNarrowSchema } from '@kbn/streams-schema';
import {
  ElasticsearchProcessorType,
  elasticsearchProcessorTypes,
} from './manual_ingest_pipeline_processors';
import { Condition, conditionSchema } from '../conditions';

/**
 * Base processor
 */
export interface ProcessorBase {
  description?: string;
  ignore_failure?: boolean;
}

const processorBaseSchema = z.object({
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
  ignore_missing?: boolean;
}

export const grokProcessorSchema = processorBaseWithWhereSchema.extend({
  action: z.literal('grok'),
  from: NonEmptyString,
  patterns: z.array(NonEmptyString).nonempty(),
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
  from: NonEmptyString,
  pattern: NonEmptyString,
  append_separator: z.optional(NonEmptyString),
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
}

export const dateProcessorSchema = processorBaseWithWhereSchema.extend({
  action: z.literal('date'),
  from: NonEmptyString,
  to: z.optional(NonEmptyString),
  formats: z.array(NonEmptyString),
  output_format: z.optional(NonEmptyString),
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
  from: NonEmptyString,
  to: NonEmptyString,
  ignore_missing: z.optional(z.boolean()),
  override: z.optional(z.boolean()),
}) satisfies z.Schema<RenameProcessor>;

/**
 * Set processor
 */

export interface SetProcessor extends ProcessorBaseWithWhere {
  action: 'set';
  to: string;
  value: string;
  override?: boolean;
}

export const setProcessorSchema = processorBaseWithWhereSchema.extend({
  action: z.literal('set'),
  to: NonEmptyString,
  value: NonEmptyString,
  override: z.optional(z.boolean()),
}) satisfies z.Schema<SetProcessor>;

/**
 * Append processor
 */

export interface AppendProcessor extends ProcessorBaseWithWhere {
  action: 'append';
  to: string;
  // Value is actually required, but due to 'any' values being allowed here we need to mark this as optional
  // to "satisfy" the Zod schema.
  value?: any | any[];
  allow_duplicates?: boolean;
}

export const appendProcessorSchema = processorBaseWithWhereSchema.extend({
  action: z.literal('append'),
  to: NonEmptyString,
  value: z.union([z.any(), z.array(z.any())]),
  allow_duplicates: z.optional(z.boolean()),
}) satisfies z.Schema<AppendProcessor>;

export type StreamlangProcessorDefinition =
  | DateProcessor
  | DissectProcessor
  | GrokProcessor
  | RenameProcessor
  | SetProcessor
  | AppendProcessor
  | ManualIngestPipelineProcessor;

export type ProcessorDefinitionWithId = StreamlangProcessorDefinition & { id: string };

export const streamlangProcessorSchema = z.discriminatedUnion('action', [
  grokProcessorSchema,
  dissectProcessorSchema,
  dateProcessorSchema,
  renameProcessorSchema,
  setProcessorSchema,
  manualIngestPipelineProcessorSchema,
]);

export const processorWithIdDefinitionSchema: z.ZodType<ProcessorDefinitionWithId> = z.union([
  dateProcessorSchema.merge(z.object({ id: z.string() })),
  dissectProcessorSchema.merge(z.object({ id: z.string() })),
  grokProcessorSchema.merge(z.object({ id: z.string() })),
  manualIngestPipelineProcessorSchema.merge(z.object({ id: z.string() })),
  renameProcessorSchema.merge(z.object({ id: z.string() })),
  setProcessorSchema.merge(z.object({ id: z.string() })),
]);

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
  streamlangProcessorSchema._def.options as Array<z.ZodObject<any, any, any, any, any>>
).map((schema) => schema.shape.action.value) as ProcessorType[];

/**
 * Get the processor type (action) from a processor definition
 */
export function getProcessorType<TProcessorDefinition extends StreamlangProcessorDefinition>(
  processor: TProcessorDefinition
): ProcessorType {
  return processor.action;
}
