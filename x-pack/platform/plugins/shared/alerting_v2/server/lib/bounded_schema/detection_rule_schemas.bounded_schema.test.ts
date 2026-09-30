/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Bounded-schema check for the detection rule schemas.
 *
 * This file uses synthetic fixture schemas that reproduce the two detection
 * types' declared bounds as literals.  The authoritative schemas live in:
 *   x-pack/solutions/security/plugins/security_detections/common/detection_rule_fields/detection_rule_common_fields.ts
 *   x-pack/solutions/security/plugins/security_detections/common/detection_rule_fields/custom_query.ts
 *   x-pack/solutions/security/plugins/security_detections/common/detection_rule_fields/threshold_builder_fields.ts
 *
 * This fixture must reproduce the real bounds exactly.  Any drift between the
 * two surfaces as a registration failure at the security_detections plugin's
 * setup, not here — the registration checks run over the real schemas on every
 * boot — but this file is also the designated boundary proof, and a fixture
 * that caps fields below the real schema does not prove the real schema passes.
 *
 * `assertBoundedSchema` and `computeWorstCaseBytes` live in this plugin and
 * are not exported from its public server API, so a test in
 * x-pack/solutions/security cannot reach them.  This file is the boundary
 * proof: the framework checks that a detection-shaped schema passes, regardless
 * of which package declares the real schema.
 *
 * Ref: implementation-plan.md step B.6
 *      rule-data-model.md "The bounded-schema budget"
 *      builder-type-registration-redesign.md "Long text fields and the string ceiling"
 */

import { z } from '@kbn/zod/v4';
import {
  MAX_BUILDER_FIELDS_STRING_LENGTH,
  MAX_BUILDER_FIELDS_ARRAY_ITEMS,
  MAX_BUILDER_FIELDS_BYTES,
} from '@kbn/alerting-v2-constants';
import { assertBoundedSchema } from './assert_bounded_schema';
import type { BoundedSchemaSubject } from './assert_bounded_schema';

// ---------------------------------------------------------------------------
// Synthetic fixture schemas
//
// Bounds copied as literals from:
//   detection_rule_common_fields.ts  — common fields
//   custom_query.ts                  — query type-specific fields
//   threshold_builder_fields.ts      — threshold type-specific fields
//
// note: 65,536-character bound (raised in step B.8 from 8,192; a real prebuilt
// rule ships a 29,075-char investigation guide so 8,192 cannot hold the corpus).
// setup: 16,384-character bound (raised in step B.8 from 8,192).
// ---------------------------------------------------------------------------

/** Shared MITRE ATT&CK subtechnique shape. */
const fixtureSubtechniqueSchema = z
  .object({
    id: z.string().max(32),
    name: z.string().max(256),
    reference: z.string().max(512),
  })
  .strict();

/** Shared MITRE ATT&CK technique shape. */
const fixtureTechniqueSchema = z
  .object({
    id: z.string().max(32),
    name: z.string().max(256),
    reference: z.string().max(512),
    subtechnique: z.array(fixtureSubtechniqueSchema).max(3).optional(),
  })
  .strict();

/** Shared MITRE ATT&CK threat entry shape. */
const fixtureThreatEntrySchema = z
  .object({
    framework: z.string().max(64),
    tactic: z
      .object({
        id: z.string().max(32),
        name: z.string().max(256),
        reference: z.string().max(512),
      })
      .strict(),
    technique: z.array(fixtureTechniqueSchema).max(5).optional(),
  })
  .strict();

/** Common detection fields shared by both fixture types. */
const fixtureCommonFields = {
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  risk_score: z.number().int().min(0).max(100),
  max_signals: z.number().int().min(1).max(10000).optional(),
  threat: z.array(fixtureThreatEntrySchema).max(5).optional(),
  // setup: 16,384 (raised in step B.8; setup guides are short but need generous headroom).
  // note: 65,536 (raised in step B.8; a real prebuilt rule ships a 29,075-char investigation guide).
  setup: z.string().max(16384).optional(),
  note: z.string().max(65536).optional(),
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

/**
 * Synthetic fixture for security.detection.query.
 * Bounds copied from custom_query.ts.  No defaults, no transforms, strict.
 */
const fixtureCustomQuerySchema = z
  .object({
    ...fixtureCommonFields,
    index: z.array(z.string().min(1).max(256)).min(1).max(32),
    query: z.string().min(1).max(8192),
    language: z.enum(['kuery', 'lucene']),
  })
  .strict();

/**
 * Synthetic fixture for security.detection.threshold.
 * Bounds copied from threshold_builder_fields.ts.  No defaults, no transforms, strict.
 */
const fixtureThresholdSchema = z
  .object({
    ...fixtureCommonFields,
    index: z.array(z.string().min(1).max(256)).min(1).max(32),
    query: z.string().max(8192), // no min — threshold allows an empty (match-all) pre-filter
    language: z.enum(['kuery', 'lucene']),
    threshold: z
      .object({
        field: z.array(z.string().min(1).max(256)).max(5),
        value: z.number().int().min(1),
        cardinality: z
          .array(
            z
              .object({
                field: z.string().min(1).max(256),
                value: z.number().int().min(0),
              })
              .strict()
          )
          .max(1)
          .optional(),
      })
      .strict(),
  })
  .strict();

// ---------------------------------------------------------------------------
// The builder-schema subject used by the registry for all builder types.
// ---------------------------------------------------------------------------

const builderSubject: BoundedSchemaSubject = {
  kind: 'Builder type',
  schemaProperty: 'builderFieldsSchema',
  rootPath: 'builder_fields',
  limits: {
    stringLength: MAX_BUILDER_FIELDS_STRING_LENGTH,
    arrayItems: MAX_BUILDER_FIELDS_ARRAY_ITEMS,
    totalBytes: MAX_BUILDER_FIELDS_BYTES,
  },
  builderChecks: true,
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('assertBoundedSchema – synthetic security.detection.query fixture', () => {
  it('passes the full bounded-schema check', () => {
    expect(() =>
      assertBoundedSchema(fixtureCustomQuerySchema, 'security.detection.query', builderSubject)
    ).not.toThrow();
  });
});

describe('assertBoundedSchema – synthetic security.detection.threshold fixture', () => {
  it('passes the full bounded-schema check', () => {
    expect(() =>
      assertBoundedSchema(fixtureThresholdSchema, 'security.detection.threshold', builderSubject)
    ).not.toThrow();
  });
});

describe('assertBoundedSchema – no-defaults/no-transforms rule', () => {
  it('rejects a detection-shaped schema with a .default() on any field', () => {
    // Build a schema inline that matches the detection shape but adds a
    // default to max_signals.  The test verifies the framework rejects it
    // regardless of which package declared the schema.
    const schemaWithDefault = z
      .object({
        severity: z.enum(['low', 'medium', 'high', 'critical']),
        risk_score: z.number().int().min(0).max(100),
        // Adding a default to max_signals to verify the check fires.
        max_signals: z.number().int().min(1).max(10000).optional().default(100),
        index: z.array(z.string().min(1).max(256)).min(1).max(32),
        query: z.string().min(1).max(8192),
        language: z.enum(['kuery', 'lucene']),
      })
      .strict();

    expect(() =>
      assertBoundedSchema(schemaWithDefault, 'security.detection.query', builderSubject)
    ).toThrow(/.default\(\)/);
  });
});
