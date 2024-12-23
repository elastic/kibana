/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

const stringOrNumberOrBoolean = z.union([z.string(), z.number(), z.boolean()]);

export const binaryConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['eq', 'neq', 'lt', 'lte', 'gt', 'gte', 'contains', 'startsWith', 'endsWith']),
  value: stringOrNumberOrBoolean,
});

export const unaryFilterConditionSchema = z.object({
  field: z.string(),
  operator: z.enum(['exists', 'notExists']),
});

export const filterConditionSchema = z.discriminatedUnion('operator', [
  unaryFilterConditionSchema,
  binaryConditionSchema,
]);

export type FilterCondition = z.infer<typeof filterConditionSchema>;
export type BinaryFilterCondition = z.infer<typeof binaryConditionSchema>;
export type UnaryFilterCondition = z.infer<typeof unaryFilterConditionSchema>;

export interface AndCondition {
  and: Condition[];
}

export interface OrCondition {
  or: Condition[];
}

export type Condition = FilterCondition | AndCondition | OrCondition | undefined;

export const conditionSchema: z.ZodType<Condition> = z.lazy(() =>
  z.union([
    filterConditionSchema,
    z.object({ and: z.array(conditionSchema) }),
    z.object({ or: z.array(conditionSchema) }),
  ])
);

export const grokProcessingDefinitionSchema = z.object({
  grok: z.object({
    field: z.string(),
    patterns: z.array(z.string()),
    pattern_definitions: z.optional(z.record(z.string())),
  }),
});

export type GrokProcessingDefinition = z.infer<typeof grokProcessingDefinitionSchema>;

export const dissectProcessingDefinitionSchema = z.object({
  dissect: z.object({
    field: z.string(),
    pattern: z.string(),
  }),
});

export type DissectProcssingDefinition = z.infer<typeof dissectProcessingDefinitionSchema>;

export const processingConfigSchema = z.union([
  grokProcessingDefinitionSchema,
  dissectProcessingDefinitionSchema,
]);

export const processingDefinitionSchema = z.object({
  condition: z.optional(conditionSchema),
  config: processingConfigSchema,
});

export type ProcessingDefinition = z.infer<typeof processingDefinitionSchema>;

export const fieldDefinitionConfigSchema = z.object({
  type: z.enum(['keyword', 'match_only_text', 'long', 'double', 'date', 'boolean', 'ip']),
  format: z.optional(z.string()),
});

export type FieldDefinitionConfig = z.infer<typeof fieldDefinitionConfigSchema>;

export const fieldDefinitionSchema = z.record(z.string(), fieldDefinitionConfigSchema);

export type FieldDefinition = z.infer<typeof fieldDefinitionSchema>;

export const inheritedFieldDefinitionSchema = z.record(
  z.string(),
  fieldDefinitionConfigSchema.extend({ from: z.string() })
);

export type InheritedFieldDefinition = z.infer<typeof inheritedFieldDefinitionSchema>;

export const fieldDefinitionConfigWithNameSchema = fieldDefinitionConfigSchema.extend({
  name: z.string(),
});

export type FieldDefinitionConfigWithName = z.infer<typeof fieldDefinitionConfigWithNameSchema>;

export const streamChildSchema = z.object({
  name: z.string(),
  condition: z.optional(conditionSchema),
});
export type StreamChild = z.infer<typeof streamChildSchema>;

export const elasticsearchAssetSchema = z.array(
  z.object({
    type: z.enum(['ingest_pipeline', 'component_template', 'index_template', 'data_stream']),
    id: z.string(),
  })
);

export type ElasticsearchAsset = z.infer<typeof elasticsearchAssetSchema>;
