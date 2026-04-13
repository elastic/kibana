/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

/** default NER model **/

export const NER_MODEL_ID = 'elastic__distilbert-base-uncased-finetuned-conll03-english';
/**
 * Entity classes produced by NER models (CoNLL-03 standard classes).
 * These are the only classes a NER model may emit; used to filter model output.
 */
export const NER_ENTITY_CLASSES = ['PER', 'ORG', 'LOC', 'MISC'] as const;
export type NerEntityClass = (typeof NER_ENTITY_CLASSES)[number];

/**
 * Full canonical set of anonymization entity class labels.
 * Includes NER classes plus domain-specific field labels.
 * This list intentionally stays compact/canonical and does not include a
 * dedicated `PHONE` class; phone-like regex matches should use the closest
 * canonical class (`MISC`) until/unless a formal class is added.
 * Use these as token prefixes in masks (e.g. `HOST_NAME_abc123`).
 */
export const ANONYMIZATION_ENTITY_CLASSES = [
  ...NER_ENTITY_CLASSES,
  'HOST_NAME',
  'USER_NAME',
  'IP',
  'URL',
  'EMAIL',
  'CLOUD_ACCOUNT',
  'ENTITY_NAME',
  'RESOURCE_NAME',
  'RESOURCE_ID',
] as const;
export type AnonymizationEntityClass = (typeof ANONYMIZATION_ENTITY_CLASSES)[number];

export const anonymizationEntityClassSchema = z.enum(ANONYMIZATION_ENTITY_CLASSES);
export const nerEntityClassSchema = z.enum(NER_ENTITY_CLASSES);
export const TOKEN_SOURCE_TYPES = ['message', 'tool_call', 'artifact', 'workflow'] as const;
export type TokenSourceType = (typeof TOKEN_SOURCE_TYPES)[number];
export const tokenSourceTypeSchema = z.enum(TOKEN_SOURCE_TYPES);
const tokenSourceRefValueSchema = z.union([z.string(), z.number(), z.boolean()]);
export const tokenSourceRefSchema = z.record(z.string(), tokenSourceRefValueSchema);

export const fieldRuleSchema = z
  .object({
    /** ECS or custom field name (e.g., `host.name`). */
    field: z.string(),
    /** Whether this field is permitted for use as context. */
    allowed: z.boolean(),
    /** Whether this field's value should be tokenized/masked when included. */
    anonymized: z.boolean(),
    /**
     * Token prefix/class label (e.g., `HOST_NAME`, `USER_NAME`).
     * Required when `anonymized` is true.
     */
    entityClass: anonymizationEntityClassSchema.optional(),
  })
  .refine((rule) => !rule.anonymized || Boolean(rule.entityClass), {
    message: 'entityClass is required when anonymized is true',
    path: ['entityClass'],
  });

export const regexRuleSchema = z.object({
  /** Unique rule identifier. */
  id: z.string(),
  /** Must be `"regex"`. */
  type: z.literal('regex'),
  /** Token prefix/class label. Must be one of the canonical anonymization entity classes. */
  entityClass: anonymizationEntityClassSchema,
  /** The regular expression pattern. */
  pattern: z.string(),
  /** Whether the rule is active. */
  enabled: z.boolean(),
});

export const nerRuleSchema = z.object({
  /** Unique rule identifier. */
  id: z.string(),
  /** Must be `"ner"`. */
  type: z.literal('ner'),
  /**
   * The Elasticsearch ML model ID to use for NER inference.
   */
  modelId: z.string().optional(),
  /**
   * Subset of NER model output classes to retain.
   * Must be chosen from the CoNLL-03 standard classes: PER, ORG, LOC, MISC.
   */
  allowedEntityClasses: z.array(nerEntityClassSchema),
  /** Whether the rule is active. */
  enabled: z.boolean(),
});

/** Reusable profile rules payload shared by APIs and persisted profiles. */
export const anonymizationProfileRulesSchema = z.object({
  fieldRules: z.array(fieldRuleSchema),
  regexRules: z.array(regexRuleSchema).optional().default([]),
  nerRules: z.array(nerRuleSchema).optional().default([]),
});

