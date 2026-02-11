/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

export const fieldRuleSchema = z.object({
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
  entityClass: z.string().optional(),
});

export const regexRuleSchema = z.object({
  /** Unique rule identifier. */
  id: z.string(),
  /** Must be `"regex"`. */
  type: z.literal('regex'),
  /** Token prefix/class label (e.g., `FINANCE_ID`, `EMAIL`). */
  entityClass: z.string(),
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
  /** The identifier for the NER model. */
  modelId: z.string(),
  /** List of permitted entity classes (e.g., `["PER", "ORG", "LOC"]`). */
  allowedEntityClasses: z.array(z.string()),
  /** Whether the rule is active. */
  enabled: z.boolean(),
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
  rules: z.object({
    fieldRules: z.array(fieldRuleSchema),
    regexRules: z.array(regexRuleSchema).optional().default([]),
    nerRules: z.array(nerRuleSchema).optional().default([]),
  }),
  /** Reference to the per-space encrypted salt used for deterministic tokenization. */
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

export const tokenSourceEntrySchema = z.object({
  /** The token (e.g., `HOST_NAME_ae687...`). */
  token: z.string(),
  /** RFC-6901 JSON Pointer to the string leaf that was tokenized. */
  pointer: z.string(),
  /** Token prefix/class label (e.g., `HOST_NAME`). */
  entityClass: z.string(),
  /** The producing artifact/workflow type (e.g., `attack_discovery`). */
  sourceType: z.string(),
  /** The producing scope/artifact id. */
  sourceId: z.string(),
  /** Start index within the pointer string leaf (optional). */
  spanStart: z.number().optional(),
  /** End index within the pointer string leaf (optional). */
  spanEnd: z.number().optional(),
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

export const replacementsSetSchema = z.object({
  /** UUID for the mapping set. */
  id: z.string(),
  /** Scope type: `thread` or `execution`. */
  scopeType: z.enum(['thread', 'execution']),
  /** Thread ID or execution ID. */
  scopeId: z.string(),
  /** Anonymization profile used. */
  profileId: z.string(),
  /** Map of token → original value. */
  tokenToOriginal: z.record(z.string(), z.string()),
  /** Array of token source entries. */
  tokenSources: z.array(tokenSourceEntrySchema),
  /** Creation timestamp. */
  createdAt: z.string(),
  /** Last modified timestamp. */
  updatedAt: z.string(),
  /** Username/service identity. */
  createdBy: z.string(),
  /** Space identifier. */
  namespace: z.string(),
});
