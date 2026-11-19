/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DraftGrokExpression, FieldDefinition } from '@kbn/grok-ui';
import type { FlattenRecord, ProcessorMetrics, SampleDocument } from '@kbn/streams-schema';
import {
  createOriginalGrokFieldValuesMap,
  getGrokFieldDisplayValue,
  grokExpressionOverwritesSourceField,
  hasPrecedingProcessorTouchedField,
  type SampleWithDataSource,
} from './processor_outcome_preview_helpers';

describe('processor_outcome_preview_helpers', () => {
  describe('createOriginalGrokFieldValuesMap', () => {
    it('creates a map of original grok field values from preview documents and original samples', () => {
      // Setup: Original documents have the raw message, preview documents have transformed message
      const previewDocuments: FlattenRecord[] = [
        { message: 'extracted_value', timestamp: '2024-01-01' },
        { message: 'another_extracted', host: 'server-1' },
      ];

      const originalSamples: SampleWithDataSource[] = [
        {
          dataSourceId: 'source-1',
          document: { message: 'original message with timestamp 2024-01-01' },
        },
        {
          dataSourceId: 'source-2',
          document: { message: 'another original message from server-1' },
        },
      ];

      const map = createOriginalGrokFieldValuesMap(previewDocuments, originalSamples, 'message');

      // Verify the map contains original values keyed by preview document reference
      expect(map.get(previewDocuments[0])).toBe('original message with timestamp 2024-01-01');
      expect(map.get(previewDocuments[1])).toBe('another original message from server-1');
    });

    it('handles nested document structures by flattening them', () => {
      const previewDocuments: FlattenRecord[] = [{ 'body.text': 'transformed' }];

      const originalSamples: SampleWithDataSource[] = [
        {
          dataSourceId: 'source-1',
          document: { body: { text: 'original nested value' } },
        },
      ];

      const map = createOriginalGrokFieldValuesMap(previewDocuments, originalSamples, 'body.text');

      expect(map.get(previewDocuments[0])).toBe('original nested value');
    });

    it('returns undefined for documents where the original sample is missing', () => {
      const previewDocuments: FlattenRecord[] = [
        { message: 'transformed_1' },
        { message: 'transformed_2' },
      ];

      // Only one original sample (misaligned array)
      const originalSamples: SampleWithDataSource[] = [
        {
          dataSourceId: 'source-1',
          document: { message: 'original_1' },
        },
      ];

      const map = createOriginalGrokFieldValuesMap(previewDocuments, originalSamples, 'message');

      expect(map.get(previewDocuments[0])).toBe('original_1');
      expect(map.get(previewDocuments[1])).toBeUndefined();
    });

    it('returns undefined for non-string field values', () => {
      const previewDocuments: FlattenRecord[] = [
        { count: 42 },
        { count: 100 },
        { message: 'text' },
      ];

      const originalSamples: SampleWithDataSource[] = [
        { dataSourceId: 'source-1', document: { count: 123 } },
        { dataSourceId: 'source-2', document: { count: null } },
        { dataSourceId: 'source-3', document: { message: 456 } }, // Number instead of string
      ];

      const mapForCount = createOriginalGrokFieldValuesMap(
        previewDocuments,
        originalSamples,
        'count'
      );
      const mapForMessage = createOriginalGrokFieldValuesMap(
        [previewDocuments[2]],
        [originalSamples[2]],
        'message'
      );

      expect(mapForCount.get(previewDocuments[0])).toBeUndefined(); // number
      expect(mapForCount.get(previewDocuments[1])).toBeUndefined(); // null
      expect(mapForMessage.get(previewDocuments[2])).toBeUndefined(); // number instead of string
    });

    it('handles empty arrays', () => {
      const map = createOriginalGrokFieldValuesMap([], [], 'message');
      // Should not throw, returns an empty map
      expect(map).toBeInstanceOf(WeakMap);
    });

    it('handles the case where original document does not have the grok field', () => {
      const previewDocuments: FlattenRecord[] = [{ message: 'transformed' }];

      const originalSamples: SampleWithDataSource[] = [
        {
          dataSourceId: 'source-1',
          document: { other_field: 'some value' }, // No 'message' field
        },
      ];

      const map = createOriginalGrokFieldValuesMap(previewDocuments, originalSamples, 'message');

      expect(map.get(previewDocuments[0])).toBeUndefined();
    });
  });

  describe('getGrokFieldDisplayValue', () => {
    describe('when columnId matches grokField', () => {
      it('returns the original value from the WeakMap when available', () => {
        const document: FlattenRecord = { message: 'transformed_value' };
        const originalGrokFieldValues = new WeakMap<FlattenRecord, string | undefined>();
        originalGrokFieldValues.set(document, 'original_value');

        const result = getGrokFieldDisplayValue(
          document,
          'message',
          'message',
          originalGrokFieldValues
        );

        expect(result).toBe('original_value');
      });

      it('falls back to document value when original value is not in the map', () => {
        const document: FlattenRecord = { message: 'transformed_value' };
        const originalGrokFieldValues = new WeakMap<FlattenRecord, string | undefined>();
        // Note: Not setting any value for this document in the map

        const result = getGrokFieldDisplayValue(
          document,
          'message',
          'message',
          originalGrokFieldValues
        );

        expect(result).toBe('transformed_value');
      });

      it('falls back to document value when WeakMap is undefined', () => {
        const document: FlattenRecord = { message: 'document_value' };

        const result = getGrokFieldDisplayValue(document, 'message', 'message', undefined);

        expect(result).toBe('document_value');
      });

      it('returns undefined when original value in map is undefined and document value is non-string', () => {
        const document: FlattenRecord = { count: 42 };
        const originalGrokFieldValues = new WeakMap<FlattenRecord, string | undefined>();
        originalGrokFieldValues.set(document, undefined);

        const result = getGrokFieldDisplayValue(
          document,
          'count',
          'count',
          originalGrokFieldValues
        );

        expect(result).toBeUndefined();
      });

      it('returns the document value when it is a string and original is undefined', () => {
        const document: FlattenRecord = { message: 'fallback_value' };
        const originalGrokFieldValues = new WeakMap<FlattenRecord, string | undefined>();
        originalGrokFieldValues.set(document, undefined);

        const result = getGrokFieldDisplayValue(
          document,
          'message',
          'message',
          originalGrokFieldValues
        );

        expect(result).toBe('fallback_value');
      });
    });

    describe('when columnId does not match grokField', () => {
      it('returns undefined regardless of document value', () => {
        const document: FlattenRecord = { other_field: 'some_value', message: 'grok_value' };
        const originalGrokFieldValues = new WeakMap<FlattenRecord, string | undefined>();
        originalGrokFieldValues.set(document, 'original_grok_value');

        const result = getGrokFieldDisplayValue(
          document,
          'other_field', // Not the grok field
          'message',
          originalGrokFieldValues
        );

        expect(result).toBeUndefined();
      });
    });

    describe('real-world scenario: grok pattern extracting message → message', () => {
      it('uses original value for highlighting when grok overwrites the source field', () => {
        // Scenario: Grok pattern like %{WORD:level} %{GREEDYDATA:message}
        // Original: "INFO User logged in successfully"
        // Transformed: message now contains "User logged in successfully" (level extracted separately)

        const transformedDoc: FlattenRecord = {
          level: 'INFO',
          message: 'User logged in successfully', // Overwritten by grok
        };

        const originalGrokFieldValues = new WeakMap<FlattenRecord, string | undefined>();
        originalGrokFieldValues.set(transformedDoc, 'INFO User logged in successfully');

        const result = getGrokFieldDisplayValue(
          transformedDoc,
          'message',
          'message',
          originalGrokFieldValues
        );

        // Should return the ORIGINAL value for highlighting purposes
        expect(result).toBe('INFO User logged in successfully');
      });

      it('uses document value when grok does not overwrite the source field (additive pattern)', () => {
        // Scenario: Grok pattern extracts into different fields (doesn't overwrite message)
        // Pattern like: %{WORD:level} - %{GREEDYDATA:details}
        // Original: "INFO - User logged in"
        // Transformed: message unchanged, level="INFO", details="User logged in"

        const transformedDoc: FlattenRecord = {
          message: 'INFO - User logged in', // Not overwritten
          level: 'INFO',
          details: 'User logged in',
        };

        const originalGrokFieldValues = new WeakMap<FlattenRecord, string | undefined>();
        originalGrokFieldValues.set(transformedDoc, 'INFO - User logged in'); // Same as current

        const result = getGrokFieldDisplayValue(
          transformedDoc,
          'message',
          'message',
          originalGrokFieldValues
        );

        // Both original and transformed are the same in this case
        expect(result).toBe('INFO - User logged in');
      });
    });

    describe('edge cases', () => {
      it('handles nested document structures (SampleDocument type)', () => {
        const nestedDoc: SampleDocument = {
          body: { text: 'nested value' },
          'body.text': 'flattened access would get this',
        };

        // When accessing via flattened key
        const result = getGrokFieldDisplayValue(nestedDoc, 'body.text', 'body.text', undefined);

        expect(result).toBe('flattened access would get this');
      });

      it('returns undefined for empty string in original map when document has different value', () => {
        const document: FlattenRecord = { message: 'document_value' };
        const originalGrokFieldValues = new WeakMap<FlattenRecord, string | undefined>();
        originalGrokFieldValues.set(document, ''); // Empty string is still a string

        const result = getGrokFieldDisplayValue(
          document,
          'message',
          'message',
          originalGrokFieldValues
        );

        // Empty string is still a valid string value, should be returned
        expect(result).toBe('');
      });
    });
  });

  describe('hasPrecedingProcessorTouchedField', () => {
    const createProcessorMetrics = (detectedFields: string[]): ProcessorMetrics => ({
      detected_fields: detectedFields,
      errors: [],
      failed_rate: 0,
      skipped_rate: 0,
      parsed_rate: 1,
      dropped_rate: 0,
    });

    it('returns false when currentStepId is undefined', () => {
      const stepIds = ['step-1', 'step-2'];
      const processorsMetrics = {
        'step-1': createProcessorMetrics(['message']),
      };

      const result = hasPrecedingProcessorTouchedField(
        stepIds,
        undefined,
        processorsMetrics,
        'message'
      );

      expect(result).toBe(false);
    });

    it('returns false when processorsMetrics is undefined', () => {
      const stepIds = ['step-1', 'step-2'];

      const result = hasPrecedingProcessorTouchedField(stepIds, 'step-2', undefined, 'message');

      expect(result).toBe(false);
    });

    it('returns false when current step is the first step', () => {
      const stepIds = ['step-1', 'step-2'];
      const processorsMetrics = {
        'step-1': createProcessorMetrics(['message']),
        'step-2': createProcessorMetrics([]),
      };

      const result = hasPrecedingProcessorTouchedField(
        stepIds,
        'step-1',
        processorsMetrics,
        'message'
      );

      expect(result).toBe(false);
    });

    it('returns false when no preceding processor touched the field', () => {
      const stepIds = ['step-1', 'step-2', 'step-3'];
      const processorsMetrics = {
        'step-1': createProcessorMetrics(['other_field']),
        'step-2': createProcessorMetrics(['another_field']),
        'step-3': createProcessorMetrics(['message']),
      };

      const result = hasPrecedingProcessorTouchedField(
        stepIds,
        'step-3',
        processorsMetrics,
        'message'
      );

      expect(result).toBe(false);
    });

    it('returns true when a preceding processor touched the field', () => {
      const stepIds = ['step-1', 'step-2', 'step-3'];
      const processorsMetrics = {
        'step-1': createProcessorMetrics(['message', 'other_field']),
        'step-2': createProcessorMetrics(['another_field']),
        'step-3': createProcessorMetrics(['message']),
      };

      const result = hasPrecedingProcessorTouchedField(
        stepIds,
        'step-3',
        processorsMetrics,
        'message'
      );

      expect(result).toBe(true);
    });

    it('returns true when the immediately preceding processor touched the field', () => {
      const stepIds = ['step-1', 'step-2'];
      const processorsMetrics = {
        'step-1': createProcessorMetrics(['message']),
        'step-2': createProcessorMetrics([]),
      };

      const result = hasPrecedingProcessorTouchedField(
        stepIds,
        'step-2',
        processorsMetrics,
        'message'
      );

      expect(result).toBe(true);
    });

    it('does not consider processors after the current step', () => {
      const stepIds = ['step-1', 'step-2', 'step-3'];
      const processorsMetrics = {
        'step-1': createProcessorMetrics(['other_field']),
        'step-2': createProcessorMetrics([]),
        'step-3': createProcessorMetrics(['message']),
      };

      const result = hasPrecedingProcessorTouchedField(
        stepIds,
        'step-2',
        processorsMetrics,
        'message'
      );

      expect(result).toBe(false);
    });

    it('returns false when current step is not in the stepIds array', () => {
      const stepIds = ['step-1', 'step-2'];
      const processorsMetrics = {
        'step-1': createProcessorMetrics(['message']),
        'step-2': createProcessorMetrics(['message']),
      };

      const result = hasPrecedingProcessorTouchedField(
        stepIds,
        'unknown-step',
        processorsMetrics,
        'message'
      );

      expect(result).toBe(false);
    });

    it('handles missing processor metrics for some steps gracefully', () => {
      const stepIds = ['step-1', 'step-2', 'step-3'];
      const processorsMetrics = {
        'step-1': createProcessorMetrics(['message']),
        // step-2 has no metrics entry
        'step-3': createProcessorMetrics([]),
      };

      const result = hasPrecedingProcessorTouchedField(
        stepIds,
        'step-3',
        processorsMetrics,
        'message'
      );

      expect(result).toBe(true);
    });

    it('handles processor metrics with undefined detected_fields gracefully', () => {
      const stepIds = ['step-1', 'step-2'];
      const processorsMetrics = {
        'step-1': {
          detected_fields: undefined as unknown as string[],
          errors: [],
          failed_rate: 0,
          skipped_rate: 0,
          parsed_rate: 1,
          dropped_rate: 0,
        },
        'step-2': createProcessorMetrics([]),
      };

      const result = hasPrecedingProcessorTouchedField(
        stepIds,
        'step-2',
        processorsMetrics,
        'message'
      );

      expect(result).toBe(false);
    });
  });

  describe('grokExpressionOverwritesSourceField', () => {
    const createMockGrokExpression = (fieldNames: string[]): DraftGrokExpression => {
      const fields = new Map<string, FieldDefinition>();
      fieldNames.forEach((name, index) => {
        fields.set(`field-${index}`, {
          name,
          type: null,
          colour: '#000',
          pattern: 'WORD',
        });
      });

      return {
        getFields: () => fields,
        getExpression: () => '',
        getExpression$: () => ({ subscribe: () => ({ unsubscribe: () => {} }) }),
        getRegex: () => null,
        getRegexPattern: () => '',
        parse: () => [],
        updateExpression: () => {},
        destroy: () => {},
      } as unknown as DraftGrokExpression;
    };

    it('returns false when grok expressions array is empty', () => {
      const result = grokExpressionOverwritesSourceField([], 'message');
      expect(result).toBe(false);
    });

    it('returns false when no expression extracts into the source field', () => {
      const expressions = [
        createMockGrokExpression(['level', 'timestamp']),
        createMockGrokExpression(['host', 'port']),
      ];

      const result = grokExpressionOverwritesSourceField(expressions, 'message');
      expect(result).toBe(false);
    });

    it('returns true when an expression extracts into the source field', () => {
      const expressions = [
        createMockGrokExpression(['level', 'message', 'timestamp']), // extracts into message
      ];

      const result = grokExpressionOverwritesSourceField(expressions, 'message');
      expect(result).toBe(true);
    });

    it('returns true when one of multiple expressions extracts into the source field', () => {
      const expressions = [
        createMockGrokExpression(['level', 'timestamp']), // doesn't overwrite
        createMockGrokExpression(['host', 'message']), // this one overwrites
      ];

      const result = grokExpressionOverwritesSourceField(expressions, 'message');
      expect(result).toBe(true);
    });

    it('handles expression with single field matching source field', () => {
      const expressions = [createMockGrokExpression(['message'])];

      const result = grokExpressionOverwritesSourceField(expressions, 'message');
      expect(result).toBe(true);
    });

    it('is case-sensitive when matching field names', () => {
      const expressions = [createMockGrokExpression(['Message', 'MESSAGE'])];

      const result = grokExpressionOverwritesSourceField(expressions, 'message');
      expect(result).toBe(false);
    });

    it('handles expressions with no fields', () => {
      const expressions = [createMockGrokExpression([])];

      const result = grokExpressionOverwritesSourceField(expressions, 'message');
      expect(result).toBe(false);
    });
  });
});
