/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FlattenRecord } from '@kbn/streams-schema';
import {
  extractMessagesFromField,
  getDefaultTextField,
  PRIORITIZED_CONTENT_FIELDS,
} from './pattern_extraction_helpers';

describe('pattern_extraction_helpers', () => {
  describe('extractMessagesFromField', () => {
    it('extracts values from a non-dotted field name', () => {
      const samples: FlattenRecord[] = [{ message: 'hello world' }, { message: 'foo bar' }];
      expect(extractMessagesFromField(samples, 'message')).toEqual(['hello world', 'foo bar']);
    });

    it('extracts values from a dotted field name in a flat record', () => {
      // lodash get() correctly resolves literal dotted keys (e.g. 'body.text')
      // when they exist as own properties, before attempting nested path traversal.
      const samples: FlattenRecord[] = [
        { 'body.text': 'log line 1' },
        { 'body.text': 'log line 2' },
      ];
      expect(extractMessagesFromField(samples, 'body.text')).toEqual(['log line 1', 'log line 2']);
    });

    it('skips samples where the field is missing', () => {
      const samples: FlattenRecord[] = [{ 'body.text': 'present' }, { other: 'no body.text here' }];
      expect(extractMessagesFromField(samples, 'body.text')).toEqual(['present']);
    });

    it('skips non-string values', () => {
      const samples: FlattenRecord[] = [{ 'body.text': 42 }, { 'body.text': 'valid' }];
      expect(extractMessagesFromField(samples, 'body.text')).toEqual(['valid']);
    });

    it('works with deeply dotted field names', () => {
      const samples: FlattenRecord[] = [{ 'attributes.exception.message': 'NullPointerException' }];
      expect(extractMessagesFromField(samples, 'attributes.exception.message')).toEqual([
        'NullPointerException',
      ]);
    });
  });

  describe('getDefaultTextField', () => {
    it('returns the most common prioritized field', () => {
      const samples: FlattenRecord[] = [
        { 'body.text': 'a', other: 'x' },
        { 'body.text': 'b', other: 'y' },
        { message: 'c' },
      ];
      expect(getDefaultTextField(samples, PRIORITIZED_CONTENT_FIELDS)).toBe('body.text');
    });

    it('prefers higher-priority fields when counts are equal', () => {
      const samples: FlattenRecord[] = [{ message: 'a', 'body.text': 'b' }];
      expect(getDefaultTextField(samples, PRIORITIZED_CONTENT_FIELDS)).toBe('message');
    });

    it('returns empty string when no prioritized fields are present', () => {
      const samples: FlattenRecord[] = [{ foo: 'bar' }];
      expect(getDefaultTextField(samples, PRIORITIZED_CONTENT_FIELDS)).toBe('');
    });
  });
});
