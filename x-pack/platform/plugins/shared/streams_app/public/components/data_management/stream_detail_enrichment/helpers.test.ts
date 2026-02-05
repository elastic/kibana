/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isSchema } from '@kbn/streams-schema';
import { shouldSuggestProcessorKey, detectProcessorContext, deserializeJson } from './helpers';
import { customSamplesDataSourceDocumentsSchema } from '../../../../common/url_schema';
import type { monaco } from '@kbn/monaco';

describe('helpers', () => {
  describe('deserializeJson', () => {
    it('returns parsed JSON for valid JSON input', () => {
      const validJson = '[{"field": "value"}]';
      const result = deserializeJson(validJson);
      expect(result).toEqual([{ field: 'value' }]);
    });

    it('returns the raw string for invalid JSON input', () => {
      const invalidJson = 'not valid json';
      const result = deserializeJson(invalidJson);
      expect(result).toBe('not valid json');
    });

    it('returns the raw string for incomplete JSON', () => {
      const incompleteJson = '[{"field": "value"';
      const result = deserializeJson(incompleteJson);
      expect(result).toBe('[{"field": "value"');
    });
  });

  /**
   * These tests document the validation pattern used in custom_samples_data_source_card.tsx
   * to ensure that invalid JSON from user editing never gets persisted to sessionStorage.
   *
   * The pattern: deserializeJson(value) + isSchema(customSamplesDataSourceDocumentsSchema, documents)
   * - Invalid JSON causes deserializeJson to return a string
   * - isSchema fails because the schema expects an array of objects, not a string
   * - This prevents handleChange() from being called, so sessionStorage is never updated
   */
  describe('custom samples validation pattern', () => {
    it('passes validation for valid JSON array of documents', () => {
      const validInput = '[{"message": "test"}]';
      const documents = deserializeJson(validInput);
      expect(isSchema(customSamplesDataSourceDocumentsSchema, documents)).toBe(true);
    });

    it('fails validation when JSON is invalid - string returned by deserializeJson fails schema', () => {
      const invalidJson = 'not valid json';
      const documents = deserializeJson(invalidJson);
      // deserializeJson returns the raw string for invalid JSON
      expect(typeof documents).toBe('string');
      // The schema expects an array, so validation fails
      expect(isSchema(customSamplesDataSourceDocumentsSchema, documents)).toBe(false);
    });

    it('fails validation when JSON is incomplete', () => {
      const incompleteJson = '[{"message": "test"';
      const documents = deserializeJson(incompleteJson);
      expect(typeof documents).toBe('string');
      expect(isSchema(customSamplesDataSourceDocumentsSchema, documents)).toBe(false);
    });

    it('fails validation when JSON is valid but not an array', () => {
      const validJsonButNotArray = '{"message": "test"}';
      const documents = deserializeJson(validJsonButNotArray);
      expect(typeof documents).toBe('object');
      expect(Array.isArray(documents)).toBe(false);
      expect(isSchema(customSamplesDataSourceDocumentsSchema, documents)).toBe(false);
    });

    it('fails validation when JSON is valid array but items are not objects', () => {
      const validJsonButWrongShape = '["string1", "string2"]';
      const documents = deserializeJson(validJsonButWrongShape);
      expect(Array.isArray(documents)).toBe(true);
      expect(isSchema(customSamplesDataSourceDocumentsSchema, documents)).toBe(false);
    });
  });

  describe('shouldSuggestProcessorKey', () => {
    it('returns true at start of key position', () => {
      const lineBefore = '  { "';
      const nearby = '[\n  {\n';
      expect(shouldSuggestProcessorKey(lineBefore, nearby)).toBe(true);
    });

    it('returns false after colon', () => {
      const lineBefore = '  "grok": ';
      const nearby = '{ "grok": ';
      expect(shouldSuggestProcessorKey(lineBefore, nearby)).toBe(false);
    });

    it('returns false inside triple quote', () => {
      const lineBefore = '  """ inside';
      const nearby = '"""';
      expect(shouldSuggestProcessorKey(lineBefore, nearby)).toBe(false);
    });
  });

  describe('detectProcessorContext', () => {
    const createFakeModel = (lines: string[]): monaco.editor.ITextModel => {
      return {
        getValueInRange: ({ startLineNumber, startColumn, endLineNumber, endColumn }: any) => {
          if (startLineNumber === endLineNumber) {
            const s = lines[startLineNumber - 1] || '';
            return s.slice(startColumn - 1, endColumn - 1);
          }
          const parts: string[] = [];
          parts.push((lines[startLineNumber - 1] || '').slice(startColumn - 1));
          for (let ln = startLineNumber + 1; ln < endLineNumber; ln++) {
            parts.push(lines[ln - 1] || '');
          }
          parts.push((lines[endLineNumber - 1] || '').slice(0, Math.max(0, endColumn - 1)));
          return parts.join('\n');
        },
        getLineMaxColumn: (line: number) => (lines[line - 1] ? lines[line - 1].length + 1 : 1),
        getLineContent: (line: number) => lines[line - 1] || '',
      } as unknown as monaco.editor.ITextModel;
    };

    it('returns processorKey at top-level array', () => {
      const model = createFakeModel(['[', '  { "', '  }', ']']);
      const pos = { lineNumber: 2, column: 6 } as monaco.Position;
      const ctx = detectProcessorContext(model, pos, ['grok', 'set']);
      expect(ctx.kind).toBe('processorKey');
    });

    it('returns processorProperty inside known processor object', () => {
      const model = createFakeModel(['[', '  { "grok": { "', '  }', ']']);
      const pos = { lineNumber: 2, column: 17 } as monaco.Position;
      const ctx = detectProcessorContext(model, pos, ['grok', 'set']);
      expect(ctx.kind).toBe('processorProperty');
      expect(ctx.processorName).toBe('grok');
    });
  });
});
