/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getFieldCamelKey, getFieldSnakeKey } from './template_fields';

describe('template field key utils', () => {
  describe('getFieldSnakeKey', () => {
    it('combines name and type with _as_', () => {
      expect(getFieldSnakeKey('risk_score', 'keyword')).toBe('risk_score_as_keyword');
    });

    it('handles single-word name and type', () => {
      expect(getFieldSnakeKey('severity', 'text')).toBe('severity_as_text');
    });

    it('handles multi-segment names', () => {
      expect(getFieldSnakeKey('my_custom_field', 'number')).toBe('my_custom_field_as_number');
    });
  });

  describe('getFieldCamelKey', () => {
    it('returns the camelCase version of the snake key', () => {
      expect(getFieldCamelKey('risk_score', 'keyword')).toBe('riskScoreAsKeyword');
    });

    it('handles single-word name and type', () => {
      expect(getFieldCamelKey('severity', 'text')).toBe('severityAsText');
    });

    it('handles multi-segment names', () => {
      expect(getFieldCamelKey('my_custom_field', 'number')).toBe('myCustomFieldAsNumber');
    });

    it('is consistent with camelCase applied to getFieldSnakeKey output', () => {
      const name = 'some_field';
      const type = 'date';
      const snakeKey = getFieldSnakeKey(name, type);
      expect(getFieldCamelKey(name, type)).toBe(
        snakeKey.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
      );
    });
  });
});
