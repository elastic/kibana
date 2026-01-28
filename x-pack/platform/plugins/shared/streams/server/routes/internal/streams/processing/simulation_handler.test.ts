/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  computeSimulationDocDiff,
  SuccessfulPipelineSimulateDocumentResult,
} from './simulation_handler';

/**
 * Creates a mock processor result for testing
 */
const createMockProcessorResult = (
  tag: string,
  source: Record<string, unknown>
): SuccessfulPipelineSimulateDocumentResult['processor_results'][number] => ({
  tag,
  status: 'success' as const,
  doc: {
    _index: 'test',
    _id: '1',
    _source: source,
    _ingest: {
      timestamp: '2024-01-01T00:00:00.000Z',
    },
  },
});

describe('computeSimulationDocDiff', () => {
  describe('detected_fields filtering', () => {
    it('should NOT include a field that is created then deleted in detected_fields', () => {
      // Scenario: Processor 1 adds 'temp_field', Processor 2 removes it
      const base = { existing: 'value' };
      const docResult: SuccessfulPipelineSimulateDocumentResult = {
        processor_results: [
          createMockProcessorResult('processor1', { existing: 'value', temp_field: 'temporary' }),
          createMockProcessorResult('processor2', { existing: 'value' }), // temp_field removed
        ],
      };

      const result = computeSimulationDocDiff(base, docResult, true, []);

      // temp_field should NOT be in detected_fields (not in final output)
      expect(result.detected_fields.map((f) => f.name)).not.toContain('temp_field');
      // but SHOULD be tracked in per_processor_fields for debugging
      expect(result.per_processor_fields.map((f) => f.name)).toContain('temp_field');
      expect(result.per_processor_fields.find((f) => f.name === 'temp_field')?.processor_id).toBe(
        'processor1'
      );
    });

    it('should include a field that is created and kept in detected_fields', () => {
      // Scenario: Processor 1 adds 'new_field', Processor 2 doesn't touch it
      const base = { existing: 'value' };
      const docResult: SuccessfulPipelineSimulateDocumentResult = {
        processor_results: [
          createMockProcessorResult('processor1', { existing: 'value', new_field: 'permanent' }),
          createMockProcessorResult('processor2', {
            existing: 'value',
            new_field: 'permanent',
            another: 'field',
          }),
        ],
      };

      const result = computeSimulationDocDiff(base, docResult, true, []);

      // new_field should be in detected_fields (exists in final output)
      expect(result.detected_fields.map((f) => f.name)).toContain('new_field');
      expect(result.detected_fields.find((f) => f.name === 'new_field')?.processor_id).toBe(
        'processor1'
      );
      // another should also be in detected_fields
      expect(result.detected_fields.map((f) => f.name)).toContain('another');
    });

    it('should NOT include a field that is modified then deleted in detected_fields', () => {
      // Scenario: Processor 1 modifies existing field, Processor 2 deletes it
      const base = { to_be_deleted: 'original' };
      const docResult: SuccessfulPipelineSimulateDocumentResult = {
        processor_results: [
          createMockProcessorResult('processor1', { to_be_deleted: 'modified' }),
          createMockProcessorResult('processor2', {}), // to_be_deleted removed
        ],
      };

      const result = computeSimulationDocDiff(base, docResult, true, []);

      // to_be_deleted should NOT be in detected_fields (not in final output)
      expect(result.detected_fields.map((f) => f.name)).not.toContain('to_be_deleted');
      // but SHOULD be tracked in per_processor_fields for debugging
      expect(result.per_processor_fields.map((f) => f.name)).toContain('to_be_deleted');
    });

    it('should include a field that is created, modified, and kept', () => {
      // Scenario: Processor 1 adds field, Processor 2 modifies it
      const base = { existing: 'value' };
      const docResult: SuccessfulPipelineSimulateDocumentResult = {
        processor_results: [
          createMockProcessorResult('processor1', { existing: 'value', new_field: 'v1' }),
          createMockProcessorResult('processor2', { existing: 'value', new_field: 'v2' }),
        ],
      };

      const result = computeSimulationDocDiff(base, docResult, true, []);

      // new_field should be in detected_fields (exists in final output)
      expect(result.detected_fields.map((f) => f.name)).toContain('new_field');
      // Should have entries from both processors in per_processor_fields
      const perProcessorNewField = result.per_processor_fields.filter(
        (f) => f.name === 'new_field'
      );
      expect(perProcessorNewField).toHaveLength(2);
      expect(perProcessorNewField.map((f) => f.processor_id)).toContain('processor1');
      expect(perProcessorNewField.map((f) => f.processor_id)).toContain('processor2');
    });

    it('should handle complex scenario with multiple temp fields', () => {
      // Scenario: Multiple fields are created and some are deleted
      const base = { original: 'data' };
      const docResult: SuccessfulPipelineSimulateDocumentResult = {
        processor_results: [
          createMockProcessorResult('processor1', {
            original: 'data',
            temp1: 'a',
            temp2: 'b',
            kept: 'c',
          }),
          createMockProcessorResult('processor2', {
            original: 'data',
            temp2: 'b',
            kept: 'c',
            new_in_p2: 'd',
          }), // temp1 removed
          createMockProcessorResult('processor3', { original: 'data', kept: 'c', new_in_p2: 'd' }), // temp2 removed
        ],
      };

      const result = computeSimulationDocDiff(base, docResult, true, []);

      // Only 'kept' and 'new_in_p2' should be in detected_fields
      const detectedFieldNames = result.detected_fields.map((f) => f.name);
      expect(detectedFieldNames).toContain('kept');
      expect(detectedFieldNames).toContain('new_in_p2');
      expect(detectedFieldNames).not.toContain('temp1');
      expect(detectedFieldNames).not.toContain('temp2');

      // All fields should be tracked in per_processor_fields
      const perProcessorFieldNames = result.per_processor_fields.map((f) => f.name);
      expect(perProcessorFieldNames).toContain('temp1');
      expect(perProcessorFieldNames).toContain('temp2');
      expect(perProcessorFieldNames).toContain('kept');
      expect(perProcessorFieldNames).toContain('new_in_p2');
    });

    it('should handle single processor that adds permanent fields', () => {
      const base = { existing: 'value' };
      const docResult: SuccessfulPipelineSimulateDocumentResult = {
        processor_results: [
          createMockProcessorResult('processor1', {
            existing: 'value',
            new_field: 'added',
            another_new: 'also added',
          }),
        ],
      };

      const result = computeSimulationDocDiff(base, docResult, true, []);

      // Both new fields should be detected
      const detectedFieldNames = result.detected_fields.map((f) => f.name);
      expect(detectedFieldNames).toContain('new_field');
      expect(detectedFieldNames).toContain('another_new');
      expect(detectedFieldNames).not.toContain('existing');
    });

    it('should handle empty processor results', () => {
      const base = { existing: 'value' };
      const docResult: SuccessfulPipelineSimulateDocumentResult = {
        processor_results: [],
      };

      const result = computeSimulationDocDiff(base, docResult, true, []);

      expect(result.detected_fields).toHaveLength(0);
      expect(result.per_processor_fields).toHaveLength(0);
    });
  });

  describe('per_processor_fields tracking', () => {
    it('should track all fields touched by each processor', () => {
      const base = { existing: 'value' };
      const docResult: SuccessfulPipelineSimulateDocumentResult = {
        processor_results: [
          createMockProcessorResult('processor1', { existing: 'value', field_a: 'a' }),
          createMockProcessorResult('processor2', {
            existing: 'value',
            field_a: 'a',
            field_b: 'b',
          }),
          createMockProcessorResult('processor3', { existing: 'value', field_b: 'b' }), // field_a removed
        ],
      };

      const result = computeSimulationDocDiff(base, docResult, true, []);

      // processor1 should have field_a attributed to it
      expect(result.per_processor_fields).toContainEqual({
        processor_id: 'processor1',
        name: 'field_a',
      });
      // processor2 should have field_b attributed to it
      expect(result.per_processor_fields).toContainEqual({
        processor_id: 'processor2',
        name: 'field_b',
      });
    });
  });

  describe('error handling', () => {
    it('should detect reserved field updates', () => {
      const base = { reserved_field: 'original' };
      const docResult: SuccessfulPipelineSimulateDocumentResult = {
        processor_results: [
          createMockProcessorResult('processor1', { reserved_field: 'modified' }),
        ],
      };

      const result = computeSimulationDocDiff(base, docResult, true, ['reserved_field']);

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatchObject({
        processor_id: 'processor1',
        type: 'reserved_field_failure',
      });
    });

    it('should not report error for non-reserved field updates', () => {
      const base = { normal_field: 'original' };
      const docResult: SuccessfulPipelineSimulateDocumentResult = {
        processor_results: [createMockProcessorResult('processor1', { normal_field: 'modified' })],
      };

      const result = computeSimulationDocDiff(base, docResult, true, ['reserved_field']);

      expect(result.errors).toHaveLength(0);
    });
  });

  describe('nested field handling', () => {
    it('should handle nested fields being created and deleted', () => {
      // FlattenRecord uses dot-notation for nested fields
      const base = { 'parent.existing': 'value' };
      const docResult: SuccessfulPipelineSimulateDocumentResult = {
        processor_results: [
          createMockProcessorResult('processor1', {
            'parent.existing': 'value',
            'parent.temp': 'temporary',
          }),
          createMockProcessorResult('processor2', { 'parent.existing': 'value' }), // parent.temp removed
        ],
      };

      const result = computeSimulationDocDiff(base, docResult, true, []);

      // parent.temp should NOT be in detected_fields
      expect(result.detected_fields.map((f) => f.name)).not.toContain('parent.temp');
      // but SHOULD be tracked in per_processor_fields
      expect(result.per_processor_fields.map((f) => f.name)).toContain('parent.temp');
    });

    it('should handle nested fields being added and kept', () => {
      // FlattenRecord uses dot-notation for nested fields
      const base = { 'parent.existing': 'value' };
      const docResult: SuccessfulPipelineSimulateDocumentResult = {
        processor_results: [
          createMockProcessorResult('processor1', {
            'parent.existing': 'value',
            'parent.permanent': 'stays',
          }),
        ],
      };

      const result = computeSimulationDocDiff(base, docResult, true, []);

      // parent.permanent should be in detected_fields
      expect(result.detected_fields.map((f) => f.name)).toContain('parent.permanent');
    });
  });
});
