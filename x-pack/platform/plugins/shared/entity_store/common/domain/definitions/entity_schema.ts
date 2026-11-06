/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Condition } from '@kbn/streamlang';
import { conditionSchema as streamlangConditionSchema } from '@kbn/streamlang';
import { z, lazySchema } from '@kbn/zod/v4';
import { assertDynamicDefinitionRules, dynamicBlockSchema } from './dynamic';

export { dynamicBlockSchema };
export type { DynamicBlock } from './dynamic';

export type EntityType = z.infer<typeof EntityType>;
export const EntityType = lazySchema(() => z.enum(['user', 'host', 'service', 'generic']));

export const ALL_ENTITY_TYPES = Object.values(EntityType.enum);

/** Registry type name. Wider than the closed `EntityType`, which only covers the built-ins. */
export type EntityDefinitionType = string;

/**
 * Registry type names: lowercase alphanumeric segments separated by `.`, `_` or `-`, starting with
 * a letter. Separators cannot lead, trail or repeat. Examples: `host`, `k8s.pod`, `aws_s3-bucket`.
 * Length is capped separately by `ENTITY_DEFINITION_TYPE_MAX_LENGTH`.
 */
export const ENTITY_DEFINITION_TYPE_PATTERN = /^[a-z][a-z0-9]*(?:[._-][a-z0-9]+)*$/;
export const ENTITY_DEFINITION_TYPE_MAX_LENGTH = 64;

/** Returns why `type` is not a valid entity definition type name, or `undefined` when it is valid. */
export const validateEntityDefinitionType = (type: string): string | undefined => {
  if (type.length > ENTITY_DEFINITION_TYPE_MAX_LENGTH) {
    return `type name exceeds the maximum length of ${ENTITY_DEFINITION_TYPE_MAX_LENGTH}`;
  }
  if (!ENTITY_DEFINITION_TYPE_PATTERN.test(type)) {
    return `type name does not match pattern ${ENTITY_DEFINITION_TYPE_PATTERN}`;
  }
  return undefined;
};

/** Which extraction process a task is running as. */
export type ExtractionMode = z.infer<typeof ExtractionMode>;
export const ExtractionMode = lazySchema(() => z.enum(['single', 'priority', 'nonPriority']));
/** Named access to the modes. Use this rather than the string literals, which live only above. */
export const EXTRACTION_MODE = ExtractionMode.enum;

// DoS guards for the extraction block, which will also accept HTTP input.
const MAX_FIELD_NAME_LENGTH = 1024;
const MAX_FIELDS = 2000; // matches the latest index `total_fields.limit`
const MAX_SET_FIELDS_RULES = 64;
const MAX_SET_FIELDS_PER_RULE = 64;
const MAX_COMPOSITION_FIELDS = 32;
const MAX_LITERAL_LENGTH = 1000;
const MAX_ENTITY_TYPE_FALLBACK_LENGTH = 256;
const MAX_DEFINITION_ID_LENGTH = 512;
const MAX_DEFINITION_NAME_LENGTH = 256;
const MAX_DEFINITION_DESCRIPTION_LENGTH = 1024;

const entityDefinitionTypeSchema = lazySchema(() =>
  z.string().superRefine((type, ctx) => {
    const reason = validateEntityDefinitionType(type);
    if (reason) {
      ctx.addIssue({ code: 'custom', message: reason });
    }
  })
);

const mappingSchema = lazySchema(() => z.any());

const retentionOperationSchema = lazySchema(() =>
  z.discriminatedUnion('operation', [
    z.object({ operation: z.literal('collect_values') }),
    z.object({ operation: z.literal('prefer_newest_value') }),
    z.object({ operation: z.literal('prefer_oldest_value') }),
    z.object({ operation: z.literal('managed') }),
  ])
);

const fieldNameSchema = lazySchema(() => z.string().min(1).max(MAX_FIELD_NAME_LENGTH));

const fieldSchema = lazySchema(() =>
  z.object({
    allowAPIUpdate: z.optional(z.boolean()),
    destination: fieldNameSchema,
    mapping: z.optional(mappingSchema),
    retention: retentionOperationSchema,
    source: fieldNameSchema,
  })
);

const euidFieldSchema = lazySchema(() =>
  z.object({
    field: z.string(),
  })
);

const euidSeparatorSchema = lazySchema(() =>
  z.object({
    sep: z.string(),
  })
);

