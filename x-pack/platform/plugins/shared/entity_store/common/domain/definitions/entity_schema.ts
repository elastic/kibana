/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { conditionSchema as streamlangConditionSchema } from '@kbn/streamlang';
import { z } from '@kbn/zod/v4';

/**
 * The 11 production entity types. Used by tests and helpers that need to install/assert
 * only the real engines — not the synthetic performance-test definitions.
 */
export const BASE_ENTITY_TYPES = [
  'user',
  'host',
  'service',
  'generic',
  'k8s.pod',
  'k8s.container',
  'k8s.deployment',
  'k8s.replicaset',
  'k8s.namespace',
  'k8s.node',
  'k8s.daemonset',
] as const;

export type EntityType = z.infer<typeof EntityType>;
export const EntityType = z.enum([
  ...BASE_ENTITY_TYPES,
  // Synthetic entity types used for performance / scale testing only.
  // Not installed by default — pass them explicitly to the install API.
  'perf.entity.001',
  'perf.entity.002',
  'perf.entity.003',
  'perf.entity.004',
  'perf.entity.005',
  'perf.entity.006',
  'perf.entity.007',
  'perf.entity.008',
  'perf.entity.009',
  'perf.entity.010',
  'perf.entity.011',
  'perf.entity.012',
  'perf.entity.013',
  'perf.entity.014',
  'perf.entity.015',
  'perf.entity.016',
  'perf.entity.017',
  'perf.entity.018',
  'perf.entity.019',
  'perf.entity.020',
  'perf.entity.021',
  'perf.entity.022',
  'perf.entity.023',
  'perf.entity.024',
  'perf.entity.025',
  'perf.entity.026',
  'perf.entity.027',
  'perf.entity.028',
  'perf.entity.029',
  'perf.entity.030',
  'perf.entity.031',
  'perf.entity.032',
  'perf.entity.033',
  'perf.entity.034',
  'perf.entity.035',
  'perf.entity.036',
  'perf.entity.037',
  'perf.entity.038',
  'perf.entity.039',
  'perf.entity.040',
  'perf.entity.041',
  'perf.entity.042',
  'perf.entity.043',
  'perf.entity.044',
  'perf.entity.045',
  'perf.entity.046',
  'perf.entity.047',
  'perf.entity.048',
  'perf.entity.049',
  'perf.entity.050',
  'perf.entity.051',
  'perf.entity.052',
  'perf.entity.053',
  'perf.entity.054',
  'perf.entity.055',
  'perf.entity.056',
  'perf.entity.057',
  'perf.entity.058',
  'perf.entity.059',
  'perf.entity.060',
  'perf.entity.061',
  'perf.entity.062',
  'perf.entity.063',
  'perf.entity.064',
  'perf.entity.065',
  'perf.entity.066',
  'perf.entity.067',
  'perf.entity.068',
  'perf.entity.069',
  'perf.entity.070',
  'perf.entity.071',
  'perf.entity.072',
  'perf.entity.073',
  'perf.entity.074',
  'perf.entity.075',
  'perf.entity.076',
  'perf.entity.077',
  'perf.entity.078',
  'perf.entity.079',
  'perf.entity.080',
  'perf.entity.081',
  'perf.entity.082',
  'perf.entity.083',
  'perf.entity.084',
  'perf.entity.085',
  'perf.entity.086',
  'perf.entity.087',
  'perf.entity.088',
  'perf.entity.089',
] as const);

export const ALL_ENTITY_TYPES = Object.values(EntityType.enum);

const mappingSchema = z.any();

const retentionOperationSchema = z.discriminatedUnion('operation', [
  z.object({ operation: z.literal('collect_values') }),
  z.object({ operation: z.literal('prefer_newest_value') }),
  z.object({ operation: z.literal('prefer_oldest_value') }),
  z.object({ operation: z.literal('managed') }),
]);

const fieldSchema = z.object({
  allowAPIUpdate: z.optional(z.boolean()),
  destination: z.string(),
  mapping: z.optional(mappingSchema),
  retention: retentionOperationSchema,
  source: z.string(),
});

const euidFieldSchema = z.object({
  field: z.string(),
});

const euidSeparatorSchema = z.object({
  sep: z.string(),
});

