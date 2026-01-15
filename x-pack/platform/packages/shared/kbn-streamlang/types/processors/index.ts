/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { NonEmptyOrWhitespaceString, NonEmptyString } from '@kbn/zod-helpers';
import { createIsNarrowSchema } from '@kbn/zod-helpers';
import type { Condition } from '../conditions';
import { conditionSchema, isAlwaysCondition } from '../conditions';
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

export { NonEmptyString };

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

const processorBaseSchema = z
  .object({
    customIdentifier: z
      .optional(NonEmptyString)
      .describe('Custom identifier to correlate this processor across outputs'),
    description: z.optional(z.string()).describe('Human-readable notes about this processor step'),
    ignore_failure: z
      .optional(z.boolean())
      .describe('Continue pipeline execution if this processor fails'),
  })
  .describe('Base processor options shared by all processors') satisfies z.Schema<ProcessorBase>;

/**
 * Base with where
 */
export interface ProcessorBaseWithWhere extends ProcessorBase {
  where?: Condition;
}

export const processorBaseWithWhereSchema = processorBaseSchema
  .extend({
    where: z
      .optional(conditionSchema)
      .describe('Conditional expression controlling whether this processor runs'),
  })
  .describe(
    'Base processor options plus conditional execution'
  ) satisfies z.Schema<ProcessorBaseWithWhere>;

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

export const manualIngestPipelineProcessorSchema = processorBaseWithWhereSchema
  .extend({
    action: z
      .literal('manual_ingest_pipeline')
      .describe('Manual ingest pipeline - executes raw Elasticsearch ingest processors'),
    processors: z
      .array(z.record(z.enum(elasticsearchProcessorTypes), z.unknown()))
      .describe('List of raw Elasticsearch ingest processors to run'),
    tag: z.optional(z.string()).describe('Optional ingest processor tag for Elasticsearch'),
    on_failure: z
      .optional(z.array(z.record(z.unknown())))
      .describe('Fallback processors to run when a processor fails'),
  })
  .describe(
    'Manual ingest pipeline wrapper around native Elasticsearch processors'
  ) satisfies z.Schema<ManualIngestPipelineProcessor>;

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

export const grokProcessorSchema = processorBaseWithWhereSchema
  .extend({
    action: z.literal('grok'),
    from: StreamlangSourceField.describe('Source field to parse with grok patterns'),
    patterns: z
      .array(NonEmptyString)
      .nonempty()
      .describe('Grok patterns applied in order to extract fields'),
    pattern_definitions: z.optional(z.record(z.string())),
    ignore_missing: z
      .optional(z.boolean())
      .describe('Skip processing when source field is missing'),
  })
  .describe(
    'Grok processor - Extract fields from text using grok patterns'
  ) satisfies z.Schema<GrokProcessor>;

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

export const dissectProcessorSchema = processorBaseWithWhereSchema
  .extend({
    action: z.literal('dissect'),
    from: StreamlangSourceField.describe('Source field to parse with dissect pattern'),
    pattern: NonEmptyString.describe('Dissect pattern describing field boundaries'),
    append_separator: z
      .optional(StreamlangSeparator)
      .describe('Separator inserted when target fields are concatenated'),
    ignore_missing: z
      .optional(z.boolean())
      .describe('Skip processing when source field is missing'),
  })
  .describe(
    'Dissect processor - Extract fields from text using a lightweight, delimiter-based parser'
  ) satisfies z.Schema<DissectProcessor>;

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

export const dateProcessorSchema = processorBaseWithWhereSchema
  .extend({
    action: z.literal('date'),
    from: StreamlangSourceField.describe('Source field containing the date/time text'),
    to: z
      .optional(StreamlangTargetField)
      .describe('Target field for the parsed date (defaults to source)'),
    formats: z.array(NonEmptyString).describe('Accepted input date formats, tried in order'),
    output_format: z
      .optional(NonEmptyString)
      .describe('Optional output format for storing the parsed date as text'),
    timezone: z.optional(NonEmptyString).describe('Optional timezone for date parsing'),
    locale: z.optional(NonEmptyString).describe('Optional locale for date parsing'),
  })
  .describe(
    'Date processor - Parse dates from strings using one or more expected formats'
  ) satisfies z.Schema<DateProcessor>;

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

