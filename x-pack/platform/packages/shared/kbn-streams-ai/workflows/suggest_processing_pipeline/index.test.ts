/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProcessingSimulationResponse, Feature } from '@kbn/streams-schema';
import { getUniqueDocumentErrors } from '.';
import {
  toFeatureForLlmContext,
  getFeatureQueryFromToolArgs,
  resolveFeatureTypeFilters,
  SUGGEST_PIPELINE_FEATURE_TOOL_TYPES,
} from './features_tool';

describe('getUniqueDocumentErrors', () => {
  it('returns empty array when no documents', () => {
    const simulationResult: ProcessingSimulationResponse = {
      documents: [],
      detected_fields: [],
      processors_metrics: {},
      definition_error: undefined,
      documents_metrics: {
        parsed_rate: 1,
        failed_rate: 0,
        partially_parsed_rate: 0,
        skipped_rate: 0,
        dropped_rate: 0,
      },
    };

    const result = getUniqueDocumentErrors(simulationResult);
    expect(result).toEqual([]);
  });

  it('returns empty array when documents have no errors', () => {
    const simulationResult: ProcessingSimulationResponse = {
      documents: [
        {
          value: { field: 'value1' },
          errors: [],
          detected_fields: [],
          status: 'parsed',
          processed_by: [],
        },
        {
          value: { field: 'value2' },
          errors: [],
          detected_fields: [],
          status: 'parsed',
          processed_by: [],
        },
      ],
      detected_fields: [],
      processors_metrics: {},
      definition_error: undefined,
      documents_metrics: {
        parsed_rate: 1,
        failed_rate: 0,
        partially_parsed_rate: 0,
        skipped_rate: 0,
        dropped_rate: 0,
      },
    };

    const result = getUniqueDocumentErrors(simulationResult);
    expect(result).toEqual([]);
  });

  it('returns unique errors with occurrence count', () => {
    const simulationResult: ProcessingSimulationResponse = {
      documents: [
        {
          value: { field: 'value1' },
          errors: [
            {
              type: 'generic_processor_failure',
              message: 'Failed to parse field',
              processor_id: 'proc1',
            },
          ],
          detected_fields: [],
          status: 'failed',
          processed_by: [],
        },
        {
          value: { field: 'value2' },
          errors: [
            {
              type: 'generic_processor_failure',
              message: 'Failed to parse field',
              processor_id: 'proc1',
            },
          ],
          detected_fields: [],
          status: 'failed',
          processed_by: [],
        },
        {
          value: { field: 'value3' },
          errors: [{ type: 'field_mapping_failure', message: 'Invalid format' }],
          detected_fields: [],
          status: 'failed',
          processed_by: [],
        },
      ],
      detected_fields: [],
      processors_metrics: {},
      definition_error: undefined,
      documents_metrics: {
        parsed_rate: 0,
        failed_rate: 1,
        partially_parsed_rate: 0,
        skipped_rate: 0,
        dropped_rate: 0,
      },
    };

    const result = getUniqueDocumentErrors(simulationResult);
    expect(result).toEqual([
      'generic_processor_failure: Failed to parse field (occurred in 2 documents)',
      'field_mapping_failure: Invalid format',
    ]);
  });

  it('limits errors to 5 and shows remaining count', () => {
    const simulationResult: ProcessingSimulationResponse = {
      documents: [
        {
          value: {},
          errors: [
            { type: 'generic_processor_failure', message: 'Error 1', processor_id: 'proc1' },
          ],
          detected_fields: [],
          status: 'failed',
          processed_by: [],
        },
        {
          value: {},
          errors: [
            { type: 'generic_processor_failure', message: 'Error 2', processor_id: 'proc2' },
          ],
          detected_fields: [],
          status: 'failed',
          processed_by: [],
        },
        {
          value: {},
          errors: [
            { type: 'generic_processor_failure', message: 'Error 3', processor_id: 'proc3' },
          ],
          detected_fields: [],
          status: 'failed',
          processed_by: [],
        },
        {
          value: {},
          errors: [
            { type: 'generic_processor_failure', message: 'Error 4', processor_id: 'proc4' },
          ],
          detected_fields: [],
          status: 'failed',
          processed_by: [],
        },
        {
          value: {},
          errors: [
            { type: 'generic_processor_failure', message: 'Error 5', processor_id: 'proc5' },
          ],
          detected_fields: [],
          status: 'failed',
          processed_by: [],
        },
        {
          value: {},
          errors: [
            { type: 'generic_processor_failure', message: 'Error 6', processor_id: 'proc6' },
          ],
          detected_fields: [],
          status: 'failed',
          processed_by: [],
        },
        {
          value: {},
          errors: [
            { type: 'generic_processor_failure', message: 'Error 7', processor_id: 'proc7' },
          ],
          detected_fields: [],
          status: 'failed',
          processed_by: [],
        },
      ],
      detected_fields: [],
      processors_metrics: {},
      definition_error: undefined,
      documents_metrics: {
        parsed_rate: 0,
        failed_rate: 1,
        partially_parsed_rate: 0,
        skipped_rate: 0,
        dropped_rate: 0,
      },
    };

    const result = getUniqueDocumentErrors(simulationResult);
    expect(result.length).toBe(6); // 5 errors + 1 "more errors" message
    expect(result[0]).toBe('generic_processor_failure: Error 1');
    expect(result[1]).toBe('generic_processor_failure: Error 2');
    expect(result[2]).toBe('generic_processor_failure: Error 3');
    expect(result[3]).toBe('generic_processor_failure: Error 4');
    expect(result[4]).toBe('generic_processor_failure: Error 5');
    expect(result[5]).toBe('... and 2 more error(s)');
  });

  it('truncates error messages at 250 characters', () => {
    const longMessage = 'a'.repeat(300);
    const simulationResult: ProcessingSimulationResponse = {
      documents: [
        {
          value: {},
          errors: [
            { type: 'generic_processor_failure', message: longMessage, processor_id: 'proc1' },
          ],
          detected_fields: [],
          status: 'failed',
          processed_by: [],
        },
      ],
      detected_fields: [],
      processors_metrics: {},
      definition_error: undefined,
      documents_metrics: {
        parsed_rate: 0,
        failed_rate: 1,
        partially_parsed_rate: 0,
        skipped_rate: 0,
        dropped_rate: 0,
      },
    };

    const result = getUniqueDocumentErrors(simulationResult);
    expect(result.length).toBe(1);
    expect(result[0].length).toBe(253); // 250 chars + '...'
    expect(result[0].startsWith('generic_processor_failure: ')).toBe(true);
    expect(result[0].endsWith('...')).toBe(true);
  });

  it('truncates error messages with occurrence count included in length check', () => {
    const longMessage = 'a'.repeat(230);
    const simulationResult: ProcessingSimulationResponse = {
      documents: [
        {
          value: {},
          errors: [
            { type: 'generic_processor_failure', message: longMessage, processor_id: 'proc1' },
          ],
          detected_fields: [],
          status: 'failed',
          processed_by: [],
        },
        {
          value: {},
          errors: [
            { type: 'generic_processor_failure', message: longMessage, processor_id: 'proc1' },
          ],
          detected_fields: [],
          status: 'failed',
          processed_by: [],
        },
      ],
      detected_fields: [],
      processors_metrics: {},
      definition_error: undefined,
      documents_metrics: {
        parsed_rate: 0,
        failed_rate: 1,
        partially_parsed_rate: 0,
        skipped_rate: 0,
        dropped_rate: 0,
      },
    };

    const result = getUniqueDocumentErrors(simulationResult);
    expect(result.length).toBe(1);
    // The full error would be: "generic_processor_failure: " + 230 'a's + " (occurred in 2 documents)"
    // which is > 250 chars, so it should be truncated
    expect(result[0].length).toBe(253); // 250 chars + '...'
    expect(result[0].endsWith('...')).toBe(true);
  });

  it('handles documents with multiple errors each', () => {
    const simulationResult: ProcessingSimulationResponse = {
      documents: [
        {
          value: {},
          errors: [
            { type: 'generic_processor_failure', message: 'First error', processor_id: 'proc1' },
            { type: 'generic_processor_failure', message: 'Second error', processor_id: 'proc2' },
          ],
          detected_fields: [],
          status: 'failed',
          processed_by: [],
        },
        {
          value: {},
          errors: [
            { type: 'generic_processor_failure', message: 'First error', processor_id: 'proc1' },
            { type: 'field_mapping_failure', message: 'Third error' },
          ],
          detected_fields: [],
          status: 'failed',
          processed_by: [],
        },
      ],
      detected_fields: [],
      processors_metrics: {},
      definition_error: undefined,
      documents_metrics: {
        parsed_rate: 0.5,
        failed_rate: 0.5,
        partially_parsed_rate: 0,
        skipped_rate: 0,
        dropped_rate: 0,
      },
    };

    const result = getUniqueDocumentErrors(simulationResult);
    expect(result.length).toBe(3);
    expect(result).toContain('generic_processor_failure: First error (occurred in 2 documents)');
    expect(result).toContain('generic_processor_failure: Second error');
    expect(result).toContain('field_mapping_failure: Third error');
  });

  it('handles exact 5 errors without showing "more errors" message', () => {
    const simulationResult: ProcessingSimulationResponse = {
      documents: [
        {
          value: {},
          errors: [
            { type: 'generic_processor_failure', message: 'Error 1', processor_id: 'proc1' },
          ],
          detected_fields: [],
          status: 'failed',
          processed_by: [],
        },
        {
          value: {},
          errors: [
            { type: 'generic_processor_failure', message: 'Error 2', processor_id: 'proc2' },
          ],
          detected_fields: [],
          status: 'failed',
          processed_by: [],
        },
        {
          value: {},
          errors: [
            { type: 'generic_processor_failure', message: 'Error 3', processor_id: 'proc3' },
          ],
          detected_fields: [],
          status: 'failed',
          processed_by: [],
        },
        {
          value: {},
          errors: [
            { type: 'generic_processor_failure', message: 'Error 4', processor_id: 'proc4' },
          ],
          detected_fields: [],
          status: 'failed',
          processed_by: [],
        },
        {
          value: {},
          errors: [
            { type: 'generic_processor_failure', message: 'Error 5', processor_id: 'proc5' },
          ],
          detected_fields: [],
          status: 'failed',
          processed_by: [],
        },
      ],
      detected_fields: [],
      processors_metrics: {},
      definition_error: undefined,
      documents_metrics: {
        parsed_rate: 0,
        failed_rate: 1,
        partially_parsed_rate: 0,
        skipped_rate: 0,
        dropped_rate: 0,
      },
    };

    const result = getUniqueDocumentErrors(simulationResult);
    expect(result.length).toBe(5);
    expect(result[4]).toBe('generic_processor_failure: Error 5');
    // No "more errors" message should be present
  });
});

