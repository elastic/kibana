/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LlmFeature } from '../../features/tool';
import { buildStatsGuidance } from './stats_guidance';

const makeFeature = (overrides: Partial<LlmFeature> & { type: string }): LlmFeature => ({
  title: 'Test Feature',
  description: 'test',
  confidence: 0.9,
  properties: {},
  evidence: [],
  tags: [],
  meta: {},
  filter: undefined,
  ...overrides,
});

const makeDatasetFeature = (analysis: string): LlmFeature =>
  makeFeature({
    type: 'dataset_analysis',
    properties: { analysis },
  });

const makeDatasetAnalysis = (
  fields: Record<string, string[]>,
  opts?: { total?: number; sampled?: number }
): LlmFeature =>
  makeFeature({
    type: 'dataset_analysis',
    properties: {
      analysis: { total: opts?.total ?? 1000, sampled: opts?.sampled ?? 500, fields },
    },
  });

describe('buildStatsGuidance', () => {
  it('returns null when no dataset_analysis feature is present', () => {
    const features = [makeFeature({ type: 'entity' })];
    expect(buildStatsGuidance(features)).toBeNull();
  });

  it('returns null when dataset_analysis has empty analysis', () => {
    const features = [makeDatasetFeature('')];
    expect(buildStatsGuidance(features)).toBeNull();
  });

  it('returns null when no field-specific patterns apply', () => {
    const features = [makeDatasetFeature('This dataset has only generic text with no known fields.')];
    expect(buildStatsGuidance(features)).toBeNull();
  });

  it('returns guidance when severity field (log.level) is detected', () => {
    const features = [
      makeDatasetFeature(
        'Fields include log.level with ERROR at approximately 3% of total records.'
      ),
    ];
    const result = buildStatsGuidance(features);
    expect(result).not.toBeNull();
    expect(result).toContain('STATS QUERY GUIDANCE');
    expect(result).toContain('Service Error Rate Degradation');
    expect(result).toContain('log.level');
  });

  it('uses extracted error percentage when present', () => {
    const features = [
      makeDatasetFeature('log.level field shows error 8% of requests fail with errors.'),
    ];
    const result = buildStatsGuidance(features);
    expect(result).not.toBeNull();
    expect(result).toContain('Extracted baseline');
    expect(result).toContain('8%');
  });

  it('uses default baseline when extraction fails', () => {
    const features = [makeDatasetFeature('log.level is present but no percentage is mentioned.')];
    const result = buildStatsGuidance(features);
    expect(result).not.toBeNull();
    expect(result).toContain('default assumption of 5%');
  });

  it('returns HTTP error rate guidance when http.response.status_code is detected', () => {
    const features = [
      makeDatasetFeature('http.response.status_code field present in data, error 2% are 5xx.'),
    ];
    const result = buildStatsGuidance(features);
    expect(result).not.toBeNull();
    expect(result).toContain('HTTP Error Rate');
    expect(result).toContain('http.response.status_code');
  });

  it('returns latency degradation pattern when event.duration is detected', () => {
    const features = [makeDatasetFeature('Fields include event.duration measured in nanoseconds.')];
    const result = buildStatsGuidance(features);
    expect(result).not.toBeNull();
    expect(result).toContain('Latency Degradation');
    expect(result).toContain('event.duration');
  });

  it('includes component degradation pattern when entity field has low cardinality', () => {
    const features = [
      makeDatasetFeature(
        'log.level field present with error 5% errors. service.name has 10 distinct values.'
      ),
      makeFeature({
        type: 'entity',
        properties: { field: 'service.name' },
      }),
    ];
    const result = buildStatsGuidance(features);
    expect(result).not.toBeNull();
    expect(result).toContain('Component-Level Degradation');
    expect(result).toContain('service.name');
    expect(result).toContain('10 distinct values');
  });

  it('skips entity field when cardinality exceeds MAX_ENTITY_CARDINALITY', () => {
    const features = [
      makeDatasetFeature(
        'log.level is present. host.name has 100 distinct values.'
      ),
      makeFeature({
        type: 'entity',
        properties: { field: 'host.name' },
      }),
    ];
    const result = buildStatsGuidance(features);
    expect(result).not.toBeNull();
    expect(result).not.toContain('Component-Level Degradation');
  });

  it('skips component-degradation pattern when entity cardinality is unknown', () => {
    const features = [
      makeDatasetFeature('log.level is present with error 5% errors. service.name field present.'),
      makeFeature({
        type: 'entity',
        properties: { field: 'service.name' },
      }),
    ];
    const result = buildStatsGuidance(features);
    expect(result).not.toBeNull();
    expect(result).not.toContain('Component-Level Degradation');
  });

  it('includes generic patterns (traffic spike/drop) alongside field-specific', () => {
    const features = [makeDatasetFeature('log.level is present with error rate of 3%.')];
    const result = buildStatsGuidance(features);
    expect(result).not.toBeNull();
    expect(result).toContain('Traffic Drop');
    expect(result).toContain('Abnormal Traffic Spike');
  });

  it('includes log pattern context when error patterns are found', () => {
    const features = [
      makeDatasetFeature('log.level is present with error 5% errors.'),
      makeFeature({
        type: 'log_patterns',
        properties: { pattern: 'Connection refused to database host' },
      }),
    ];
    const result = buildStatsGuidance(features);
    expect(result).not.toBeNull();
    expect(result).toContain('LOG PATTERN CONTEXT');
    expect(result).toContain('Connection refused');
  });

  it('does not include log pattern context when no error keywords match', () => {
    const features = [
      makeDatasetFeature('log.level is present with error 5% errors.'),
      makeFeature({
        type: 'log_patterns',
        properties: { pattern: 'Request processed successfully' },
      }),
    ];
    const result = buildStatsGuidance(features);
    expect(result).not.toBeNull();
    expect(result).not.toContain('LOG PATTERN CONTEXT');
  });

  describe('FormattedDocumentAnalysis (object) shape', () => {
    it('returns guidance when log.level is a field key', () => {
      const features = [
        makeDatasetAnalysis({
          'log.level (keyword)': ['ERROR (15%)', 'INFO (60%)', 'WARN (25%)'],
        }),
      ];
      const result = buildStatsGuidance(features);
      expect(result).not.toBeNull();
      expect(result).toContain('Service Error Rate Degradation');
      expect(result).toContain('log.level');
    });

    it('extracts error percentage from field distribution values', () => {
      const features = [
        makeDatasetAnalysis({
          'log.level (keyword)': ['ERROR (8%)', 'INFO (72%)', 'WARN (20%)'],
        }),
      ];
      const result = buildStatsGuidance(features);
      expect(result).not.toBeNull();
      expect(result).toContain('Extracted baseline');
      expect(result).toContain('8%');
    });

    it('returns HTTP error rate guidance from object analysis', () => {
      const features = [
        makeDatasetAnalysis({
          'http.response.status_code (long)': [
            '200 (80%)',
            '404 (10%)',
            '500 (5%)',
            '... (+3 more)',
          ],
        }),
      ];
      const result = buildStatsGuidance(features);
      expect(result).not.toBeNull();
      expect(result).toContain('HTTP Error Rate');
      expect(result).toContain('http.response.status_code');
    });

    it('returns latency guidance when event.duration is a field key', () => {
      const features = [
        makeDatasetAnalysis({
          'event.duration (long)': ['152340000 (20%)', '... (+50 more)'],
        }),
      ];
      const result = buildStatsGuidance(features);
      expect(result).not.toBeNull();
      expect(result).toContain('Latency Degradation');
      expect(result).toContain('event.duration');
    });

    it('extracts entity cardinality from value distribution', () => {
      const features = [
        makeDatasetAnalysis({
          'log.level (keyword)': ['ERROR (5%)', 'INFO (80%)', 'WARN (15%)'],
          'service.name (keyword)': [
            'api-gateway (40%)',
            'checkout-svc (35%)',
            '... (+3 more)',
          ],
        }),
        makeFeature({
          type: 'entity',
          properties: { field: 'service.name' },
        }),
      ];
      const result = buildStatsGuidance(features);
      expect(result).not.toBeNull();
      expect(result).toContain('Component-Level Degradation');
      expect(result).toContain('service.name');
      expect(result).toContain('5 distinct values');
    });

    it('skips component degradation when entity cardinality exceeds limit', () => {
      const features = [
        makeDatasetAnalysis({
          'log.level (keyword)': ['ERROR (5%)', 'INFO (80%)', 'WARN (15%)'],
          'host.name (keyword)': ['host-1 (2%)', '... (+100 more)'],
        }),
        makeFeature({
          type: 'entity',
          properties: { field: 'host.name' },
        }),
      ];
      const result = buildStatsGuidance(features);
      expect(result).not.toBeNull();
      expect(result).not.toContain('Component-Level Degradation');
    });

    it('returns null when no field-specific fields are present in object analysis', () => {
      const features = [
        makeDatasetAnalysis({
          'message (text)': ['Starting server... (20%)', 'Request handled (80%)'],
          '@timestamp (date)': [],
        }),
      ];
      expect(buildStatsGuidance(features)).toBeNull();
    });

    it('excludes (no value) entries from entity cardinality count', () => {
      const features = [
        makeDatasetAnalysis({
          'log.level (keyword)': ['ERROR (10%)', 'INFO (90%)'],
          'service.name (keyword)': [
            'api-svc (50%)',
            'web-svc (30%)',
            '(no value) (20%)',
          ],
        }),
        makeFeature({
          type: 'entity',
          properties: { field: 'service.name' },
        }),
      ];
      const result = buildStatsGuidance(features);
      expect(result).not.toBeNull();
      expect(result).toContain('Component-Level Degradation');
      expect(result).toContain('2 distinct values');
    });

    it('combines multiple field-specific patterns from a single analysis object', () => {
      const features = [
        makeDatasetAnalysis({
          'log.level (keyword)': ['ERROR (3%)', 'INFO (90%)', 'WARN (7%)'],
          'http.response.status_code (long)': ['200 (85%)', '500 (2%)', '... (+5 more)'],
          'event.duration (long)': ['50000000 (40%)', '... (+20 more)'],
        }),
      ];
      const result = buildStatsGuidance(features);
      expect(result).not.toBeNull();
      expect(result).toContain('Service Error Rate Degradation');
      expect(result).toContain('HTTP Error Rate');
      expect(result).toContain('Latency Degradation');
      expect(result).toContain('Traffic Drop');
      expect(result).toContain('Abnormal Traffic Spike');
    });
  });
});
