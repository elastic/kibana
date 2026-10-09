/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Step 3.5 / step B.4: detection-type manifest folds and the static mapping assembly.
 *
 * Tests that:
 * 1. Importing rule_model_versions.ts populates globalFoldedVersions with both
 *    detection-type folds (security.detection.query v1, security.detection.threshold v1).
 * 2. The squashed model-version key '10' is present in ruleModelVersions and carries
 *    both detection-type folds (originally '11' and '12') plus the framework fields.
 * 3. The detection rule builder fields manifest's currentMappings produces the expected
 *    32 sub-field leaves (step B.4: static mappings now come from currentMappings).
 *
 * Sections 4 (assertBoundedSchema), 5 (byte budget), and 6 (full registration) were
 * removed in step B.6: they imported the real detection schemas from the old shared
 * schema package, which is a solution-owned package the alerting_v2 build must not
 * depend on.  The bounded-schema and byte-budget proofs for the fixture schemas live
 * in detection_rule_schemas.bounded_schema.test.ts.  Full BuilderTypeDefinition
 * registration coverage is rebuilt in the security_detections plugin at step B.9.
 *
 * Ref: rule-type-registration.md "The fold into the saved-object registration"
 *      rule-data-model.md "The bounded-schema budget"
 *      implementation-plan.md step 3.5
 *      builder-type-registration-redesign.md "Assembling the saved-object type" (step B.4)
 *      implementation-plan.md step B.6
 */

// Importing ruleModelVersions triggers the fromBuilderFieldsManifest() calls that
// populate globalFoldedVersions as a side effect. This import must appear
// before any code that consults globalFoldedVersions.
import { ruleModelVersions } from './rule_model_versions';

import { detectionRuleBuilderFieldsManifest } from '@kbn/security-detection-rule-builder-fields';
import { globalFoldedVersions } from '../../lib/builder_types/folded_versions';

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
  // The POC's five model versions ('10'–'14') were squashed into a single '10'
  // to satisfy the saved-objects checker's one-new-version-per-PR rule.
  // The fold registration tests above already verify globalFoldedVersions;
  // here we only assert that the squashed key exists and carries the right content.
  it("contains key '10' (squashed — carries both detection-type folds and framework fields)", () => {
    expect(ruleModelVersions).toHaveProperty('10');
  });

  it("squashed version '10' has exactly one manifest-fold mappings_addition covering all detection v1 sub-fields", () => {
    const v9 = ruleModelVersions['10'] as {
      changes: Array<{ type: string; addedMappings?: unknown }>;
    };
    // After step B.5 there is a single fromBuilderFieldsManifest() call for both
    // security.detection.query and security.detection.threshold (they share one
    // detectionRuleBuilderFieldsManifest). The squashed '10' therefore has exactly
    // one manifest-fold mappings_addition — not two as under the old per-type design.
    const manifestFoldChanges = v9.changes.filter(
      (c) =>
        c.type === 'mappings_addition' &&
        (c.addedMappings as any)?.metadata?.properties?.builder_fields?.properties !== undefined
    );
    expect(manifestFoldChanges.length).toBe(1);
    const bfProps = (manifestFoldChanges[0].addedMappings as any).metadata.properties.builder_fields
      .properties;
    // Sub-fields from the shared manifest cover both types: the shared detection
    // fragment (risk_score, max_signals, note, setup, query) plus threshold-only
    // fields (threshold.value, etc.).
    expect(bfProps).toHaveProperty('risk_score');
    expect(bfProps).toHaveProperty('max_signals');
    expect(bfProps).toHaveProperty('note');
    expect(bfProps).toHaveProperty('setup');
    expect(bfProps).toHaveProperty('query');
    // Threshold-specific sub-field: the manifest merges both types' leaves.
    expect(bfProps).toHaveProperty(['threshold.value']);
  });

  it('dense version sequence runs from 1 to 10 with no gaps', () => {
    // The POC's five model versions ('10'–'14') were squashed into a single '10'
    // to satisfy the saved-objects checker's one-new-version-per-PR rule.
    const keys = Object.keys(ruleModelVersions)
      .map(Number)
      .sort((a, b) => a - b);
    expect(keys).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});

// ---------------------------------------------------------------------------
// 3. Static mapping assembly (step B.4)
//
// The static mapping now comes from detectionRuleBuilderFieldsManifest.currentMappings
// rather than from an accumulation over every version (assembleBuilderFieldsMappings
// was removed in step B.4). The currentMappings object carries all 32 leaf paths.
// The rule_mappings.test.ts file carries the comprehensive 32-leaf assertion;
// here we only verify representative leaves and the total count.
// ---------------------------------------------------------------------------

describe('detectionRuleBuilderFieldsManifest.currentMappings (step B.4)', () => {
  const { currentMappings } = detectionRuleBuilderFieldsManifest;

  it('contains exactly 32 distinct leaf paths', () => {
    expect(Object.keys(currentMappings)).toHaveLength(32);
  });

  it('includes risk_score as integer (common fragment)', () => {
    expect(currentMappings).toHaveProperty('risk_score', { type: 'integer' });
  });

  it('includes note as text (common fragment)', () => {
    expect(currentMappings).toHaveProperty('note', { type: 'text' });
  });

  it('includes query as text (declared by both types — merges silently)', () => {
    expect(currentMappings).toHaveProperty('query', { type: 'text' });
  });

  it('includes threshold.value as integer (threshold-only)', () => {
    // Use array notation because the key contains a dot and toHaveProperty('a.b')
    // navigates nested objects rather than looking up the literal key 'a.b'.
    expect(currentMappings).toHaveProperty(['threshold.value'], { type: 'integer' });
  });
});
