/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { NonEmptyString } from '@kbn/zod-helpers';
import {
  ElasticsearchProcessorType,
  elasticsearchProcessorTypes,
} from '../../../ingest_pipeline_processors';
import { Condition, conditionSchema } from '../../../conditions';
import { createIsNarrowSchema } from '../../../shared/type_guards';

/**
 * Base processor
 */
export interface ProcessorBase {
  description?: string;
  if?: Condition;
  ignore_failure?: boolean;
}

const processorBaseSchema = z.object({
  description: z.optional(z.string()),
  if: z.optional(conditionSchema),
  ignore_failure: z.optional(z.boolean()),
});

/* Manual ingest pipeline processor */

// Not 100% accurate, but close enough for our use case to provide minimal safety
// without having to check all details
export type ElasticsearchProcessor = Partial<Record<ElasticsearchProcessorType, unknown>>;

export interface ManualIngestPipelineProcessorConfig extends ProcessorBase {
  processors: ElasticsearchProcessor[];
  ignore_failure?: boolean;
  tag?: string;
  on_failure?: Array<Record<string, unknown>>;
}
export interface ManualIngestPipelineProcessorDefinition {
  manual_ingest_pipeline: ManualIngestPipelineProcessorConfig;
}

export const manualIngestPipelineProcessorDefinitionSchema = z.strictObject({
  manual_ingest_pipeline: z.intersection(
    processorBaseSchema,
    z.object({
      processors: z.array(z.record(z.enum(elasticsearchProcessorTypes), z.unknown())),
      tag: z.optional(z.string()),
      on_failure: z.optional(z.array(z.record(z.unknown()))),
    })
  ),
}) satisfies z.Schema<ManualIngestPipelineProcessorDefinition>;

/**
 * Grok processor
 */
export interface GrokProcessorConfig extends ProcessorBase {
  field: string;
  patterns: string[];
  pattern_definitions?: Record<string, string>;
  ignore_missing?: boolean;
}

export interface GrokProcessorDefinition {
  grok: GrokProcessorConfig;
}

export const grokProcessorDefinitionSchema = z.strictObject({
  grok: z.intersection(
    processorBaseSchema,
    z.object({
      field: NonEmptyString,
      patterns: z.array(NonEmptyString).nonempty(),
      pattern_definitions: z.optional(z.record(z.string())),
      ignore_missing: z.optional(z.boolean()),
    })
  ),
}) satisfies z.Schema<GrokProcessorDefinition>;

/**
 * Dissect processor
 */

export interface DissectProcessorConfig extends ProcessorBase {
  field: string;
  pattern: string;
  append_separator?: string;
  ignore_missing?: boolean;
}

export interface DissectProcessorDefinition {
  dissect: DissectProcessorConfig;
}

export const dissectProcessorDefinitionSchema = z.strictObject({
  dissect: z.intersection(
    processorBaseSchema,
    z.object({
      field: NonEmptyString,
      pattern: NonEmptyString,
      append_separator: z.optional(NonEmptyString),
      ignore_missing: z.optional(z.boolean()),
    })
  ),
}) satisfies z.Schema<DissectProcessorDefinition>;

/**
 * Date processor
 */

export interface DateProcessorConfig extends ProcessorBase {
  field: string;
  formats: string[];
  locale?: string;
  target_field?: string;
  timezone?: string;
  output_format?: string;
}

export interface DateProcessorDefinition {
  date: DateProcessorConfig;
}

export const dateProcessorDefinitionSchema = z.strictObject({
  date: z.intersection(
    processorBaseSchema,
    z.object({
      field: NonEmptyString,
      formats: z.array(NonEmptyString),
      locale: z.optional(NonEmptyString),
      target_field: z.optional(NonEmptyString),
      timezone: z.optional(NonEmptyString),
      output_format: z.optional(NonEmptyString),
    })
  ),
}) satisfies z.Schema<DateProcessorDefinition>;

/**
 * KV processor
 */

