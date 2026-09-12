/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Bounded-schema check for the detection rule schemas.
 *
 * The package test in @kbn/security-detection-rule-schema exercises parsing
 * and bound rejections, but it cannot import assertBoundedSchema because that
 * lives in this plugin (packages cannot import from plugins).  This test file
 * lives here so it can import both and run the framework's extended check.
 *
 * Both schemas are imported from the production package so this check runs
 * over the schemas that actually ship.  A copy that drifted silently would
 * undermine the bounded-schema claim made in rule-data-model.md.
 *
 * Ref: implementation-plan.md step 3.1
 *      rule-data-model.md "The bounded-schema budget"
 */

import { z } from '@kbn/zod/v4';
import {
  customQueryBuilderFieldsSchema,
  thresholdBuilderFieldsSchema,
  detectionRuleCommonFields,
  DETECTION_RULE_FRAGMENT_SUB_FIELD_MAPPINGS,
} from '@kbn/security-detection-rule-schema';
import {
  MAX_BUILDER_FIELDS_STRING_LENGTH,
  MAX_BUILDER_FIELDS_ARRAY_ITEMS,
  MAX_BUILDER_FIELDS_BYTES,
} from '@kbn/alerting-v2-constants';
import { assertBoundedSchema } from './assert_bounded_schema';
import type { BoundedSchemaSubject } from './assert_bounded_schema';

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

describe('assertBoundedSchema – security.detection.query', () => {
  it('passes the full bounded-schema check', () => {
    expect(() =>
      assertBoundedSchema(
        customQueryBuilderFieldsSchema,
        'security.detection.query',
        builderSubject
      )
    ).not.toThrow();
  });
});

describe('assertBoundedSchema – security.detection.threshold', () => {
  it('passes the full bounded-schema check', () => {
    expect(() =>
      assertBoundedSchema(
        thresholdBuilderFieldsSchema,
        'security.detection.threshold',
        builderSubject
      )
    ).not.toThrow();
  });
});

describe('assertBoundedSchema – no-defaults/no-transforms rule (fragment)', () => {
  it('rejects a schema with a .default() on any fragment field', () => {
    const schemaWithDefault = z
      .object({
        ...detectionRuleCommonFields,
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

describe('DETECTION_RULE_FRAGMENT_SUB_FIELD_MAPPINGS', () => {
  it('declares the four fragment fields the schemas contribute', () => {
    expect(Object.keys(DETECTION_RULE_FRAGMENT_SUB_FIELD_MAPPINGS)).toEqual(
      expect.arrayContaining(['risk_score', 'max_signals', 'note', 'setup'])
    );
  });
});