/**
 * Tests for the feature tool utilities used in suggestProcessingPipeline.
 * The actual workflow function is tested through integration tests,
 * but this verifies the feature serialization and tool argument parsing works correctly.
 */
describe('suggestProcessingPipeline features_tool', () => {
  const sampleFeatures: Feature[] = [
    {
      id: 'feature-1',
      uuid: 'uuid-1',
      stream_name: 'logs',
      type: 'programming_language',
      title: 'Python',
      description: 'Python programming language detected',
      properties: { version: '3.11' },
      confidence: 93,
      evidence: ['import statement', 'traceback format'],
      tags: ['backend', 'scripting'],
      meta: { detected_at: '2024-01-01' },
      status: 'active',
      last_seen: '2024-01-15T00:00:00.000Z',
    },
    {
      id: 'feature-2',
      uuid: 'uuid-2',
      stream_name: 'logs',
      type: 'log_format',
      title: 'JSON Structured',
      description: 'JSON structured logging detected',
      properties: { has_timestamp: true, has_level: true },
      confidence: 98,
      evidence: ['JSON parsing success'],
      tags: ['structured', 'json'],
      meta: {},
      status: 'stale',
      last_seen: '2024-01-14T00:00:00.000Z',
    },
  ];

  describe('toFeatureForLlmContext', () => {
    it('should pick only LLM-relevant fields from a feature', () => {
      const result = toFeatureForLlmContext(sampleFeatures[0]);

      expect(result).toHaveProperty('type', 'programming_language');
      expect(result).toHaveProperty('title', 'Python');
      expect(result).toHaveProperty('description');
      expect(result).toHaveProperty('confidence', 93);
      expect(result).toHaveProperty('properties');
      expect(result).toHaveProperty('evidence');
      expect(result).toHaveProperty('tags');
      expect(result).toHaveProperty('meta');

      expect(result).not.toHaveProperty('id');
      expect(result).not.toHaveProperty('uuid');
      expect(result).not.toHaveProperty('stream_name');
      expect(result).not.toHaveProperty('status');
      expect(result).not.toHaveProperty('last_seen');
      expect(result).not.toHaveProperty('expires_at');
    });

    it('should preserve nested properties objects', () => {
      const featureWithComplexProperties: Feature = {
        id: 'feature-3',
        uuid: 'uuid-3',
        stream_name: 'logs',
        type: 'service',
        title: 'Elasticsearch',
        description: 'Elasticsearch service detected',
        properties: {
          version: '8.x',
          config: {
            cluster_name: 'production',
            nodes: ['node-1', 'node-2'],
          },
        },
        confidence: 88,
        evidence: ['connection logs'],
        tags: ['database', 'search'],
        meta: { indices: ['logs', 'metrics'] },
        status: 'active',
        last_seen: '2024-01-15T00:00:00.000Z',
      };

      const result = toFeatureForLlmContext(featureWithComplexProperties);

      expect(result.properties).toEqual({
        version: '8.x',
        config: {
          cluster_name: 'production',
          nodes: ['node-1', 'node-2'],
        },
      });
    });

    it('should result in valid JSON that can be embedded in tool responses', () => {
      const llmFeatures = sampleFeatures.map(toFeatureForLlmContext);
      const serialized = JSON.stringify(llmFeatures);

      expect(() => JSON.parse(serialized)).not.toThrow();
      expect(serialized).toContain('programming_language');
      expect(serialized).toContain('Python');
    });
  });

  describe('getFeatureQueryFromToolArgs', () => {
    it('should parse valid tool arguments', () => {
      const args = {
        feature_types: ['programming_language', 'log_format'],
        min_confidence: 80,
        limit: 10,
      };

      const result = getFeatureQueryFromToolArgs(args);

      expect(result.featureTypes).toEqual(['programming_language', 'log_format']);
      expect(result.minConfidence).toBe(80);
      expect(result.limit).toBe(10);
    });

    it('should handle empty/missing arguments', () => {
      expect(getFeatureQueryFromToolArgs({})).toEqual({
        featureTypes: undefined,
        minConfidence: undefined,
        limit: undefined,
      });

      expect(getFeatureQueryFromToolArgs(undefined)).toEqual({
        featureTypes: undefined,
        minConfidence: undefined,
        limit: undefined,
      });
    });

    it('should filter out invalid feature types', () => {
      const args = {
        feature_types: ['programming_language', 'invalid_type', 'service', 'another_invalid'],
      };

      const result = getFeatureQueryFromToolArgs(args);

      expect(result.featureTypes).toEqual(['programming_language', 'service']);
    });

    it('should return undefined for feature_types when no valid types remain', () => {
      const args = {
        feature_types: ['invalid_type', 'another_invalid'],
      };

      const result = getFeatureQueryFromToolArgs(args);

      expect(result.featureTypes).toBeUndefined();
    });

    it('should handle invalid min_confidence values', () => {
      expect(getFeatureQueryFromToolArgs({ min_confidence: -10 }).minConfidence).toBeUndefined();
      expect(getFeatureQueryFromToolArgs({ min_confidence: 150 }).minConfidence).toBeUndefined();
      expect(getFeatureQueryFromToolArgs({ min_confidence: 'abc' }).minConfidence).toBeUndefined();
      expect(getFeatureQueryFromToolArgs({ min_confidence: NaN }).minConfidence).toBeUndefined();
    });

    it('should handle invalid limit values', () => {
      expect(getFeatureQueryFromToolArgs({ limit: 0 }).limit).toBeUndefined();
      expect(getFeatureQueryFromToolArgs({ limit: -5 }).limit).toBeUndefined();
      expect(getFeatureQueryFromToolArgs({ limit: 'abc' }).limit).toBeUndefined();
      expect(getFeatureQueryFromToolArgs({ limit: NaN }).limit).toBeUndefined();
    });

    it('should floor decimal limit values', () => {
      expect(getFeatureQueryFromToolArgs({ limit: 5.7 }).limit).toBe(5);
      expect(getFeatureQueryFromToolArgs({ limit: 3.1 }).limit).toBe(3);
    });
  });

  describe('resolveFeatureTypeFilters', () => {
    it('should return undefined for empty or undefined input', () => {
      expect(resolveFeatureTypeFilters(undefined)).toBeUndefined();
      expect(resolveFeatureTypeFilters([])).toBeUndefined();
    });

    it('should deduplicate feature types', () => {
      const result = resolveFeatureTypeFilters(['programming_language', 'programming_language']);
      expect(result).toEqual(['programming_language']);
    });

    it('should pass through valid feature types', () => {
      const result = resolveFeatureTypeFilters(['service', 'log_format']);
      expect(result).toEqual(['service', 'log_format']);
    });
  });

  describe('SUGGEST_PIPELINE_FEATURE_TOOL_TYPES', () => {
    it('should include all expected feature types for pipeline suggestion', () => {
      expect(SUGGEST_PIPELINE_FEATURE_TOOL_TYPES).toContain('infrastructure');
      expect(SUGGEST_PIPELINE_FEATURE_TOOL_TYPES).toContain('technology');
      expect(SUGGEST_PIPELINE_FEATURE_TOOL_TYPES).toContain('dependency');
      expect(SUGGEST_PIPELINE_FEATURE_TOOL_TYPES).toContain('entity');
      expect(SUGGEST_PIPELINE_FEATURE_TOOL_TYPES).toContain('schema');
      expect(SUGGEST_PIPELINE_FEATURE_TOOL_TYPES).toContain('log_format');
      expect(SUGGEST_PIPELINE_FEATURE_TOOL_TYPES).toContain('programming_language');
      expect(SUGGEST_PIPELINE_FEATURE_TOOL_TYPES).toContain('service');
    });

    it('should include computed feature types', () => {
      expect(SUGGEST_PIPELINE_FEATURE_TOOL_TYPES).toContain('dataset_analysis');
      expect(SUGGEST_PIPELINE_FEATURE_TOOL_TYPES).toContain('log_samples');
      expect(SUGGEST_PIPELINE_FEATURE_TOOL_TYPES).toContain('log_patterns');
      expect(SUGGEST_PIPELINE_FEATURE_TOOL_TYPES).toContain('error_logs');
    });
  });
});
