/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  truncateString,
  deepTruncate,
  truncateSchema,
  generateMinimalExample,
  toCompactJson,
  createTruncatedErrorPayload,
  truncateToolResult,
  DEFAULT_MAX_CHARS,
} from './payload_truncation';

describe('payload_truncation', () => {
  describe('truncateString', () => {
    it('returns string unchanged if under limit', () => {
      expect(truncateString('hello', 100)).toBe('hello');
    });

    it('truncates long strings with ellipsis', () => {
      const longStr = 'a'.repeat(600);
      const result = truncateString(longStr, 500);
      expect(result.length).toBe(500);
      expect(result.endsWith('...')).toBe(true);
    });
  });

  describe('deepTruncate', () => {
    it('preserves primitives', () => {
      expect(deepTruncate('hello')).toBe('hello');
      expect(deepTruncate(42)).toBe(42);
      expect(deepTruncate(true)).toBe(true);
      expect(deepTruncate(null)).toBe(null);
      expect(deepTruncate(undefined)).toBe(undefined);
    });

    it('truncates long strings', () => {
      const longStr = 'a'.repeat(600);
      const result = deepTruncate(longStr) as string;
      expect(result.length).toBeLessThan(longStr.length);
      expect(result.endsWith('...')).toBe(true);
    });

    it('truncates arrays with many items', () => {
      const arr = Array.from({ length: 20 }, (_, i) => `item${i}`);
      const result = deepTruncate(arr) as string[];
      expect(result.length).toBe(11); // 10 items + truncation message
      expect(result[10]).toContain('more items');
    });

    it('truncates objects with many properties', () => {
      const obj: Record<string, number> = {};
      for (let i = 0; i < 20; i++) {
        obj[`prop${i}`] = i;
      }
      const result = deepTruncate(obj) as Record<string, unknown>;
      expect(Object.keys(result).length).toBe(16); // 15 props + '...' marker
      expect(result['...']).toContain('more properties');
    });

    it('handles nested structures with depth limit', () => {
      const nested = { a: { b: { c: { d: { e: { f: 'deep' } } } } } };
      const result = deepTruncate(nested) as any;
      // At depth 4, should show [Object] instead of going deeper
      expect(result.a.b.c.d).toBe('[Object]');
    });
  });

  describe('truncateSchema', () => {
    it('preserves essential schema information', () => {
      const schema = {
        type: 'object',
        required: ['name', 'age'],
        description: 'A person schema',
        properties: {
          name: { type: 'string', description: 'The name' },
          age: { type: 'number' },
        },
      };

      const result = truncateSchema(schema) as Record<string, unknown>;
      expect(result.type).toBe('object');
      expect(result.required).toEqual(['name', 'age']);
      expect(result.properties).toBeDefined();
    });

    it('truncates long descriptions', () => {
      const schema = {
        type: 'object',
        description: 'a'.repeat(500),
      };

      const result = truncateSchema(schema) as Record<string, unknown>;
      expect((result.description as string).length).toBeLessThan(500);
    });

    it('handles oneOf/anyOf schemas', () => {
      const schema = {
        oneOf: [
          { properties: { operation: { const: 'create' }, name: { type: 'string' } } },
          { properties: { operation: { const: 'update' }, id: { type: 'string' } } },
          { properties: { operation: { const: 'delete' }, id: { type: 'string' } } },
        ],
      };

      const result = truncateSchema(schema) as Record<string, unknown>;
      expect(result.oneOf).toBeDefined();
      expect((result.oneOf as any[])[0].operation).toBe('create');
    });
  });

  describe('generateMinimalExample', () => {
    it('generates example from required properties', () => {
      const schema = {
        type: 'object',
        required: ['name', 'count'],
        properties: {
          name: { type: 'string' },
          count: { type: 'number' },
          optional: { type: 'boolean' },
        },
      };

      const result = generateMinimalExample(schema);
      expect(result).toEqual({
        name: '<string>',
        count: 0,
      });
    });

    it('uses const values when available', () => {
      const schema = {
        type: 'object',
        required: ['operation'],
        properties: {
          operation: { const: 'search' },
        },
      };

      const result = generateMinimalExample(schema);
      expect(result).toEqual({ operation: 'search' });
    });

    it('uses first enum value when available', () => {
      const schema = {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['active', 'inactive', 'pending'] },
        },
      };

      const result = generateMinimalExample(schema);
      expect(result).toEqual({ status: 'active' });
    });

    it('handles oneOf by picking first variant', () => {
      const schema = {
        oneOf: [
          {
            properties: {
              operation: { const: 'list' },
              limit: { type: 'number' },
            },
            required: ['operation'],
          },
        ],
      };

      const result = generateMinimalExample(schema);
      expect(result).toEqual({ operation: 'list' });
    });
  });

  describe('toCompactJson', () => {
    it('returns unchanged JSON for small objects', () => {
      const obj = { foo: 'bar' };
      const result = toCompactJson(obj);
      expect(JSON.parse(result)).toEqual(obj);
    });

    it('truncates large objects', () => {
      const largeObj: Record<string, string> = {};
      for (let i = 0; i < 1000; i++) {
        largeObj[`key${i}`] = 'a'.repeat(100);
      }

      const result = toCompactJson(largeObj, 1000);
      expect(result.length).toBeLessThanOrEqual(1100); // Some tolerance for truncation message
    });
  });

  describe('createTruncatedErrorPayload', () => {
    it('creates a structured error payload', () => {
      const result = createTruncatedErrorPayload({
        message: 'Invalid parameters',
        toolName: 'test_tool',
        skillNamespace: 'test.skill',
        operation: 'search',
      });

      const parsed = JSON.parse(result);
      expect(parsed.error.message).toBe('Invalid parameters');
      expect(parsed.error.tool).toBe('test_tool');
      expect(parsed.error.skill).toBe('test.skill');
      expect(parsed.operation).toBe('search');
      expect(parsed.hint).toBeDefined();
    });

    it('includes truncated schema and example', () => {
      const schema = {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string', description: 'Search query' },
        },
      };

      const result = createTruncatedErrorPayload({
        message: 'Invalid parameters',
        toolName: 'search',
        schema,
      });

      const parsed = JSON.parse(result);
      expect(parsed.expected_schema).toBeDefined();
      expect(parsed.expected_params_example).toEqual({ query: '<string>' });
    });

    it('includes received keys when params provided', () => {
      const result = createTruncatedErrorPayload({
        message: 'Invalid parameters',
        toolName: 'test',
        receivedParams: { foo: 'bar', baz: 123 },
      });

      const parsed = JSON.parse(result);
      expect(parsed.received_keys).toEqual(['foo', 'baz']);
    });
  });

  describe('truncateToolResult', () => {
    it('returns short strings unchanged', () => {
      expect(truncateToolResult('hello')).toBe('hello');
    });

    it('truncates long strings with guidance', () => {
      const longStr = 'a'.repeat(10000);
      const result = truncateToolResult(longStr, 1000);
      expect(result.length).toBeLessThan(longStr.length);
      expect(result).toContain('truncated');
    });

    it('handles objects', () => {
      const obj = { key: 'value' };
      const result = truncateToolResult(obj);
      expect(JSON.parse(result)).toEqual(obj);
    });
  });
});