// DoS guard: cap every user-supplied string in the whenClause schema before it reaches Painless/ESQL generation.
const MAX_FIELD_EVALUATION_STRING_LENGTH = 1000;

// Field evaluation: pre-evaluate a field before euid generation (first match wins; fallback to source value or fallbackValue).
const fieldEvaluationWhenClauseSourceMatchSchema = z.object({
  sourceMatchesAny: z.array(z.string()),
  then: z.string(),
});
const fieldEvaluationWhenClauseFieldMappingThenSchema = z.object({
  field: z.string().max(MAX_FIELD_EVALUATION_STRING_LENGTH),
  mapping: z.record(
    z.string().max(MAX_FIELD_EVALUATION_STRING_LENGTH),
    z.string().max(MAX_FIELD_EVALUATION_STRING_LENGTH)
  ),
});

const fieldEvaluationWhenClauseConditionSchema = z.object({
  condition: streamlangConditionSchema,
  then: z.union([
    z.string().max(MAX_FIELD_EVALUATION_STRING_LENGTH),
    fieldEvaluationWhenClauseFieldMappingThenSchema,
  ]),
});
const fieldEvaluationWhenClauseSchema = z.union([
  fieldEvaluationWhenClauseSourceMatchSchema,
  fieldEvaluationWhenClauseConditionSchema,
]);

const fieldEvaluationSourceSchema = z.union([
  z.object({ field: z.string() }),
  z.object({ firstChunkOfField: z.string(), splitBy: z.string() }),
]);

const fieldEvaluationSchema = z.object({
  destination: z.string(),
  sources: z.array(fieldEvaluationSourceSchema),
  fallbackValue: z.string().nullable(),
  whenClauses: z.array(fieldEvaluationWhenClauseSchema),
});

const euidCompositionSchema = z
  .array(z.union([euidFieldSchema, euidSeparatorSchema]))
  .min(1)
  .refine((parts) => parts.some((part) => 'field' in part), {
    message: 'Each EUID composition must contain at least one field part',
  });

const euidRankingBranchSchema = z.object({
  when: streamlangConditionSchema.optional(),
  ranking: z.array(euidCompositionSchema).min(1),
});

export const euidRankingSchema = z.object({
  branches: z.array(euidRankingBranchSchema).min(1),
});

// Any field used in the euid calculation must be mapped in the fields array,
// otherwise we won't have guarantees of field being available
const calculatedIdentityFieldLogicSchema = z.object({
  // Ranking mechanism for EUID: branches evaluated in order; first matching branch wins.
  // Branch with no `when` always matches (fallback). Used by ESQL, Painless, Memory, DSL.
  euidRanking: euidRankingSchema,

  // Optional pre-evaluated fields (e.g. entity.namespace from event.module). Applied before
  // euid generation and translated to ESQL, Painless, and in-memory.
  fieldEvaluations: z.optional(z.array(fieldEvaluationSchema)),

  // Document-level filter (Condition from @kbn/streamlang). Only documents matching this
  // filter are considered for this entity type. Must express "at least one identity field
  // present" (and any entity-specific rules, e.g. user IDP pre-conditions). Translated to
  // DSL and ESQL via conditionToQueryDsl and conditionToESQL.
  documentsFilter: streamlangConditionSchema,

  // When true, the entity id is not prefixed with the entity type (e.g. output "a" instead of "generic:a").
  skipTypePrepend: z.optional(z.boolean()),
});

/**
 * Single-field identity: entity is identified by one field only (e.g. service.name, entity.id).
 * No composition, no field evaluations. ESQL/DSL use a simplified path for this shape.
 */
export const singleFieldIdentitySchema = z.object({
  singleField: z.string(),
  // When true, the entity id is not prefixed with the entity type (e.g. output "a" instead of "generic:a").
  skipTypePrepend: z.optional(z.boolean()),
});

const identityFieldSchema = z.union([
  calculatedIdentityFieldLogicSchema,
  singleFieldIdentitySchema,
]);

// Field value: literal string, single source reference, or composition (CONCAT of fields).
const fieldValueSchema = z.union([
  z.string(),
  z.object({ source: z.string() }),
  z.object({
    composition: z.object({
      fields: z.array(z.string()).min(1),
      sep: z.string(),
    }),
  }),
]);
export type FieldValueSchema = z.infer<typeof fieldValueSchema>;