export const renameProcessorSchema = processorBaseWithWhereSchema
  .extend({
    action: z.literal('rename'),
    from: StreamlangSourceField.describe('Existing source field to rename or move'),
    to: StreamlangTargetField.describe('New field name or destination path'),
    ignore_missing: z.optional(z.boolean()).describe('Skip when source field is missing'),
    override: z
      .optional(z.boolean())
      .describe('Allow overwriting the target field if it already exists'),
  })
  .describe(
    'Rename processor - Change a field name and optionally its location'
  ) satisfies z.Schema<RenameProcessor>;

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
    to: StreamlangTargetField.describe('Target field to set or create'),
    override: z.optional(z.boolean()).describe('Allow overwriting an existing target field'),
    value: z.optional(NoMustacheValue).describe('Literal value to assign to the target field'),
    copy_from: z
      .optional(StreamlangSourceField)
      .describe('Copy value from another field instead of providing a literal'),
  })
  .refine((obj) => (obj.value && !obj.copy_from) || (!obj.value && obj.copy_from), {
    message: 'Set processor must have either value or copy_from, but not both.',
    path: ['value', 'copy_from'],
  })
  .describe(
    'Set processor - Assign a literal or copied value to a field (mutually exclusive inputs)'
  ) satisfies z.Schema<SetProcessor>;

/**
 * Append processor
 */

export interface AppendProcessor extends ProcessorBaseWithWhere {
  action: 'append';
  to: string;
  value: unknown[];
  allow_duplicates?: boolean;
}

export const appendProcessorSchema = processorBaseWithWhereSchema
  .extend({
    action: z.literal('append'),
    to: StreamlangTargetField.describe('Array field to append values to'),
    value: NoMustacheArrayValues.describe('Values to append (must be literal, no templates)'),
    allow_duplicates: z
      .optional(z.boolean())
      .describe('If true, do not deduplicate appended values'),
  })
  .describe(
    'Append processor - Append one or more values to an existing or new array field'
  ) satisfies z.Schema<AppendProcessor>;

/**
 * Convert processor
 */

export interface BaseConvertProcessor extends ProcessorBase {
  action: 'convert';
  from: string;
  type: ConvertType;
  ignore_missing?: boolean;
}

export interface ConvertProcessor extends BaseConvertProcessor {
  to?: string;
  where?: Condition;
}

export const convertProcessorSchema = processorBaseWithWhereSchema
  .extend({
    action: z.literal('convert'),
    from: StreamlangSourceField.describe('Source field to convert to a different data type'),
    to: z
      .optional(StreamlangTargetField)
      .describe('Target field for the converted value (defaults to source)'),
    type: z
      .enum(convertTypes)
      .describe('Target data type: integer, long, double, boolean, or string'),
    ignore_missing: z
      .optional(z.boolean())
      .describe('Skip processing when source field is missing'),
  })
  .refine(
    (obj) =>
      !obj.where ||
      (obj.where && isAlwaysCondition(obj.where)) ||
      (obj.where && obj.to && obj.from !== obj.to),
    {
      message:
        'Convert processor must have the "to" parameter when there is a "where" condition. It should not be the same as the source field.',
      path: ['to', 'where'],
    }
  )
  .describe(
    'Convert processor - Change the data type of a field value (integer, long, double, boolean, or string)'
  ) satisfies z.Schema<ConvertProcessor>;

/**
 * RemoveByPrefix processor
 */

export interface RemoveByPrefixProcessor extends ProcessorBase {
  action: 'remove_by_prefix';
  from: string;
}

export const removeByPrefixProcessorSchema = processorBaseSchema
  .extend({
    action: z.literal('remove_by_prefix'),
    from: StreamlangSourceField.describe('Field to remove along with all its nested fields'),
  })
  .describe(
    'Remove by prefix processor - Remove a field and all nested fields matching the prefix'
  ) satisfies z.Schema<RemoveByPrefixProcessor>;

/**
 * Remove processor
 */

export interface RemoveProcessor extends ProcessorBaseWithWhere {
  action: 'remove';
  from: string;
  ignore_missing?: boolean;
}

export const removeProcessorSchema = processorBaseWithWhereSchema
  .extend({
    action: z.literal('remove'),
    from: StreamlangSourceField.describe('Field to remove from the document'),
    ignore_missing: z
      .optional(z.boolean())
      .describe('Skip processing when source field is missing'),
  })
  .describe(
    'Remove processor - Delete one or more fields from the document'
  ) satisfies z.Schema<RemoveProcessor>;

/**
 * Drop processor
 */

export interface DropDocumentProcessor extends ProcessorBaseWithWhere {
  action: 'drop_document';
}

export const dropDocumentProcessorSchema = processorBaseWithWhereSchema
  .extend({
    action: z.literal('drop_document'),
  })
  .refine((schema) => schema.where !== undefined, {
    message: 'where clause is required in drop_document.',
  }) satisfies z.Schema<DropDocumentProcessor>;

/**
 * Replace processor
 */

export interface ReplaceProcessor extends ProcessorBaseWithWhere {
  action: 'replace';
  from: string;
  pattern: string;
  replacement: string;
  to?: string;
  ignore_missing?: boolean;
}