// DoS guard: cap every user-supplied string in the whenClause schema before it reaches Painless/ESQL generation.
const MAX_FIELD_EVALUATION_STRING_LENGTH = 1000;

// Field evaluation: pre-evaluate a field before euid generation (first match wins; fallback to source value or fallbackValue).
const fieldEvaluationWhenClauseSourceMatchSchema = lazySchema(() =>
  z.object({
    sourceMatchesAny: z.array(z.string()),
    then: z.string(),
  })
);
const fieldEvaluationWhenClauseFieldMappingThenSchema = lazySchema(() =>
  z.object({
    field: z.string().max(MAX_FIELD_EVALUATION_STRING_LENGTH),
    mapping: z.record(
      z.string().max(MAX_FIELD_EVALUATION_STRING_LENGTH),
      z.string().max(MAX_FIELD_EVALUATION_STRING_LENGTH)
    ),
  })
);

const fieldEvaluationWhenClauseConditionSchema = lazySchema(() =>
  z.object({
    condition: streamlangConditionSchema,
    then: z.union([
      z.string().max(MAX_FIELD_EVALUATION_STRING_LENGTH),
      fieldEvaluationWhenClauseFieldMappingThenSchema,
    ]),
  })
);
const fieldEvaluationWhenClauseSchema = lazySchema(() =>
  z.union([fieldEvaluationWhenClauseSourceMatchSchema, fieldEvaluationWhenClauseConditionSchema])
);

const fieldEvaluationSourceSchema = lazySchema(() =>
  z.union([
    z.object({ field: z.string() }),
    z.object({ firstChunkOfField: z.string(), splitBy: z.string() }),
  ])
);

const fieldEvaluationSchema = lazySchema(() =>
  z.object({
    destination: z.string(),
    sources: z.array(fieldEvaluationSourceSchema),
    fallbackValue: z.string().nullable(),
    whenClauses: z.array(fieldEvaluationWhenClauseSchema),
  })
);

const euidCompositionSchema = lazySchema(() =>
  z
    .array(z.union([euidFieldSchema, euidSeparatorSchema]))
    .min(1)
    .refine((parts) => parts.some((part) => 'field' in part), {
      message: 'Each EUID composition must contain at least one field part',
    })
);

const euidRankingBranchSchema = lazySchema(() =>
  z.object({
    when: streamlangConditionSchema.optional(),
    ranking: z.array(euidCompositionSchema).min(1),
  })
);

export const euidRankingSchema = lazySchema(() =>
  z.object({
    branches: z.array(euidRankingBranchSchema).min(1),
  })
);

// Any field used in the euid calculation must be mapped in the fields array,
// otherwise we won't have guarantees of field being available.
//
// Both identity variants are strict. Consumers hold the definition object as registered, not the
// parsed copy, and tell the variants apart by key presence (`isSingleFieldIdentity`). A plain
// object would let a calculated identity absorb a stray `singleField` by stripping it, so the
// ranking is what gets validated while the stored object still carries the unvalidated single
// field. Strictness makes an identity with keys of both variants fail every variant.
const calculatedIdentityFieldLogicSchema = lazySchema(() =>
  z.strictObject({
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
  })
);

/**
 * Single-field identity: entity is identified by one field only (e.g. service.name, entity.id).
 * No composition, no field evaluations. ESQL/DSL use a simplified path for this shape.
 * Strict for the same reason as the calculated variant above.
 */
export const singleFieldIdentitySchema = lazySchema(() =>
  z.strictObject({
    singleField: z.string(),
    // When true, the entity id is not prefixed with the entity type (e.g. output "a" instead of "generic:a").
    skipTypePrepend: z.optional(z.boolean()),
  })
);

const identityFieldSchema = lazySchema(() =>
  z.union([calculatedIdentityFieldLogicSchema, singleFieldIdentitySchema])
);

// Field value: literal string, single source reference, or composition (CONCAT of fields).
const fieldValueSchema = lazySchema(() =>
  z.union([
    z.string().max(MAX_LITERAL_LENGTH),
    z.object({ source: fieldNameSchema }),
    z.object({
      composition: z.object({
        fields: z.array(fieldNameSchema).min(1).max(MAX_COMPOSITION_FIELDS),
        sep: z.string().max(MAX_LITERAL_LENGTH),
      }),
    }),
  ])
);
export type FieldValueSchema = z.infer<typeof fieldValueSchema>;

