/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProcessingSimulationResponse } from '@kbn/streams-schema';
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
