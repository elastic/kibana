/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Step 3.5: detection-type manifest folds and the byte budget.
 *
 * Tests that:
 * 1. Importing rule_model_versions.ts populates globalFoldedVersions with both
 *    detection-type folds (security.detection.query v1, security.detection.threshold v1).
 * 2. Both model-version keys ('7', '8') are present in ruleModelVersions.
 * 3. assembleBuilderFieldsMappings produces the expected sub-field keys from both
 *    manifests (shared fragment plus type-specific fields, merged silently for
 *    identical declarations).
 * 4. assertBoundedSchema accepts both full builder-fields schemas — the
 *    bounded-schema check passes, meaning both types fit within the framework cap.
 * 5. The actual worst-case byte counts for both schemas are below MAX_BUILDER_FIELDS_BYTES.
 * 6. Registering both full BuilderTypeDefinitions passes all Phase 2 registration
 *    checks (checks 2–8).
 *
 * Ref: rule-type-registration.md "The fold into the saved-object registration"
 *      rule-data-model.md "The bounded-schema budget"
 *      implementation-plan.md step 3.5
 */

// Importing ruleModelVersions triggers the fromBuilderManifest() calls that
// populate globalFoldedVersions as a side effect. This import must appear
// before any code that consults globalFoldedVersions.
import { ruleModelVersions } from './rule_model_versions';

import {
  MAX_BUILDER_FIELDS_ARRAY_ITEMS,
  MAX_BUILDER_FIELDS_BYTES,
  MAX_BUILDER_FIELDS_STRING_LENGTH,
} from '@kbn/alerting-v2-constants';
import {
  securityDetectionQuery,
  securityDetectionQueryManifest,
  customQueryBuilderFieldsSchema,
  securityDetectionThreshold,
  securityDetectionThresholdManifest,
  thresholdBuilderFieldsSchema,
} from '@kbn/security-detection-rule-schema';
import { defineBuilderType } from '@kbn/alerting-v2-rule-builders';
import { assertBoundedSchema, computeWorstCaseBytes } from '../../lib/bounded_schema';
import { globalFoldedVersions } from '../../lib/builder_types/folded_versions';
import { BuilderTypeRegistry } from '../../lib/builder_types/builder_type_registry';
import { assembleBuilderFieldsMappings } from '../assemble_builder_fields_mappings';

// Cast the typed definitions to RegisteredBuilderType (BuilderTypeDefinition<OpaqueBuilderFields>)
// so they can be passed to BuilderTypeRegistry.register(). The registry stores all types in
// their erased form; the concrete TFields generic only matters at the type-checking layer.
// defineBuilderType is the canonical way to do this cast in the rule-builders package.
const queryDefinition = defineBuilderType(securityDetectionQuery);
const thresholdDefinition = defineBuilderType(securityDetectionThreshold);

// The subject used by the production registration check (assert_valid_definition.ts).
// Using the same limits here ensures the test and production checks are consistent.
const BUILDER_FIELDS_SUBJECT = {
  kind: 'Builder type',
  schemaProperty: 'builderFieldsSchema',
  rootPath: 'builder_fields',
  limits: {
    stringLength: MAX_BUILDER_FIELDS_STRING_LENGTH,
    arrayItems: MAX_BUILDER_FIELDS_ARRAY_ITEMS,
    totalBytes: MAX_BUILDER_FIELDS_BYTES,
  },
  builderChecks: true as const,
};

// Same subject but without the totalBytes cap, so computeWorstCaseBytes returns
// the raw byte count rather than throwing when the result exceeds the cap.
const BYTE_MEASUREMENT_SUBJECT = {
  ...BUILDER_FIELDS_SUBJECT,
  limits: {
    ...BUILDER_FIELDS_SUBJECT.limits,
    totalBytes: Number.MAX_SAFE_INTEGER,
  },
};

// ---------------------------------------------------------------------------
// 1. Fold registration: globalFoldedVersions is populated at import time
// ---------------------------------------------------------------------------