// Schema for "when condition true set fields" (condition + field overrides). Used e.g. for pre-agg overrides.
export const setFieldsByConditionSchema = lazySchema(() =>
  z.object({
    condition: streamlangConditionSchema,
    fields: z
      .record(fieldNameSchema, fieldValueSchema)
      .refine((value) => Object.keys(value).length > 0, {
        message: 'At least one field override is required',
      })
      .refine((value) => Object.keys(value).length <= MAX_SET_FIELDS_PER_RULE, {
        message: `At most ${MAX_SET_FIELDS_PER_RULE} field overrides are allowed`,
      }),
  })
);
export type SetFieldsByCondition = z.infer<typeof setFieldsByConditionSchema>;

const setFieldsByConditionListSchema = lazySchema(() =>
  z.array(setFieldsByConditionSchema).max(MAX_SET_FIELDS_RULES)
);

// Definition-owned reasons stay separate so a rule can only report a reason it owns.
export const creationRejectionReasonSchema = lazySchema(() =>
  z.enum(['user_not_local_namespace', 'host_missing_host_id'])
);
export type CreationRejectionReason = z.infer<typeof creationRejectionReasonSchema>;

/** Conditional rules require both `requires` and `rejectionReason`; `{}` opts in unconditionally. */
const creatableFromSingleDocumentSchema = lazySchema(() =>
  z.union([
    z.strictObject({
      requires: streamlangConditionSchema,
      rejectionReason: creationRejectionReasonSchema,
    }),
    z.strictObject({}),
  ])
);
export type CreatableFromSingleDocument = z.infer<typeof creatableFromSingleDocumentSchema>;

const MAX_MANAGED_BY_STRING_LENGTH = 256;

/**
 * Who manages a definition. More fields may be added to a kind later.
 * - `plugin`: a Kibana plugin registering in code at setup; `id` is its plugin id.
 * - `integration`: installed by a Fleet integration package; `package` is the package name.
 * - `user`: created through the API or UI; `id` is the Kibana user profile uid when known.
 */
export type EntityDefinitionManagedBy = z.infer<typeof EntityDefinitionManagedBy>;
export const EntityDefinitionManagedBy = lazySchema(() =>
  z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('plugin'), id: z.string().max(MAX_MANAGED_BY_STRING_LENGTH) }),
    z.object({
      kind: z.literal('integration'),
      package: z.string().max(MAX_MANAGED_BY_STRING_LENGTH),
    }),
    z.object({
      kind: z.literal('user'),
      id: z.string().max(MAX_MANAGED_BY_STRING_LENGTH).optional(),
    }),
  ])
);

/**
 * Everything the entity store's extraction engine, component templates and CRUD API read. Optional
 * on a definition: its presence does not make the store extract the type, which it only does for
 * its own built-ins.
 */
export const extractionBlockSchema = lazySchema(() =>
  z.strictObject({
    // Fields extracted into the store and their retention policy. Drives STATS, the merge EVAL,
    // the component template mappings and CRUD field validation.
    fields: z.array(fieldSchema).max(MAX_FIELDS),
    // Optional evaluated fields applied before pre-agg overrides and STATS for all entity types.
    fieldEvaluations: z.optional(z.array(fieldEvaluationSchema)),
    // Optional filter (Condition from @kbn/streamlang) applied in ESQL only, right after the
    // LOOKUP JOIN, to filter rows (e.g. keep already-stored entities or IDP-like events). No DSL equivalent.
    postAggFilter: z.optional(streamlangConditionSchema),
    // Optional: when conditions are true on source docs, set the given fields (EVAL after field evals, before STATS).
    whenConditionTrueSetFieldsPreAgg: z.optional(setFieldsByConditionListSchema),
    // Post-STATS EVAL in logs ESQL (recent.* vs plain). Single-doc paths re-apply entries after pre-agg for parity.
    whenConditionTrueSetFieldsAfterStats: z.optional(setFieldsByConditionListSchema),
    // Value written to `entity.type` when the source documents carry none.
    entityTypeFallback: z.string().max(MAX_ENTITY_TYPE_FALLBACK_LENGTH).optional(),
    // Omission disables single-document creation for the entity type.
    creatableFromSingleDocument: z.optional(creatableFromSingleDocumentSchema),
    // Optional document-level predicate (Condition from @kbn/streamlang) marking this entity type's
    // high-signal logs. Omission means the type has no priority/non-priority split.
    priorityExtractionGate: z.optional(streamlangConditionSchema),
    // Opts the non-priority process into sampling. Requires priorityExtractionGate; omission means
    // no sampling.
    nonPrioritySampling: z.optional(z.boolean()),
  })
);