export const replaceProcessorSchema = processorBaseWithWhereSchema.extend({
  action: z.literal('replace'),
  from: StreamlangSourceField,
  pattern: NonEmptyOrWhitespaceString, // Allows space " " as valid pattern
  replacement: z.string(), // Required, should be '' for empty replacement
  to: z.optional(StreamlangTargetField),
  ignore_missing: z.optional(z.boolean()),
}) satisfies z.Schema<ReplaceProcessor>;

/**
 * Math processor
 */

export interface MathProcessor extends ProcessorBaseWithWhere {
  action: 'math';
  expression: string; // TinyMath expression, e.g., "attributes.price * attributes.quantity"
  to: string; // Target field for the result
  ignore_missing?: boolean; // If true, skip processing if any of the referenced fields in the expression is missing
}

export const mathProcessorSchema = processorBaseWithWhereSchema.extend({
  action: z.literal('math'),
  expression: NonEmptyString,
  to: StreamlangTargetField,
  ignore_missing: z.optional(z.boolean()),
}) satisfies z.Schema<MathProcessor>;

export interface UppercaseProcessor extends ProcessorBaseWithWhere {
  action: 'uppercase';
  from: string;
  to?: string;
  ignore_missing?: boolean;
}

export const uppercaseProcessorSchema = processorBaseWithWhereSchema.extend({
  action: z.literal('uppercase'),
  from: StreamlangSourceField,
  to: z.optional(StreamlangTargetField),
  ignore_missing: z.optional(z.boolean()),
}) satisfies z.Schema<UppercaseProcessor>;

export interface LowercaseProcessor extends ProcessorBaseWithWhere {
  action: 'lowercase';
  from: string;
  to?: string;
  ignore_missing?: boolean;
}

export const lowercaseProcessorSchema = processorBaseWithWhereSchema.extend({
  action: z.literal('lowercase'),
  from: StreamlangSourceField,
  to: z.optional(StreamlangTargetField),
  ignore_missing: z.optional(z.boolean()),
}) satisfies z.Schema<LowercaseProcessor>;

export interface TrimProcessor extends ProcessorBaseWithWhere {
  action: 'trim';
  from: string;
  to?: string;
  ignore_missing?: boolean;
}

export const trimProcessorSchema = processorBaseWithWhereSchema.extend({
  action: z.literal('trim'),
  from: StreamlangSourceField,
  to: z.optional(StreamlangTargetField),
  ignore_missing: z.optional(z.boolean()),
}) satisfies z.Schema<TrimProcessor>;

export interface JoinProcessor extends ProcessorBaseWithWhere {
  action: 'join';
  from: string[];
  delimiter: string;
  to: string;
  ignore_missing?: boolean;
}

export const joinProcessorSchema = processorBaseWithWhereSchema.extend({
  action: z.literal('join'),
  from: z.array(StreamlangSourceField),
  delimiter: z.string(),
  to: StreamlangTargetField,
  ignore_missing: z.optional(z.boolean()),
}) satisfies z.Schema<JoinProcessor>;

export type StreamlangProcessorDefinition =
  | DateProcessor
  | DissectProcessor
  | DropDocumentProcessor
  | GrokProcessor
  | MathProcessor
  | RenameProcessor
  | SetProcessor
  | AppendProcessor
  | ConvertProcessor
  | RemoveByPrefixProcessor
  | RemoveProcessor
  | ReplaceProcessor
  | UppercaseProcessor
  | LowercaseProcessor
  | TrimProcessor
  | JoinProcessor
  | ManualIngestPipelineProcessor;

export const streamlangProcessorSchema = z.union([
  grokProcessorSchema,
  dissectProcessorSchema,
  dateProcessorSchema,
  dropDocumentProcessorSchema,
  mathProcessorSchema,
  renameProcessorSchema,
  setProcessorSchema,
  appendProcessorSchema,
  removeByPrefixProcessorSchema,
  removeProcessorSchema,
  replaceProcessorSchema,
  uppercaseProcessorSchema,
  lowercaseProcessorSchema,
  trimProcessorSchema,
  joinProcessorSchema,
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
    replaceProcessorSchema,
    mathProcessorSchema,
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
    z.ZodObject<any, any, any, any, any> | z.ZodEffects<any, any, any> | z.ZodUnion<any>
  >
).map((schema) => {
  // Handle ZodEffects (from .refine()) by unwrapping to get the base schema
  let baseSchema = '_def' in schema && 'schema' in schema._def ? schema._def.schema : schema;

  // Handle ZodUnion (from z.union()) by getting the first option's action
  // All options in the union should have the same action value
  if ('_def' in baseSchema && 'options' in baseSchema._def) {
    baseSchema = baseSchema._def.options[0];
  }

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
