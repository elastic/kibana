/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  calculateSchemaComplianceRate,
  calculateEvidenceGroundingRate,
  calculateConfidenceCalibrationScore,
  calculateDeduplicationScore,
  calculatePropertiesUsageScore,
  calculateOverallQuality,
  validateFeatureSchema,
  validateTypeSpecificRequirements,
  formatMetricsSummary,
  type ExtractedFeature,
} from './features_identification_metrics';

describe('features_identification_metrics', () => {
  // =============================================================================
  // TEST FIXTURES
  // =============================================================================

  /**
   * Valid feature with all required fields and proper structure.
   */
  const validFeature: ExtractedFeature = {
    id: 'go-runtime',
    type: 'technology',
    subtype: 'programming_language',
    description: 'Go programming language runtime',
    properties: {
      language: 'Go',
      version: '1.22.1',
    },
    confidence: 95,
    evidence: ['runtime: Go go1.22.1', 'arch=linux/amd64'],
    tags: ['explicit'],
    meta: {
      build_id: '9f2c1a7',
    },
  };

  /**
   * Sample documents representing log entries.
   */
  const sampleDocuments: Array<Record<string, unknown>> = [
    {
      '@timestamp': '2026-01-12T10:00:00.001Z',
      message:
        'checkout-api v4.8.0 initializing... runtime: Go go1.22.1 arch=linux/amd64 build=9f2c1a7',
      'service.name': 'checkout-api',
      'log.level': 'INFO',
    },
    {
      '@timestamp': '2026-01-12T10:00:00.090Z',
      message: 'system info: Ubuntu 22.04.3 LTS (Jammy Jellyfish) kernel 5.15.0-89',
      'service.name': 'checkout-api',
      'log.level': 'INFO',
    },
    {
      '@timestamp': '2026-01-12T10:00:00.215Z',
      message: 'db connection OK: PostgreSQL 16.1 on x86_64-pc-linux-gnu',
      'service.name': 'checkout-api',
      'cloud.provider': 'aws',
    },
  ];

  // =============================================================================
  // SCHEMA COMPLIANCE TESTS
  // =============================================================================

  describe('validateFeatureSchema', () => {
    it('validates a correctly structured feature', () => {
      const result = validateFeatureSchema(validFeature);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects feature missing required id', () => {
      const feature = { ...validFeature, id: '' };
      const result = validateFeatureSchema(feature);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing or invalid id field');
    });

    it('rejects feature with invalid type', () => {
      const feature = { ...validFeature, type: 'invalid_type' };
      const result = validateFeatureSchema(feature);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Invalid type'))).toBe(true);
    });

    it('rejects feature with confidence out of range', () => {
      const feature = { ...validFeature, confidence: 150 };
      const result = validateFeatureSchema(feature);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('out of range'))).toBe(true);
    });

    it('rejects feature with insufficient evidence', () => {
      const feature = { ...validFeature, evidence: ['single evidence'] };
      const result = validateFeatureSchema(feature);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Insufficient evidence'))).toBe(true);
    });

    it('rejects feature with too much evidence', () => {
      const feature = {
        ...validFeature,
        evidence: ['e1', 'e2', 'e3', 'e4', 'e5', 'e6'],
      };
      const result = validateFeatureSchema(feature);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('Too much evidence'))).toBe(true);
    });

    it('validates subtype snake_case format', () => {
      const feature = { ...validFeature, subtype: 'InvalidSubtype' };
      const result = validateFeatureSchema(feature);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('snake_case'))).toBe(true);
    });
  });

  describe('calculateSchemaComplianceRate', () => {
    it('returns 1.0 for all valid features', () => {
      const features = [validFeature, { ...validFeature, id: 'feature-2' }];
      const { rate, issues } = calculateSchemaComplianceRate(features);
      expect(rate).toBe(1.0);
      expect(issues).toHaveLength(0);
    });

    it('returns 0.5 when half the features are invalid', () => {
      const invalidFeature = { ...validFeature, id: '', type: '' };
      const features = [validFeature, invalidFeature];
      const { rate } = calculateSchemaComplianceRate(features);
      expect(rate).toBe(0.5);
    });

    it('returns 1.0 for empty feature array', () => {
      const { rate, issues } = calculateSchemaComplianceRate([]);
      expect(rate).toBe(1.0);
      expect(issues).toHaveLength(0);
    });
  });

  // =============================================================================
  // EVIDENCE GROUNDING TESTS
  // =============================================================================

  describe('calculateEvidenceGroundingRate', () => {
    it('returns 1.0 when all evidence is grounded in logs', () => {
      const features: ExtractedFeature[] = [
        {
          ...validFeature,
          evidence: ['runtime: Go go1.22.1', 'arch=linux/amd64'],
        },
      ];
      const { rate } = calculateEvidenceGroundingRate(features, sampleDocuments);
      expect(rate).toBe(1.0);
    });

    it('detects fabricated evidence not in logs', () => {
      const features: ExtractedFeature[] = [
        {
          ...validFeature,
          evidence: ['fabricated evidence not in logs', 'another fake evidence'],
        },
      ];
      const { rate, issues } = calculateEvidenceGroundingRate(features, sampleDocuments);
      expect(rate).toBe(0);
      expect(issues.some((i) => i.includes('Ungrounded evidence'))).toBe(true);
    });

    it('validates field.path=value format evidence', () => {
      // Documents have 'cloud.provider' as a top-level key (not nested object)
      const docs = [
        { 'cloud.provider': 'aws', 'service.name': 'checkout-api', message: 'test message' },
      ];
      const features: ExtractedFeature[] = [
        {
          ...validFeature,
          evidence: ['cloud.provider=aws', 'service.name=checkout-api'],
        },
      ];
      const { rate } = calculateEvidenceGroundingRate(features, docs);
      expect(rate).toBe(1.0);
    });

    it('returns 1.0 for empty features array', () => {
      const { rate } = calculateEvidenceGroundingRate([], sampleDocuments);
      expect(rate).toBe(1.0);
    });
  });

  // =============================================================================
  // CONFIDENCE CALIBRATION TESTS
  // =============================================================================

  describe('calculateConfidenceCalibrationScore', () => {
    it('passes for high confidence feature with explicit evidence', () => {
      const features: ExtractedFeature[] = [
        {
          ...validFeature,
          confidence: 95,
          tags: ['explicit'],
        },
      ];
      const { score } = calculateConfidenceCalibrationScore(features);
      expect(score).toBe(1.0);
    });

    it('fails for inferred feature with confidence > 79', () => {
      const features: ExtractedFeature[] = [
        {
          ...validFeature,
          confidence: 85,
          tags: ['inferred'],
          meta: { notes: 'Inferred from patterns' },
        },
      ];
      const { score, issues } = calculateConfidenceCalibrationScore(features);
      expect(score).toBe(0);
      expect(issues.some((i) => i.includes('should be ≤ 79'))).toBe(true);
    });

    it('fails for inferred feature missing meta.notes', () => {
      const features: ExtractedFeature[] = [
        {
          ...validFeature,
          confidence: 60,
          tags: ['inferred'],
          meta: {},
        },
      ];
      const { score, issues } = calculateConfidenceCalibrationScore(features);
      expect(score).toBe(0);
      expect(issues.some((i) => i.includes('missing meta.notes'))).toBe(true);
    });

    it('fails for weak confidence without inferred tag', () => {
      const features: ExtractedFeature[] = [
        {
          ...validFeature,
          confidence: 40,
          tags: [],
        },
      ];
      const { score, issues } = calculateConfidenceCalibrationScore(features);
      expect(score).toBe(0);
      expect(issues.some((i) => i.includes('not tagged as inferred'))).toBe(true);
    });

    it('passes for properly calibrated inferred feature', () => {
      const features: ExtractedFeature[] = [
        {
          ...validFeature,
          confidence: 65,
          tags: ['inferred'],
          meta: { notes: 'Inferred from client library patterns' },
        },
      ];
      const { score } = calculateConfidenceCalibrationScore(features);
      expect(score).toBe(1.0);
    });
  });

  // =============================================================================
  // DEDUPLICATION TESTS
  // =============================================================================

  describe('calculateDeduplicationScore', () => {
    it('returns 1.0 for unique features', () => {
      const features: ExtractedFeature[] = [
        validFeature,
        {
          ...validFeature,
          id: 'postgres-db',
          type: 'technology',
          subtype: 'database',
          properties: { database: 'PostgreSQL', version: '16.1' },
        },
      ];
      const { score, issues } = calculateDeduplicationScore(features);
      expect(score).toBe(1.0);
      expect(issues).toHaveLength(0);
    });

    it('detects duplicate features with same type/subtype/properties', () => {
      const features: ExtractedFeature[] = [
        validFeature,
        {
          ...validFeature,
          id: 'go-runtime-duplicate',
          // Same type, subtype, and properties
        },
      ];
      const { score, issues } = calculateDeduplicationScore(features);
      expect(score).toBeLessThan(1.0);
      expect(issues.some((i) => i.includes('Duplicate features'))).toBe(true);
    });

    it('returns 1.0 for single feature', () => {
      const { score } = calculateDeduplicationScore([validFeature]);
      expect(score).toBe(1.0);
    });

    it('returns 1.0 for empty array', () => {
      const { score } = calculateDeduplicationScore([]);
      expect(score).toBe(1.0);
    });
  });

  // =============================================================================
  // PROPERTIES USAGE TESTS
  // =============================================================================

  describe('calculatePropertiesUsageScore', () => {
    it('returns 1.0 for properties without high-cardinality data', () => {
      const features: ExtractedFeature[] = [
        {
          ...validFeature,
          properties: {
            language: 'Go',
            version: '1.22.1',
          },
        },
      ];
      const { score } = calculatePropertiesUsageScore(features);
      expect(score).toBe(1.0);
    });

    it('penalizes IP addresses in properties', () => {
      const features: ExtractedFeature[] = [
        {
          ...validFeature,
          properties: {
            language: 'Go',
            ip: '192.168.1.1',
          },
        },
      ];
      const { score, issues } = calculatePropertiesUsageScore(features);
      expect(score).toBeLessThan(1.0);
      expect(issues.some((i) => i.includes('high-cardinality'))).toBe(true);
    });

    it('penalizes UUIDs in properties', () => {
      const features: ExtractedFeature[] = [
        {
          ...validFeature,
          properties: {
            language: 'Go',
            instance_id: '550e8400-e29b-41d4-a716-446655440000',
          },
        },
      ];
      const { score } = calculatePropertiesUsageScore(features);
      expect(score).toBeLessThan(1.0);
    });

    it('penalizes pod names in properties', () => {
      const features: ExtractedFeature[] = [
        {
          ...validFeature,
          properties: {
            language: 'Go',
            pod_name: 'checkout-api-79c64f4c9d-2j9bz',
          },
        },
      ];
      const { score } = calculatePropertiesUsageScore(features);
      expect(score).toBeLessThan(1.0);
    });
  });

  // =============================================================================
  // TYPE-SPECIFIC VALIDATION TESTS
  // =============================================================================

  describe('validateTypeSpecificRequirements', () => {
    it('validates infrastructure cloud_deployment requires provider', () => {
      const feature: ExtractedFeature = {
        ...validFeature,
        type: 'infrastructure',
        subtype: 'cloud_deployment',
        properties: {},
      };
      const { valid, issues } = validateTypeSpecificRequirements(feature);
      expect(valid).toBe(false);
      expect(issues.some((i) => i.includes('provider'))).toBe(true);
    });

    it('validates technology database requires database property', () => {
      const feature: ExtractedFeature = {
        ...validFeature,
        type: 'technology',
        subtype: 'database',
        properties: {},
      };
      const { valid, issues } = validateTypeSpecificRequirements(feature);
      expect(valid).toBe(false);
      expect(issues.some((i) => i.includes('database'))).toBe(true);
    });

    it('validates dependency requires source and target', () => {
      const feature: ExtractedFeature = {
        ...validFeature,
        type: 'dependency',
        subtype: 'service_dependency',
        properties: {},
      };
      const { valid, issues } = validateTypeSpecificRequirements(feature);
      expect(valid).toBe(false);
      expect(issues.some((i) => i.includes('source'))).toBe(true);
      expect(issues.some((i) => i.includes('target'))).toBe(true);
    });

    it('validates version format (numeric only)', () => {
      const feature: ExtractedFeature = {
        ...validFeature,
        properties: {
          language: 'Go',
          version: '1.22.1-beta',
        },
      };
      const { valid, issues } = validateTypeSpecificRequirements(feature);
      expect(valid).toBe(false);
      expect(issues.some((i) => i.includes('raw_version'))).toBe(true);
    });

    it('passes version validation when raw_version is in meta', () => {
      const feature: ExtractedFeature = {
        ...validFeature,
        properties: {
          language: 'Go',
          version: '1.22.1-beta',
        },
        meta: {
          raw_version: '1.22.1-beta',
        },
      };
      const { valid } = validateTypeSpecificRequirements(feature);
      expect(valid).toBe(true);
    });
  });

  // =============================================================================
  // OVERALL QUALITY TESTS
  // =============================================================================

  describe('calculateOverallQuality', () => {
    it('returns high quality score for well-formed features', () => {
      const features: ExtractedFeature[] = [validFeature];
      const metrics = calculateOverallQuality(features, sampleDocuments);

      expect(metrics.overallQuality).toBeGreaterThan(0.7);
      expect(metrics.schemaComplianceRate).toBe(1.0);
      expect(metrics.deduplicationScore).toBe(1.0);
    });

    it('returns 1.0 for empty features (valid edge case)', () => {
      const metrics = calculateOverallQuality([], sampleDocuments);

      expect(metrics.overallQuality).toBe(1.0);
      expect(metrics.issues).toHaveLength(0);
    });

    it('combines issues from all validators', () => {
      const badFeature: ExtractedFeature = {
        id: '',
        type: 'invalid',
        description: '',
        properties: {
          ip: '192.168.1.1',
        },
        confidence: 150,
        evidence: ['fabricated'],
        tags: [],
      };
      const metrics = calculateOverallQuality([badFeature], sampleDocuments);

      // Should have low quality due to multiple violations
      expect(metrics.overallQuality).toBeLessThanOrEqual(0.5);
      expect(metrics.issues.length).toBeGreaterThan(0);
      // Should have schema compliance issues
      expect(metrics.schemaComplianceRate).toBeLessThan(1.0);
    });
  });

  // =============================================================================
  // FORMAT METRICS SUMMARY TESTS
  // =============================================================================

  describe('formatMetricsSummary', () => {
    it('formats metrics as human-readable summary', () => {
      const metrics = calculateOverallQuality([validFeature], sampleDocuments);
      const summary = formatMetricsSummary(metrics);

      expect(summary).toContain('Overall Quality:');
      expect(summary).toContain('Schema Compliance:');
      expect(summary).toContain('Evidence Grounding:');
      expect(summary).toContain('Confidence Calibration:');
      expect(summary).toContain('Deduplication:');
      expect(summary).toContain('Properties Usage:');
    });

    it('includes issues in summary when present', () => {
      const badFeature: ExtractedFeature = {
        ...validFeature,
        confidence: 150, // Invalid
      };
      const metrics = calculateOverallQuality([badFeature], sampleDocuments);
      const summary = formatMetricsSummary(metrics);

      expect(summary).toContain('Issues');
    });
  });

  // =============================================================================
  // DATASET-SPECIFIC TESTS
  // =============================================================================

  describe('dataset type validation', () => {
    /**
     * Test that obvious evidence datasets should produce high scores.
     */
    it('obvious evidence: high confidence features should score well', () => {
      const obviousFeatures: ExtractedFeature[] = [
        {
          id: 'go-runtime',
          type: 'technology',
          subtype: 'programming_language',
          description: 'Go programming language',
          properties: { language: 'Go', version: '1.22.1' },
          confidence: 95,
          evidence: ['runtime: Go go1.22.1', 'arch=linux/amd64'],
          tags: ['explicit'],
        },
        {
          id: 'postgres-db',
          type: 'technology',
          subtype: 'database',
          description: 'PostgreSQL database',
          properties: { database: 'PostgreSQL', version: '16.1' },
          confidence: 95,
          evidence: ['PostgreSQL 16.1', 'db connection OK'],
          tags: ['explicit'],
        },
      ];

      const metrics = calculateOverallQuality(obviousFeatures, sampleDocuments);
      expect(metrics.schemaComplianceRate).toBeGreaterThanOrEqual(0.9);
      expect(metrics.confidenceCalibrationScore).toBe(1.0);
    });

    /**
     * Test that inference required datasets need moderate confidence.
     */
    it('inference required: inferred features should have moderate confidence', () => {
      const inferredFeatures: ExtractedFeature[] = [
        {
          id: 'python-inferred',
          type: 'technology',
          subtype: 'programming_language',
          description: 'Python inferred from traceback',
          properties: { language: 'Python' },
          confidence: 65,
          evidence: ['Traceback (most recent call last)', 'File "/app/worker.py"'],
          tags: ['inferred'],
          meta: { notes: 'Inferred from Python traceback pattern' },
        },
      ];

      const logDocs = [
        {
          message: 'Traceback (most recent call last): File "/app/worker.py", line 88, in run',
        },
      ];

      const metrics = calculateOverallQuality(inferredFeatures, logDocs);
      expect(metrics.confidenceCalibrationScore).toBe(1.0);
    });

    /**
     * Test that ambiguous evidence should produce few/zero features.
     */
    it('ambiguous evidence: empty features is valid (restraint)', () => {
      // For ambiguous logs, producing no features is the correct behavior
      const metrics = calculateOverallQuality([], sampleDocuments);
      expect(metrics.overallQuality).toBe(1.0);
    });

    /**
     * Test false positive detection - user content shouldn't create features.
     */
    it('false positives: should not extract from user content context', () => {
      const falsePositiveFeatures: ExtractedFeature[] = [
        {
          id: 'dotnet-actual',
          type: 'technology',
          subtype: 'programming_language',
          description: '.NET runtime (actual infrastructure)',
          properties: { language: '.NET', version: '8.0.2' },
          confidence: 95,
          evidence: ['Starting web-api v2.1.0 (.NET 8.0.2)', 'ASP.NET Core 8 hosting started'],
          tags: ['explicit'],
        },
        // This should NOT be extracted - Redis is in user search query, not infrastructure
      ];

      const falsePositiveLogs = [
        {
          message: 'Starting web-api v2.1.0 (.NET 8.0.2) on host=web-01',
        },
        {
          message: 'search_api query="kubernetes redis mongodb tutorial" user_id=u_8472',
        },
      ];

      const metrics = calculateOverallQuality(falsePositiveFeatures, falsePositiveLogs);
      // The actual .NET feature should score well
      expect(metrics.schemaComplianceRate).toBe(1.0);
    });
  });
});
