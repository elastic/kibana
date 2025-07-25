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
} from './ingest_pipeline_processors';
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
  field: string;
  patterns: string[];
  pattern_definitions?: Record<string, string>;
  ignore_missing?: boolean;
}

export const grokProcessorSchema = processorBaseWithWhereSchema.extend({
  action: z.literal('grok'),
  field: NonEmptyString,
  patterns: z.array(NonEmptyString).nonempty(),
  pattern_definitions: z.optional(z.record(z.string())),
  ignore_missing: z.optional(z.boolean()),
}) satisfies z.Schema<GrokProcessor>;

/**
 * Dissect processor
 */

export interface DissectProcessor extends ProcessorBaseWithWhere {
  action: 'dissect';
  field: string;
  pattern: string;
  append_separator?: string;
  ignore_missing?: boolean;
}

export const dissectProcessorSchema = processorBaseWithWhereSchema.extend({
  action: z.literal('dissect'),
  field: NonEmptyString,
  pattern: NonEmptyString,
  append_separator: z.optional(NonEmptyString),
  ignore_missing: z.optional(z.boolean()),
}) satisfies z.Schema<DissectProcessor>;

/**
 * Date processor
 */

export interface DateProcessor extends ProcessorBaseWithWhere {
  action: 'date';
  field: string;
  formats: string[];
  locale?: string;
  target_field?: string;
  timezone?: string;
  output_format?: string;
}

export const dateProcessorSchema = processorBaseWithWhereSchema.extend({
  action: z.literal('date'),
  field: NonEmptyString,
  formats: z.array(NonEmptyString),
  locale: z.optional(NonEmptyString),
  target_field: z.optional(NonEmptyString),
  timezone: z.optional(NonEmptyString),
  output_format: z.optional(NonEmptyString),
}) satisfies z.Schema<DateProcessor>;

/**
 * KV processor
 */

export interface KvProcessor extends ProcessorBaseWithWhere {
  action: 'kv';
  field: string;
  field_split: string;
  value_split: string;
  target_field?: string;
  include_keys?: string[];
  exclude_keys?: string[];
  ignore_missing?: boolean;
  prefix?: string;
  trim_key?: string;
  trim_value?: string;
  strip_brackets?: boolean;
}

export const kvProcessorSchema = processorBaseWithWhereSchema.extend({
  action: z.literal('kv'),
  field: NonEmptyString,
  // These aren't NonEmptyString on purpose as a space (for example) can be a valid use case here.
  field_split: z.string(),
  value_split: z.string(),
  target_field: z.optional(NonEmptyString),
  include_keys: z.optional(z.array(NonEmptyString)),
  exclude_keys: z.optional(z.array(NonEmptyString)),
  ignore_missing: z.optional(z.boolean()),
  prefix: z.optional(NonEmptyString),
  trim_key: z.optional(NonEmptyString),
  trim_value: z.optional(NonEmptyString),
  strip_brackets: z.optional(z.boolean()),
}) satisfies z.Schema<KvProcessor>;

/**
 * GeoIP processor
 */

export interface GeoIpProcessor {
  action: 'geoip';
  field: string;
  target_field?: string;
  database_file?: string;
  properties?: string[];
  ignore_missing?: boolean;
  first_only?: boolean;
}

export const geoIpProcessorSchema = z.object({
  action: z.literal('geoip'),
  field: NonEmptyString,
  target_field: z.optional(NonEmptyString),
  database_file: z.optional(NonEmptyString),
  properties: z.optional(z.array(NonEmptyString)),
  ignore_missing: z.optional(z.boolean()),
  first_only: z.optional(z.boolean()),
}) satisfies z.Schema<GeoIpProcessor>;

/**
 * Rename processor
 */

export interface RenameProcessor extends ProcessorBaseWithWhere {
  action: 'rename';
  field: string;
  target_field: string;
  ignore_missing?: boolean;
  override?: boolean;
}

export const renameProcessorSchema = processorBaseWithWhereSchema.extend({
  action: z.literal('rename'),
  field: NonEmptyString,
  target_field: NonEmptyString,
  ignore_missing: z.optional(z.boolean()),
  override: z.optional(z.boolean()),
}) satisfies z.Schema<RenameProcessor>;

/**
 * Set processor
 */

export interface SetProcessor extends ProcessorBaseWithWhere {
  action: 'set';
  field: string;
  value: string;
  override?: boolean;
  ignore_empty_value?: boolean;
  media_type?: string;
}

export const setProcessorSchema = processorBaseWithWhereSchema.extend({
  action: z.literal('set'),
  field: NonEmptyString,
  value: NonEmptyString,
  override: z.optional(z.boolean()),
  ignore_empty_value: z.optional(z.boolean()),
  media_type: z.optional(z.string()),
}) satisfies z.Schema<SetProcessor>;

/**
 * URL Decode processor
 */

export interface UrlDecodeProcessor extends ProcessorBaseWithWhere {
  action: 'urldecode';
  field: string;
  target_field?: string;
  ignore_missing?: boolean;
}

export const urlDecodeProcessorSchema = processorBaseWithWhereSchema.extend({
  action: z.literal('urldecode'),
  field: NonEmptyString,
  target_field: z.optional(NonEmptyString),
  ignore_missing: z.optional(z.boolean()),
}) satisfies z.Schema<UrlDecodeProcessor>;

/**
 * User agent processor
 */

export interface UserAgentProcessor {
  action: 'user_agent';
  field: string;
  target_field?: string;
  regex_file?: string;
  properties?: string[];
  ignore_missing?: boolean;
}

export const userAgentProcessorSchema = z.object({
  action: z.literal('user_agent'),
  field: NonEmptyString,
  target_field: z.optional(NonEmptyString),
  regex_file: z.optional(NonEmptyString),
  properties: z.optional(z.array(NonEmptyString)),
  ignore_missing: z.optional(z.boolean()),
}) satisfies z.Schema<UserAgentProcessor>;

export type StreamlangProcessorDefinition =
  | DateProcessor
  | DissectProcessor
  | GrokProcessor
  | KvProcessor
  | GeoIpProcessor
  | RenameProcessor
  | SetProcessor
  | ManualIngestPipelineProcessor
  | UrlDecodeProcessor
  | UserAgentProcessor;

export type ProcessorDefinitionWithId = StreamlangProcessorDefinition & { id: string };

export const streamlangProcessorSchema = z.discriminatedUnion('action', [
  grokProcessorSchema,
  dissectProcessorSchema,
  dateProcessorSchema,
  kvProcessorSchema,
  geoIpProcessorSchema,
  renameProcessorSchema,
  setProcessorSchema,
  manualIngestPipelineProcessorSchema,
  urlDecodeProcessorSchema,
  userAgentProcessorSchema,
]);

export const processorWithIdDefinitionSchema: z.ZodType<ProcessorDefinitionWithId> = z.union([
  dateProcessorSchema.merge(z.object({ id: z.string() })),
  dissectProcessorSchema.merge(z.object({ id: z.string() })),
  grokProcessorSchema.merge(z.object({ id: z.string() })),
  manualIngestPipelineProcessorSchema.merge(z.object({ id: z.string() })),
  kvProcessorSchema.merge(z.object({ id: z.string() })),
  geoIpProcessorSchema.merge(z.object({ id: z.string() })),
  renameProcessorSchema.merge(z.object({ id: z.string() })),
  setProcessorSchema.merge(z.object({ id: z.string() })),
  urlDecodeProcessorSchema.merge(z.object({ id: z.string() })),
  userAgentProcessorSchema.merge(z.object({ id: z.string() })),
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