export const anonymizationProfileSchema = z.object({
  /** UUID for the profile. */
  id: z.string(),
  /** Profile display name. */
  name: z.string(),
  /** Optional description. */
  description: z.string().optional(),
  /** Target type: `data_view`, `index_pattern`, or `index`. */
  targetType: z.enum(['data_view', 'index_pattern', 'index']),
  /** Target identifier (data view SO id, index pattern string, or index name). */
  targetId: z.string(),
  /** Per-field and text-scanning rules. */
  rules: anonymizationProfileRulesSchema,
  /**
   * Derived per-space salt key identifier (`salt-${namespace}`) used by profile APIs.
   * This is not the encrypted saved object document ID.
   */
  saltId: z.string(),
  /** Space identifier. */
  namespace: z.string(),
  /** Creation timestamp. */
  createdAt: z.string(),
  /** Last modified timestamp. */
  updatedAt: z.string(),
  /** Username of creator. */
  createdBy: z.string(),
  /** Username of last updater. */
  updatedBy: z.string(),
});

/** Public API payload for profile creation. */
export const createAnonymizationProfileRequestSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  targetType: z.enum(['data_view', 'index_pattern', 'index']),
  targetId: z.string(),
  rules: anonymizationProfileRulesSchema,
});

/** Public API payload for profile updates. */
export const updateAnonymizationProfileRequestSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  rules: anonymizationProfileRulesSchema.optional(),
});

/** Public API query payload for profile search. */
export const findAnonymizationProfilesQuerySchema = z.object({
  filter: z.string().optional(),
  target_type: z.enum(['data_view', 'index_pattern', 'index']).optional(),
  target_id: z.string().optional(),
  sort_field: z.enum(['created_at', 'name', 'updated_at']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  page: z.coerce.number().int().min(1).optional(),
  per_page: z.coerce.number().int().min(1).max(1000).optional(),
});

const tokenSourceEntryBaseSchema = z.object({
  /** The token (e.g., `HOST_NAME_ae687...`). */
  token: z.string(),
  /** RFC-6901 JSON Pointer to the string leaf that was tokenized. */
  pointer: z.string(),
  /** Token prefix/class label (e.g., `HOST_NAME`). */
  entityClass: anonymizationEntityClassSchema,
  /** The producing artifact/workflow type. */
  sourceType: tokenSourceTypeSchema,
  /** The producing scope/artifact id. */
  sourceId: z.string(),
  /**
   * Generic source reference metadata used to locate the token occurrence
   * within the source payload (for example message id/index, artifact path, etc).
   */
  sourceRef: tokenSourceRefSchema.optional(),
  /** Start index within the pointer string leaf (optional). */
  spanStart: z.number().int().nonnegative().optional(),
  /** End index within the pointer string leaf (optional). */
  spanEnd: z.number().int().nonnegative().optional(),
  /** Logical field identifier used for policy evaluation (optional). */
  field: z.string().optional(),
  /** Semantic field reference inside a templated string (optional). */
  fieldRef: z.string().optional(),
  /** Rule type that produced this match (optional). */
  ruleType: z.string().optional(),
  /** Rule id that produced this match (optional). */
  ruleId: z.string().optional(),
  /** When the token was first seen (optional). */
  firstSeenAt: z.string().optional(),
});

export const tokenSourceEntrySchema = tokenSourceEntryBaseSchema.refine(
  (entry) => {
    if (entry.sourceType !== 'message') {
      return true;
    }

    const messageId = entry.sourceRef?.messageId;
    const messageIndex = entry.sourceRef?.messageIndex;
    const hasMessageId = typeof messageId === 'string' && messageId.length > 0;
    const hasMessageIndex =
      typeof messageIndex === 'number' && Number.isInteger(messageIndex) && messageIndex >= 0;

    return hasMessageId || hasMessageIndex;
  },
  {
    message:
      'tokenSourceEntry.sourceRef.messageId or tokenSourceEntry.sourceRef.messageIndex is required when sourceType is "message"',
    path: ['sourceRef'],
  }
);

export const replacementsSetSchema = z.object({
  /** UUID for the mapping set. */
  id: z.string(),
  /** Space identifier. */
  namespace: z.string(),
  /** Array of replacements (`anonymized` token to original value). */
  replacements: z.array(
    z.object({
      anonymized: z.string(),
      original: z.string(),
    })
  ),
  /** Creation timestamp. */
  createdAt: z.string(),
  /** Last modified timestamp. */
  updatedAt: z.string(),
  /** Username/service identity. */
  createdBy: z.string(),
});