/**
 * The definition's object shape without its whole-definition rules. Derive other schemas from this
 * one (zod cannot `omit` a refined object) and re-apply `assertDynamicDefinitionRules`.
 */
export const entityDefinitionObjectSchema = lazySchema(() =>
  z.object({
    id: z.string().max(MAX_DEFINITION_ID_LENGTH),
    type: entityDefinitionTypeSchema,
    // The type's display name, shown wherever the type is listed.
    name: z.string().max(MAX_DEFINITION_NAME_LENGTH),
    // Optional free text on what the entity is and how it is identified.
    description: z.string().max(MAX_DEFINITION_DESCRIPTION_LENGTH).optional(),
    // Who manages the definition. Optional here; the registry requires it.
    managedBy: z.optional(EntityDefinitionManagedBy),
    identityField: identityFieldSchema,
    extraction: z.optional(extractionBlockSchema),
    dynamic: z.optional(dynamicBlockSchema),
  })
);

/**
 * Identity core (`type`, `name`, `description`, `managedBy`, `identityField`) plus the optional
 * `extraction` and `dynamic` blocks, with the whole-definition rules for `dynamic`.
 */
export const entitySchema = lazySchema(() =>
  entityDefinitionObjectSchema.superRefine(assertDynamicDefinitionRules)
);

export type EntityField = z.infer<typeof fieldSchema>; // entities fields
export type CalculatedEntityIdentity = z.infer<typeof calculatedIdentityFieldLogicSchema>; // full identity (euidRanking + documentsFilter + optional fieldEvaluations)
export type SingleFieldIdentity = z.infer<typeof singleFieldIdentitySchema>;
export type EntityIdentity = z.infer<typeof identityFieldSchema>; // definition-time identity (full or singleField)
export type EntityDefinition = z.infer<typeof entityDefinitionObjectSchema>; // entity with id generated in runtime
export type EntityDefinitionWithoutId = Omit<EntityDefinition, 'id'>;
/** @deprecated `EntityDefinitionWithoutId` now accepts any valid type name; use it instead. */
export type EntityDefinitionOfAnyType = EntityDefinitionWithoutId;
export type ExtractionBlock = z.infer<typeof extractionBlockSchema>;
/** A definition that carries extraction config, for server code that only runs for materialised types. */
export type ExtractedEntityDefinition = EntityDefinition & { extraction: ExtractionBlock };
export type ExtractedEntityDefinitionWithoutId = EntityDefinitionWithoutId & {
  extraction: ExtractionBlock;
};
/** A built-in definition as registered: extraction config present and `type` one of the store's own. */
export type ManagedEntityDefinitionWithoutId = ExtractedEntityDefinitionWithoutId & {
  type: EntityType;
};
export type ManagedEntityDefinition = ExtractedEntityDefinition & { type: EntityType }; // built-in entity with a known 'type'

/**
 * A definition resolved for an extraction mode, carrying the predicate that selects which logs that
 * mode handles. Derived from `priorityExtractionGate` on lookup rather than authored, so it is kept
 * separate from the declared field and out of `entitySchema`. Absent means every document passing
 * `documentsFilter` is scanned.
 */
export type GatedEntityDefinition<T = EntityDefinition> = T & { extractionGate?: Condition };
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

type DefinitionWithOptionalExtraction = Pick<EntityDefinitionWithoutId, 'extraction'>;

/** Returns the post-aggregation filter, if the definition declares one. */
export const getPostAggFilter = (
  definition: DefinitionWithOptionalExtraction
): Condition | undefined => definition.extraction?.postAggFilter;

/** Returns the pre-aggregation field overrides, if the definition declares any. */
export const getPreAggFieldOverrides = (
  definition: DefinitionWithOptionalExtraction
): SetFieldsByCondition[] | undefined => definition.extraction?.whenConditionTrueSetFieldsPreAgg;

/** Returns the post-STATS field overrides, if the definition declares any. */
export const getPostStatsFieldOverrides = (
  definition: DefinitionWithOptionalExtraction
): SetFieldsByCondition[] | undefined =>
  definition.extraction?.whenConditionTrueSetFieldsAfterStats;