export interface KvProcessorConfig extends ProcessorBase {
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

export interface KvProcessorDefinition {
  kv: KvProcessorConfig;
}

export const kvProcessorDefinitionSchema = z.strictObject({
  kv: z.intersection(
    processorBaseSchema,
    z.object({
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
    })
  ),
}) satisfies z.Schema<KvProcessorDefinition>;

/**
 * GeoIP processor
 */

export interface GeoIpProcessorConfig {
  field: string;
  target_field?: string;
  database_file?: string;
  properties?: string[];
  ignore_missing?: boolean;
  first_only?: boolean;
}

export interface GeoIpProcessorDefinition {
  geoip: GeoIpProcessorConfig;
}

export const geoIpProcessorDefinitionSchema = z.strictObject({
  geoip: z.object({
    field: NonEmptyString,
    target_field: z.optional(NonEmptyString),
    database_file: z.optional(NonEmptyString),
    properties: z.optional(z.array(NonEmptyString)),
    ignore_missing: z.optional(z.boolean()),
    first_only: z.optional(z.boolean()),
  }),
}) satisfies z.Schema<GeoIpProcessorDefinition>;

/**
 * Rename processor
 */

export interface RenameProcessorConfig extends ProcessorBase {
  field: string;
  target_field: string;
  ignore_missing?: boolean;
  override?: boolean;
}

export interface RenameProcessorDefinition {
  rename: RenameProcessorConfig;
}

export const renameProcessorDefinitionSchema = z.strictObject({
  rename: z.intersection(
    processorBaseSchema,
    z.object({
      field: NonEmptyString,
      target_field: NonEmptyString,
      ignore_missing: z.optional(z.boolean()),
      override: z.optional(z.boolean()),
    })
  ),
}) satisfies z.Schema<RenameProcessorDefinition>;

/**
 * Set processor
 */

export interface SetProcessorConfig extends ProcessorBase {
  field: string;
  value: string;
  override?: boolean;
  ignore_empty_value?: boolean;
  media_type?: string;
}

export interface SetProcessorDefinition {
  set: SetProcessorConfig;
}

export const setProcessorDefinitionSchema = z.strictObject({
  set: z.intersection(
    processorBaseSchema,
    z.object({
      field: NonEmptyString,
      value: NonEmptyString,
      override: z.optional(z.boolean()),
      ignore_empty_value: z.optional(z.boolean()),
      media_type: z.optional(z.string()),
    })
  ),
}) satisfies z.Schema<SetProcessorDefinition>;

/**
 * URL Decode processor
 */

export interface UrlDecodeProcessorConfig extends ProcessorBase {
  field: string;
  target_field?: string;
  ignore_missing?: boolean;
}

export interface UrlDecodeProcessorDefinition {
  urldecode: UrlDecodeProcessorConfig;
}

export const urlDecodeProcessorDefinitionSchema = z.strictObject({
  urldecode: z.intersection(
    processorBaseSchema,
    z.object({
      field: NonEmptyString,
      target_field: z.optional(NonEmptyString),
      ignore_missing: z.optional(z.boolean()),
    })
  ),
}) satisfies z.Schema<UrlDecodeProcessorDefinition>;

/**
 * User agent processor
 */

export interface UserAgentProcessorConfig {
  field: string;
  target_field?: string;
  regex_file?: string;
  properties?: string[];
  ignore_missing?: boolean;
}

export interface UserAgentProcessorDefinition {
  user_agent: UserAgentProcessorConfig;
}

export const userAgentProcessorDefinitionSchema = z.strictObject({
  user_agent: z.object({
    field: NonEmptyString,
    target_field: z.optional(NonEmptyString),
    regex_file: z.optional(NonEmptyString),
    properties: z.optional(z.array(NonEmptyString)),
    ignore_missing: z.optional(z.boolean()),
  }),
}) satisfies z.Schema<UserAgentProcessorDefinition>;

export type ProcessorDefinition =
  | DateProcessorDefinition
  | DissectProcessorDefinition
  | GrokProcessorDefinition
  | KvProcessorDefinition
  | GeoIpProcessorDefinition
  | RenameProcessorDefinition
  | SetProcessorDefinition
  | ManualIngestPipelineProcessorDefinition
  | UrlDecodeProcessorDefinition
  | UserAgentProcessorDefinition;

export type ProcessorDefinitionWithId = ProcessorDefinition & { id: string };

type UnionKeysOf<T extends Record<string, any>> = T extends T ? keyof T : never;
type BodyOf<T extends Record<string, any>> = T extends T ? T[keyof T] : never;

export type ProcessorConfig = BodyOf<ProcessorDefinition>;

export type ProcessorType = UnionKeysOf<ProcessorDefinition>;

export type ProcessorTypeOf<TProcessorDefinition extends ProcessorDefinition> =
  UnionKeysOf<TProcessorDefinition> & ProcessorType;

export const processorDefinitionSchema: z.ZodType<ProcessorDefinition> = z.union([
  dateProcessorDefinitionSchema,
  dissectProcessorDefinitionSchema,
  grokProcessorDefinitionSchema,
  manualIngestPipelineProcessorDefinitionSchema,
  kvProcessorDefinitionSchema,
  geoIpProcessorDefinitionSchema,
  renameProcessorDefinitionSchema,
  setProcessorDefinitionSchema,
  urlDecodeProcessorDefinitionSchema,
  userAgentProcessorDefinitionSchema,
]);

export const processorWithIdDefinitionSchema: z.ZodType<ProcessorDefinitionWithId> = z.union([
  dateProcessorDefinitionSchema.merge(z.object({ id: z.string() })),
  dissectProcessorDefinitionSchema.merge(z.object({ id: z.string() })),
  grokProcessorDefinitionSchema.merge(z.object({ id: z.string() })),
  manualIngestPipelineProcessorDefinitionSchema.merge(z.object({ id: z.string() })),
  kvProcessorDefinitionSchema.merge(z.object({ id: z.string() })),
  geoIpProcessorDefinitionSchema.merge(z.object({ id: z.string() })),
  renameProcessorDefinitionSchema.merge(z.object({ id: z.string() })),
  setProcessorDefinitionSchema.merge(z.object({ id: z.string() })),
  urlDecodeProcessorDefinitionSchema.merge(z.object({ id: z.string() })),
  userAgentProcessorDefinitionSchema.merge(z.object({ id: z.string() })),
]);

export const isGrokProcessorDefinition = createIsNarrowSchema(
  processorDefinitionSchema,
  grokProcessorDefinitionSchema
);

export const isDissectProcessorDefinition = createIsNarrowSchema(
  processorDefinitionSchema,
  dissectProcessorDefinitionSchema
);

export const isDateProcessorDefinition = createIsNarrowSchema(
  processorDefinitionSchema,
  dateProcessorDefinitionSchema
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

  return processor[type as keyof TProcessorDefinition] as ProcessorConfig;
}