describe('detection-type fold registration', () => {
  it('records security.detection.query v1 in globalFoldedVersions', () => {
    expect(globalFoldedVersions.has('security.detection.query', 1)).toBe(true);
  });

  it('records security.detection.threshold v1 in globalFoldedVersions', () => {
    expect(globalFoldedVersions.has('security.detection.threshold', 1)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Model-version keys present
// ---------------------------------------------------------------------------

describe('ruleModelVersions fold lines', () => {
  it("contains key '7' for security.detection.query v1", () => {
    expect(ruleModelVersions).toHaveProperty('7');
  });

  it("contains key '8' for security.detection.threshold v1", () => {
    expect(ruleModelVersions).toHaveProperty('8');
  });

  it("version '7' has a mappings_addition change", () => {
    const v7 = ruleModelVersions['7'] as { changes: Array<{ type: string }> };
    expect(v7.changes.some((c) => c.type === 'mappings_addition')).toBe(true);
  });

  it("version '8' has a mappings_addition change", () => {
    const v8 = ruleModelVersions['8'] as { changes: Array<{ type: string }> };
    expect(v8.changes.some((c) => c.type === 'mappings_addition')).toBe(true);
  });

  it('dense version sequence runs from 1 to 8 with no gaps', () => {
    const keys = Object.keys(ruleModelVersions).map(Number).sort((a, b) => a - b);
    expect(keys).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  });
});

// ---------------------------------------------------------------------------
// 3. Static mapping assembly
// ---------------------------------------------------------------------------

describe('assembleBuilderFieldsMappings with both detection manifests', () => {
  const assembled = assembleBuilderFieldsMappings([
    securityDetectionQueryManifest,
    securityDetectionThresholdManifest,
  ]);

  it('includes risk_score as integer (shared fragment)', () => {
    expect(assembled).toHaveProperty('risk_score', { type: 'integer' });
  });

  it('includes max_signals as integer (shared fragment)', () => {
    expect(assembled).toHaveProperty('max_signals', { type: 'integer' });
  });

  it('includes note as text (shared fragment)', () => {
    expect(assembled).toHaveProperty('note', { type: 'text' });
  });

  it('includes setup as text (shared fragment)', () => {
    expect(assembled).toHaveProperty('setup', { type: 'text' });
  });

  it('includes query as text (declared by both types — merges silently)', () => {
    expect(assembled).toHaveProperty('query', { type: 'text' });
  });

  it('does not contain any unexpected keys beyond the declared sub-fields', () => {
    const expectedKeys = new Set(['risk_score', 'max_signals', 'note', 'setup', 'query']);
    const actualKeys = new Set(Object.keys(assembled));
    expect(actualKeys).toEqual(expectedKeys);
  });
});

// ---------------------------------------------------------------------------
// 4. assertBoundedSchema accepts both schemas (the cap is not exceeded)
// ---------------------------------------------------------------------------

describe('assertBoundedSchema acceptance for both detection schemas', () => {
  it('accepts customQueryBuilderFieldsSchema under all framework limits', () => {
    expect(() =>
      assertBoundedSchema(
        customQueryBuilderFieldsSchema,
        'security.detection.query',
        BUILDER_FIELDS_SUBJECT
      )
    ).not.toThrow();
  });

  it('accepts thresholdBuilderFieldsSchema under all framework limits', () => {
    expect(() =>
      assertBoundedSchema(
        thresholdBuilderFieldsSchema,
        'security.detection.threshold',
        BUILDER_FIELDS_SUBJECT
      )
    ).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// 5. Byte budget measurement
//
// computeWorstCaseBytes returns the actual worst-case serialized size without
// enforcing the cap, so the test can record and assert the concrete numbers.
// If either number exceeds MAX_BUILDER_FIELDS_BYTES the design's predicted
// ceiling is wrong — stop and report rather than silently loosening a bound.
// ---------------------------------------------------------------------------

describe('byte budget measurements (step 3.5)', () => {
  let queryBytes: number;
  let thresholdBytes: number;

  beforeAll(() => {
    queryBytes = computeWorstCaseBytes(
      customQueryBuilderFieldsSchema,
      'security.detection.query',
      BYTE_MEASUREMENT_SUBJECT
    );
    thresholdBytes = computeWorstCaseBytes(
      thresholdBuilderFieldsSchema,
      'security.detection.threshold',
      BYTE_MEASUREMENT_SUBJECT
    );
  });

  it('security.detection.query worst-case bytes is below MAX_BUILDER_FIELDS_BYTES', () => {
    expect(queryBytes).toBeLessThan(MAX_BUILDER_FIELDS_BYTES);
  });

  it('security.detection.threshold worst-case bytes is below MAX_BUILDER_FIELDS_BYTES', () => {
    expect(thresholdBytes).toBeLessThan(MAX_BUILDER_FIELDS_BYTES);
  });

  it('logs the measured bytes (visible in test output for record keeping)', () => {
    // Intentionally console.log here so the numbers appear in the test runner
    // output and can be copied into the implementation plan.
    // eslint-disable-next-line no-console
    console.log(
      `[step 3.5 byte measurements]\n` +
        `  security.detection.query:     ${queryBytes} bytes (cap: ${MAX_BUILDER_FIELDS_BYTES})\n` +
        `  security.detection.threshold: ${thresholdBytes} bytes (cap: ${MAX_BUILDER_FIELDS_BYTES})`
    );
    // Dummy assertion so this test never fails.
    expect(typeof queryBytes).toBe('number');
    expect(typeof thresholdBytes).toBe('number');
  });
});

// ---------------------------------------------------------------------------
// 6. Full registration passes all checks 2–8
//
// Uses the global BuilderTypeRegistry (which reads globalFoldedVersions, already
// populated by the rule_model_versions import above) to register both full
// BuilderTypeDefinitions. This proves that all eight registration checks
// (id format, bounded schema, ignore_above, kind pin, manifest consistency,
// managed-type completeness, mode consistency) pass for the production definitions.
// ---------------------------------------------------------------------------

describe('full BuilderTypeDefinition registration passes all checks', () => {
  let registry: BuilderTypeRegistry;

  beforeEach(() => {
    // A fresh registry per test so registrations do not bleed across tests.
    // The registry reads globalFoldedVersions by default — no withFoldedVersions
    // fixture needed because the fold lines in rule_model_versions.ts have
    // already been evaluated (top-level import) and the global is populated.
    registry = new BuilderTypeRegistry();
  });

  it('registers security.detection.query without throwing (all checks pass)', () => {
    expect(() => registry.register(queryDefinition)).not.toThrow();
  });

  it('registers security.detection.threshold without throwing (all checks pass)', () => {
    expect(() => registry.register(thresholdDefinition)).not.toThrow();
  });

  it('registers both types in a single registry without conflict', () => {
    expect(() => {
      registry.register(queryDefinition);
      registry.register(thresholdDefinition);
    }).not.toThrow();
  });

  it('after registering both types, the registry knows both', () => {
    registry.register(queryDefinition);
    registry.register(thresholdDefinition);
    expect(registry.has('security.detection.query')).toBe(true);
    expect(registry.has('security.detection.threshold')).toBe(true);
  });
});
