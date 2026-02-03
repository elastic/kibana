/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProcessingSimulationResponse, Feature } from '@kbn/streams-schema';
import { omit } from 'lodash';
import { getUniqueDocumentErrors } from '.';

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
 * Tests for the feature serialization logic used in suggestProcessingPipeline.
 * The actual workflow function is tested through integration tests,
 * but this verifies the feature serialization pattern works correctly.
 */
describe('suggestProcessingPipeline feature serialization', () => {
  const sampleFeatures: Feature[] = [
    {
      id: 'feature-1',
      type: 'programming_language',
      name: 'python',
      description: 'Python programming language detected',
      value: { version: '3.11' },
      confidence: 0.93,
      evidence: ['import statement', 'traceback format'],
      tags: ['backend', 'scripting'],
      meta: { detected_at: '2024-01-01' },
      status: 'active',
      last_seen: '2024-01-15T00:00:00.000Z',
    },
    {
      id: 'feature-2',
      type: 'log_format',
      name: 'json-structured',
      description: 'JSON structured logging detected',
      value: { has_timestamp: true, has_level: true },
      confidence: 0.98,
      evidence: ['JSON parsing success'],
      tags: ['structured', 'json'],
      meta: {},
      status: 'stale',
      last_seen: '2024-01-14T00:00:00.000Z',
    },
  ];

  it('should serialize features omitting id, status, last_seen, expires_at, evidence, and meta', () => {
    // This mirrors the serialization pattern used in suggestProcessingPipeline:
    // features: JSON.stringify(features.map((feature) => omit(feature, ['id', 'status', 'last_seen', 'expires_at', 'evidence', 'meta'])))
    const serialized = JSON.stringify(
      sampleFeatures.map((feature) =>
        omit(feature, ['id', 'status', 'last_seen', 'expires_at', 'evidence', 'meta'])
      )
    );

    const parsed = JSON.parse(serialized);

    expect(parsed).toHaveLength(2);

    // Verify first feature - omitted fields should not be present
    expect(parsed[0]).not.toHaveProperty('id');
    expect(parsed[0]).not.toHaveProperty('status');
    expect(parsed[0]).not.toHaveProperty('last_seen');
    expect(parsed[0]).not.toHaveProperty('expires_at');
    expect(parsed[0]).not.toHaveProperty('evidence');
    expect(parsed[0]).not.toHaveProperty('meta');
    // Essential semantic fields should be preserved
    expect(parsed[0]).toHaveProperty('type', 'programming_language');
    expect(parsed[0]).toHaveProperty('name', 'python');
    expect(parsed[0]).toHaveProperty('description');
    expect(parsed[0]).toHaveProperty('value');
    expect(parsed[0]).toHaveProperty('confidence', 0.93);
    expect(parsed[0]).toHaveProperty('tags');

    // Verify second feature
    expect(parsed[1]).not.toHaveProperty('id');
    expect(parsed[1]).not.toHaveProperty('status');
    expect(parsed[1]).not.toHaveProperty('last_seen');
    expect(parsed[1]).not.toHaveProperty('expires_at');
    expect(parsed[1]).not.toHaveProperty('evidence');
    expect(parsed[1]).not.toHaveProperty('meta');
    expect(parsed[1]).toHaveProperty('type', 'log_format');
    expect(parsed[1]).toHaveProperty('name', 'json-structured');
  });

  it('should handle empty features array', () => {
    const emptyFeatures: Feature[] = [];
    const serialized = JSON.stringify(
      emptyFeatures.map((feature) =>
        omit(feature, ['id', 'status', 'last_seen', 'expires_at', 'evidence', 'meta'])
      )
    );

    expect(serialized).toBe('[]');
  });

  it('should preserve nested value objects but omit meta', () => {
    const featureWithComplexValue: Feature[] = [
      {
        id: 'feature-3',
        type: 'service',
        name: 'elasticsearch',
        description: 'Elasticsearch service detected',
        value: {
          version: '8.x',
          config: {
            cluster_name: 'production',
            nodes: ['node-1', 'node-2'],
          },
        },
        confidence: 0.88,
        evidence: ['connection logs'],
        tags: ['database', 'search'],
        meta: { indices: ['logs', 'metrics'] },
        status: 'active',
        last_seen: '2024-01-15T00:00:00.000Z',
      },
    ];

    const serialized = JSON.stringify(
      featureWithComplexValue.map((feature) =>
        omit(feature, ['id', 'status', 'last_seen', 'expires_at', 'evidence', 'meta'])
      )
    );

    const parsed = JSON.parse(serialized);

    expect(parsed[0].value).toEqual({
      version: '8.x',
      config: {
        cluster_name: 'production',
        nodes: ['node-1', 'node-2'],
      },
    });
    // meta should be omitted
    expect(parsed[0]).not.toHaveProperty('meta');
    expect(parsed[0]).not.toHaveProperty('evidence');
  });

  it('should produce JSON that can be used as prompt input', () => {
    const serialized = JSON.stringify(
      sampleFeatures.map((feature) =>
        omit(feature, ['id', 'status', 'last_seen', 'expires_at', 'evidence', 'meta'])
      )
    );

    // The serialized string should be valid JSON
    expect(() => JSON.parse(serialized)).not.toThrow();

    // The serialized string should be embeddable in a prompt template
    const promptContent = `## Features\n${serialized}`;
    expect(promptContent).toContain('## Features');
    expect(promptContent).toContain('programming_language');
    expect(promptContent).toContain('python');
    expect(promptContent).toContain('log_format');
    expect(promptContent).toContain('json-structured');
  });

  it('should preserve all relevant fields for LLM context', () => {
    const serialized = JSON.stringify(
      sampleFeatures.map((feature) =>
        omit(feature, ['id', 'status', 'last_seen', 'expires_at', 'evidence', 'meta'])
      )
    );

    const parsed = JSON.parse(serialized);

    // LLM needs these essential semantic fields to understand the context
    for (const feature of parsed) {
      // These fields help identify what the feature is
      expect(feature).toHaveProperty('type');
      expect(feature).toHaveProperty('name');
      expect(feature).toHaveProperty('description');

      // These fields provide context for pipeline generation
      expect(feature).toHaveProperty('value');
      expect(feature).toHaveProperty('confidence');
      expect(feature).toHaveProperty('tags');

      // Internal/operational data should be omitted
      expect(feature).not.toHaveProperty('evidence');
      expect(feature).not.toHaveProperty('meta');
      expect(feature).not.toHaveProperty('expires_at');
    }
  });
});
