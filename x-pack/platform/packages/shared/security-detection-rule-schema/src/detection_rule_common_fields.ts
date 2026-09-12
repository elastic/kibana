/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import type { MappingProperty } from '@kbn/alerting-v2-rule-builders';

// ---------------------------------------------------------------------------
// MITRE ATT&CK threat shapes
//
// Copied verbatim from the design (rule-data-model.md "The shared detection
// fragment").  The .max() bounds are tight on purpose: they are what fits the
// 256 KB bounded-schema budget at the array maximums below.
// ---------------------------------------------------------------------------

export const threatTacticSchema = z
  .object({
    id: z.string().max(32),
    name: z.string().max(256),
    reference: z.string().max(512),
  })
  .strict();

export const threatSubtechniqueSchema = threatTacticSchema;

export const threatTechniqueSchema = z
  .object({
    id: z.string().max(32),
    name: z.string().max(256),
    reference: z.string().max(512),
    subtechnique: z.array(threatSubtechniqueSchema).max(3).optional(),
  })
  .strict();

export const threatEntrySchema = z
  .object({
    framework: z.string().max(64),
    tactic: threatTacticSchema,
    technique: z.array(threatTechniqueSchema).max(5).optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Shared detection fragment
//
// A plain object of Zod shapes that each detection rule type spreads into its
// own z.object({ ...detectionRuleCommonFields, <type-specific fields> }).strict().
//
// Rules:
//   - No .default(), no .transform(), no .catch() — registration rejects them.
//   - Every object uses .strict().
//   - Every string and array is bounded.
//   - Twelve fields exactly as the data-model table specifies.
//
// Ref: rule-data-model.md "The shared detection fragment"
//      rule-validation.md "No defaults, no transforms"
// ---------------------------------------------------------------------------

export const detectionRuleCommonFields = {
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  risk_score: z.number().int().min(0).max(100),
  max_signals: z.number().int().min(1).max(10000).optional(),
  threat: z.array(threatEntrySchema).max(5).optional(),
  setup: z.string().max(8192).optional(),
  note: z.string().max(8192).optional(),
  references: z.array(z.string().max(1024)).max(32).optional(),
  false_positives: z.array(z.string().max(1024)).max(16).optional(),
  author: z.array(z.string().max(256)).max(16).optional(),
  license: z.string().max(256).optional(),
  related_integrations: z
    .array(
      z
        .object({
          package: z.string().max(64),
          version: z.string().max(32),
          integration: z.string().max(64).optional(),
        })
        .strict()
    )
    .max(16)
    .optional(),
  required_fields: z
    .array(
      z
        .object({
          name: z.string().max(128),
          type: z.string().max(64),
          ecs: z.boolean(),
        })
        .strict()
    )
    .max(32)
    .optional(),
};

// Derive DetectionRuleCommonFields by constructing a temporary strict schema
// and inferring from it.  The enrichment helper (step 3.4) imports this type.
const _detectionRuleCommonSchema = z.object(detectionRuleCommonFields).strict();
export type DetectionRuleCommonFields = z.infer<typeof _detectionRuleCommonSchema>;

// ---------------------------------------------------------------------------
// Fragment sub-field mapping constants
//
// Four fragment fields need typed sub-fields in the flattened container:
//   - risk_score and max_signals: numeric range and sort
//   - note and setup: full-text search
//
// Each composing type's manifest version 1 spreads these constants into its
// own addedSubFieldMappings (together with any type-specific sub-fields such
// as `query`).  The shared fragment has no manifest of its own — each type
// owns its version history.
//
// Ref: rule-data-model.md "When a field gets a typed sub-field"
//      rule-type-registration.md "The manifest shape"
// ---------------------------------------------------------------------------

export const DETECTION_RULE_FRAGMENT_SUB_FIELD_MAPPINGS: Record<string, MappingProperty> = {
  risk_score: { type: 'integer' },
  max_signals: { type: 'integer' },
  note: { type: 'text' },
  setup: { type: 'text' },
};
