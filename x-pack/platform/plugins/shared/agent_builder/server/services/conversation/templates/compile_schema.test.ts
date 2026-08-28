/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationTemplateFieldDefinition } from '@kbn/agent-builder-common';
import { compileFieldSchema } from './compile_schema';

const def = (
  overrides: Partial<ConversationTemplateFieldDefinition> & {
    input_type: ConversationTemplateFieldDefinition['input_type'];
  }
): ConversationTemplateFieldDefinition => overrides as ConversationTemplateFieldDefinition;

describe('compileFieldSchema', () => {
  describe('TEXT', () => {
    it('accepts any string', () => {
      const s = compileFieldSchema(def({ input_type: 'TEXT' }));
      expect(s.safeParse('hello').success).toBe(true);
    });

    it('rejects non-string', () => {
      const s = compileFieldSchema(def({ input_type: 'TEXT' }));
      expect(s.safeParse(42).success).toBe(false);
    });

    it('enforces max_length', () => {
      const s = compileFieldSchema(def({ input_type: 'TEXT', max_length: 5 }));
      expect(s.safeParse('hello').success).toBe(true);
      expect(s.safeParse('toolong').success).toBe(false);
    });

    it('enforces regex', () => {
      const s = compileFieldSchema(def({ input_type: 'TEXT', regex: { pattern: '^\\d+$' } }));
      expect(s.safeParse('123').success).toBe(true);
      expect(s.safeParse('abc').success).toBe(false);
    });
  });

  describe('SELECT', () => {
    it('accepts an allowed option', () => {
      const s = compileFieldSchema(def({ input_type: 'SELECT', options: ['a', 'b', 'c'] }));
      expect(s.safeParse('a').success).toBe(true);
    });

    it('rejects a value not in options', () => {
      const s = compileFieldSchema(def({ input_type: 'SELECT', options: ['a', 'b'] }));
      expect(s.safeParse('z').success).toBe(false);
    });
  });

  describe('NUMBER', () => {
    it('accepts a number', () => {
      const s = compileFieldSchema(def({ input_type: 'NUMBER' }));
      expect(s.safeParse(42).success).toBe(true);
    });

    it('rejects a string (unlike top-level NUMBER validation)', () => {
      // Nested NUMBERs must be real JSON numbers — no numeric-string coercion.
      const s = compileFieldSchema(def({ input_type: 'NUMBER' }));
      expect(s.safeParse('42').success).toBe(false);
    });

    it('enforces min / max', () => {
      const s = compileFieldSchema(def({ input_type: 'NUMBER', min: 1, max: 10 }));
      expect(s.safeParse(5).success).toBe(true);
      expect(s.safeParse(0).success).toBe(false);
      expect(s.safeParse(11).success).toBe(false);
    });
  });

  describe('TOGGLE', () => {
    it('accepts boolean', () => {
      const s = compileFieldSchema(def({ input_type: 'TOGGLE' }));
      expect(s.safeParse(true).success).toBe(true);
      expect(s.safeParse(false).success).toBe(true);
    });

    it('rejects the string "true"', () => {
      const s = compileFieldSchema(def({ input_type: 'TOGGLE' }));
      expect(s.safeParse('true').success).toBe(false);
    });
  });

  describe('DATE', () => {
    it('accepts a valid ISO date', () => {
      const s = compileFieldSchema(def({ input_type: 'DATE' }));
      expect(s.safeParse('2024-01-15').success).toBe(true);
      expect(s.safeParse('2024-01-15T10:30:00Z').success).toBe(true);
    });

    it('rejects an invalid date', () => {
      const s = compileFieldSchema(def({ input_type: 'DATE' }));
      expect(s.safeParse('not-a-date').success).toBe(false);
      expect(s.safeParse('2024-13-45').success).toBe(false);
    });
  });

  describe('TEXT_ARRAY', () => {
    it('accepts an array of strings', () => {
      const s = compileFieldSchema(def({ input_type: 'TEXT_ARRAY' }));
      expect(s.safeParse(['a', 'b']).success).toBe(true);
    });

    it('rejects an array with non-string items', () => {
      const s = compileFieldSchema(def({ input_type: 'TEXT_ARRAY' }));
      expect(s.safeParse([1, 2]).success).toBe(false);
    });
  });

  describe('OBJECT', () => {
    const objectDef = def({
      input_type: 'OBJECT',
      properties: {
        name: def({ input_type: 'TEXT', required: true }),
        age: def({ input_type: 'NUMBER' }),
      },
    });

    it('accepts an object matching the declared properties', () => {
      const s = compileFieldSchema(objectDef);
      expect(s.safeParse({ name: 'Alice', age: 30 }).success).toBe(true);
    });

    it('accepts an object with optional properties missing', () => {
      const s = compileFieldSchema(objectDef);
      expect(s.safeParse({ name: 'Alice' }).success).toBe(true);
    });

    it('rejects an object missing a required property', () => {
      const s = compileFieldSchema(objectDef);
      // `name` is required — missing it should fail
      const result = s.safeParse({ age: 30 });
      expect(result.success).toBe(false);
    });

    it('rejects an object with an undeclared key', () => {
      const s = compileFieldSchema(objectDef);
      // strictObject rejects undeclared keys
      const result = s.safeParse({ name: 'Alice', extra: true });
      expect(result.success).toBe(false);
    });

    it('rejects a non-object', () => {
      const s = compileFieldSchema(objectDef);
      expect(s.safeParse('string').success).toBe(false);
      expect(s.safeParse([{ name: 'x' }]).success).toBe(false);
    });

    it('validates nested property types', () => {
      const s = compileFieldSchema(objectDef);
      // age must be a number (strict — no string coercion)
      expect(s.safeParse({ name: 'Alice', age: 'thirty' }).success).toBe(false);
    });
  });

  describe('OBJECT_ARRAY', () => {
    const arrayDef = def({
      input_type: 'OBJECT_ARRAY',
      max_items: 2,
      properties: {
        type: def({ input_type: 'SELECT', options: ['ip', 'domain'], required: true }),
        value: def({ input_type: 'TEXT', required: true }),
      },
    });

    it('accepts a valid array of objects', () => {
      const s = compileFieldSchema(arrayDef);
      expect(s.safeParse([{ type: 'ip', value: '1.2.3.4' }]).success).toBe(true);
    });

    it('accepts an empty array', () => {
      const s = compileFieldSchema(arrayDef);
      expect(s.safeParse([]).success).toBe(true);
    });

    it('enforces max_items', () => {
      const s = compileFieldSchema(arrayDef);
      expect(
        s.safeParse([
          { type: 'ip', value: 'a' },
          { type: 'ip', value: 'b' },
          { type: 'ip', value: 'c' },
        ]).success
      ).toBe(false);
    });

    it('validates each element against the declared properties', () => {
      const s = compileFieldSchema(arrayDef);
      expect(s.safeParse([{ type: 'unknown', value: 'x' }]).success).toBe(false);
    });

    it('rejects undeclared keys within elements', () => {
      const s = compileFieldSchema(arrayDef);
      expect(s.safeParse([{ type: 'ip', value: 'x', extra: true }]).success).toBe(false);
    });

    it('rejects a non-array value', () => {
      const s = compileFieldSchema(arrayDef);
      expect(s.safeParse({ type: 'ip', value: 'x' }).success).toBe(false);
    });
  });

  describe('deep nesting', () => {
    it('compiles and validates a two-level nested OBJECT', () => {
      const deepDef = def({
        input_type: 'OBJECT',
        properties: {
          address: def({
            input_type: 'OBJECT',
            properties: {
              city: def({ input_type: 'TEXT', required: true }),
              zip: def({ input_type: 'TEXT' }),
            },
          }),
        },
      });
      const s = compileFieldSchema(deepDef);
      expect(s.safeParse({ address: { city: 'Berlin', zip: '10115' } }).success).toBe(true);
      expect(s.safeParse({ address: { zip: '10115' } }).success).toBe(false); // city required
    });
  });

  describe('memoization', () => {
    it('returns the same schema instance for the same definition object', () => {
      const fieldDef = def({ input_type: 'TEXT' });
      const s1 = compileFieldSchema(fieldDef);
      const s2 = compileFieldSchema(fieldDef);
      expect(s1).toBe(s2);
    });

    it('returns different instances for different definition objects', () => {
      const s1 = compileFieldSchema(def({ input_type: 'TEXT' }));
      const s2 = compileFieldSchema(def({ input_type: 'NUMBER' }));
      expect(s1).not.toBe(s2);
    });
  });
});