// Schema for "when condition true set fields" (condition + field overrides). Used e.g. for pre-agg overrides.
export const setFieldsByConditionSchema = z.object({
  condition: streamlangConditionSchema,
  fields: z.record(z.string(), fieldValueSchema).refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field override is required',
  }),
});
export type SetFieldsByCondition = z.infer<typeof setFieldsByConditionSchema>;

// Definition-owned reasons stay separate so a rule can only report a reason it owns.
export const creationRejectionReasonSchema = z.enum([
  'user_not_local_namespace',
  'host_missing_host_id',
]);
export type CreationRejectionReason = z.infer<typeof creationRejectionReasonSchema>;

/** Conditional rules require both `requires` and `rejectionReason`; `{}` opts in unconditionally. */
const creatableFromSingleDocumentSchema = z.union([
  z.strictObject({
    requires: streamlangConditionSchema,
    rejectionReason: creationRejectionReasonSchema,
  }),
  z.strictObject({}),
]);
export type CreatableFromSingleDocument = z.infer<typeof creatableFromSingleDocumentSchema>;

export const entitySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: EntityType,
  filter: z.string().optional(),
  entityTypeFallback: z.string().optional(),
  fields: z.array(fieldSchema),
  // Optional evaluated fields applied before pre-agg overrides and STATS for all entity types.
  fieldEvaluations: z.optional(z.array(fieldEvaluationSchema)),
  identityField: identityFieldSchema,
  indexPatterns: z.array(z.string()),
  // Optional filter (Condition from @kbn/streamlang) applied in ESQL only, right after the
  // LOOKUP JOIN, to filter rows (e.g. keep already-stored entities or IDP-like events). No DSL equivalent.
  postAggFilter: z.optional(streamlangConditionSchema),
  // Optional: when conditions are true on source docs, set the given fields (EVAL after field evals, before STATS).
  whenConditionTrueSetFieldsPreAgg: z.optional(z.array(setFieldsByConditionSchema)),
  // Post-STATS EVAL in logs ESQL (recent.* vs plain). Single-doc paths re-apply entries after pre-agg for parity.
  whenConditionTrueSetFieldsAfterStats: z.optional(z.array(setFieldsByConditionSchema)),
  // Omission disables single-document creation for the entity type.
  creatableFromSingleDocument: z.optional(creatableFromSingleDocumentSchema),
});

export type EntityField = z.infer<typeof fieldSchema>; // entities fields
export type CalculatedEntityIdentity = z.infer<typeof calculatedIdentityFieldLogicSchema>; // full identity (euidRanking + documentsFilter + optional fieldEvaluations)
export type SingleFieldIdentity = z.infer<typeof singleFieldIdentitySchema>;
export type EntityIdentity = z.infer<typeof identityFieldSchema>; // definition-time identity (full or singleField)
export type EntityDefinition = z.infer<typeof entitySchema>; // entity with id generated in runtime
export type EntityDefinitionWithoutId = Omit<EntityDefinition, 'id'>;
export type ManagedEntityDefinition = EntityDefinition & { type: EntityType }; // entity with a known 'type'
export type EuidField = z.infer<typeof euidFieldSchema>;
export type EuidSeparator = z.infer<typeof euidSeparatorSchema>;
export type EuidAttribute = EuidField | EuidSeparator;
export type EuidRankingBranch = z.infer<typeof euidRankingBranchSchema>;
export type EuidRanking = z.infer<typeof euidRankingSchema>;
export type FieldEvaluationWhenClause = z.infer<typeof fieldEvaluationWhenClauseSchema>;
export type FieldEvaluationWhenClauseFieldMappingThen = z.infer<
  typeof fieldEvaluationWhenClauseFieldMappingThenSchema
>;
export type FieldEvaluationSource = z.infer<typeof fieldEvaluationSourceSchema>;
export type FieldEvaluation = z.infer<typeof fieldEvaluationSchema>;

export function isSingleFieldIdentity(identity: EntityIdentity): identity is SingleFieldIdentity {
  return 'singleField' in identity;
}
