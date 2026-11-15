/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  mergeBuilderFieldMappings,
  KEYWORD_SUB_FIELD_IGNORE_ABOVE,
} from '@kbn/alerting-v2-rule-builders';
import {
  commonDetectionRuleBuilderFieldMappings,
  queryDetectionRuleBuilderFieldMappings,
  thresholdDetectionRuleBuilderFieldMappings,
  detectionRuleBuilderFieldMappings,
} from './mappings';
import { detectionRuleBuilderFieldsManifest } from './manifests/detection_rule_builder_fields';

// ---------------------------------------------------------------------------
// Leaf count
// ---------------------------------------------------------------------------

describe('detectionRuleBuilderFieldMappings', () => {
  it('contains exactly 32 leaf paths', () => {
    expect(Object.keys(detectionRuleBuilderFieldMappings)).toHaveLength(32);
  });

  it('common mappings contribute 25 leaves', () => {
    expect(Object.keys(commonDetectionRuleBuilderFieldMappings)).toHaveLength(25);
  });

  it('query mappings contribute 3 leaves (index, query, language)', () => {
    expect(Object.keys(queryDetectionRuleBuilderFieldMappings)).toHaveLength(3);
    expect(queryDetectionRuleBuilderFieldMappings).toHaveProperty('index');
    expect(queryDetectionRuleBuilderFieldMappings).toHaveProperty('query');
    expect(queryDetectionRuleBuilderFieldMappings).toHaveProperty('language');
  });

  it('threshold mappings contribute 7 leaves (3 shared + 4 threshold-specific)', () => {
    expect(Object.keys(thresholdDetectionRuleBuilderFieldMappings)).toHaveLength(7);
  });

  it('merged mapping deduplicates the 3 shared leaves (index, query, language)', () => {
    // query and threshold each declare index, query, language identically — they merge to one.
    const merged = mergeBuilderFieldMappings(
      queryDetectionRuleBuilderFieldMappings,
      thresholdDetectionRuleBuilderFieldMappings
    );
    // 3 shared + 4 threshold-specific = 7 (not 3+7=10)
    expect(Object.keys(merged)).toHaveLength(7);
  });
});

// ---------------------------------------------------------------------------
// Sub-field types
// ---------------------------------------------------------------------------

describe('sub-field types', () => {
  it('note, setup, and query are the only text leaves', () => {
    const textLeaves = Object.entries(detectionRuleBuilderFieldMappings)
      .filter(([, mapping]) => mapping.type === 'text')
      .map(([path]) => path);
    expect(textLeaves.sort()).toEqual(['note', 'query', 'setup']);
  });

  it('every keyword leaf carries ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE (8191)', () => {
    expect(KEYWORD_SUB_FIELD_IGNORE_ABOVE).toBe(8191);
    for (const [path, mapping] of Object.entries(detectionRuleBuilderFieldMappings)) {
      if (mapping.type === 'keyword') {
        expect({
          path,
          ignore_above: (mapping as { type: 'keyword'; ignore_above: number }).ignore_above,
        }).toEqual({ path, ignore_above: KEYWORD_SUB_FIELD_IGNORE_ABOVE });
      }
    }
  });

  it('risk_score, max_signals, threshold.value, threshold.cardinality.value are integer', () => {
    const intLeaves = [
      'risk_score',
      'max_signals',
      'threshold.value',
      'threshold.cardinality.value',
    ];
    for (const leaf of intLeaves) {
      expect(detectionRuleBuilderFieldMappings[leaf]).toEqual({ type: 'integer' });
    }
  });

  it('required_fields.ecs is boolean', () => {
    expect(detectionRuleBuilderFieldMappings['required_fields.ecs']).toEqual({ type: 'boolean' });
  });
});

// ---------------------------------------------------------------------------
// Manifest integrity
// ---------------------------------------------------------------------------

describe('detectionRuleBuilderFieldsManifest', () => {
  it('builderTypes holds exactly the two detection type ids', () => {
    expect(detectionRuleBuilderFieldsManifest.builderTypes.sort()).toEqual([
      'security.detection.query',
      'security.detection.threshold',
    ]);
  });

  it('currentVersion is 1', () => {
    expect(detectionRuleBuilderFieldsManifest.currentVersion).toBe(1);
  });

  it('merging every version addedMappings equals currentMappings exactly', () => {
    const { versions, currentMappings } = detectionRuleBuilderFieldsManifest;
    const allVersionMappings = Object.values(versions).flatMap((v) =>
      v.addedMappings ? [v.addedMappings] : []
    );
    const accumulated = mergeBuilderFieldMappings(...allVersionMappings);
    expect(accumulated).toEqual(currentMappings);
  });

  it('currentMappings equals merging all version addedMappings (bidirectional check)', () => {
    const { versions, currentMappings } = detectionRuleBuilderFieldsManifest;
    const allVersionMappings = Object.values(versions).flatMap((v) =>
      v.addedMappings ? [v.addedMappings] : []
    );
    const accumulated = mergeBuilderFieldMappings(...allVersionMappings);
    // Same key set, same values in both directions.
    expect(Object.keys(accumulated).sort()).toEqual(Object.keys(currentMappings).sort());
    for (const key of Object.keys(currentMappings)) {
      expect(accumulated[key]).toEqual(currentMappings[key]);
    }
  });

  it('version 1 addedMappings has exactly 32 leaves', () => {
    const v1 = detectionRuleBuilderFieldsManifest.versions[1];
    expect(v1.addedMappings).toBeDefined();
    expect(Object.keys(v1.addedMappings!)).toHaveLength(32);
  });

  it('currentMappings has exactly 32 leaves', () => {
    expect(Object.keys(detectionRuleBuilderFieldsManifest.currentMappings)).toHaveLength(32);
  });
});
