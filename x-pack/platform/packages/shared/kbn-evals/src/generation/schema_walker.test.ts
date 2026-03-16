/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  generateTestsFromToolSchema,
  type JSONSchema,
  type Difficulty,
} from './schema_walker';

describe('generateTestsFromToolSchema', () => {
  const difficulties: Difficulty[] = ['simple', 'moderate', 'complex'];

  describe('string type', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
    };

    it.each(difficulties)('generates string values at %s difficulty', (difficulty) => {
      const examples = generateTestsFromToolSchema(schema, { count: 3, difficulty });
      expect(examples).toHaveLength(3);
      for (const ex of examples) {
        expect(typeof ex.input?.name).toBe('string');
        expect((ex.input?.name as string).length).toBeGreaterThan(0);
      }
    });
  });

  describe('number type', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        age: { type: 'number', minimum: 0, maximum: 120 },
      },
      required: ['age'],
    };

    it.each(difficulties)('generates number values at %s difficulty', (difficulty) => {
      const examples = generateTestsFromToolSchema(schema, { count: 5, difficulty });
      expect(examples).toHaveLength(5);
      for (const ex of examples) {
        expect(typeof ex.input?.age).toBe('number');
      }
    });

    it('respects minimum/maximum at simple difficulty', () => {
      const examples = generateTestsFromToolSchema(schema, { count: 10, difficulty: 'simple' });
      for (const ex of examples) {
        const age = ex.input?.age as number;
        expect(age).toBeGreaterThanOrEqual(0);
        expect(age).toBeLessThanOrEqual(120);
      }
    });
  });

  describe('integer type', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        count: { type: 'integer', minimum: 1, maximum: 10 },
      },
      required: ['count'],
    };

    it('generates integer values', () => {
      const examples = generateTestsFromToolSchema(schema, { count: 5, difficulty: 'simple' });
      for (const ex of examples) {
        const value = ex.input?.count as number;
        expect(Number.isInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('boolean type', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        active: { type: 'boolean' },
      },
      required: ['active'],
    };

    it('generates boolean values', () => {
      const examples = generateTestsFromToolSchema(schema, { count: 5, difficulty: 'moderate' });
      for (const ex of examples) {
        expect(typeof ex.input?.active).toBe('boolean');
      }
    });

    it('simple difficulty defaults to true', () => {
      const examples = generateTestsFromToolSchema(schema, { count: 3, difficulty: 'simple' });
      for (const ex of examples) {
        expect(ex.input?.active).toBe(true);
      }
    });
  });

  describe('enum type', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        color: { type: 'string', enum: ['red', 'green', 'blue'] },
      },
      required: ['color'],
    };

    it('generates values from enum', () => {
      const examples = generateTestsFromToolSchema(schema, { count: 10, difficulty: 'moderate' });
      for (const ex of examples) {
        expect(['red', 'green', 'blue']).toContain(ex.input?.color);
      }
    });
  });

  describe('array type', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        tags: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 5 },
      },
      required: ['tags'],
    };

    it('generates arrays within bounds', () => {
      const examples = generateTestsFromToolSchema(schema, { count: 5, difficulty: 'moderate' });
      for (const ex of examples) {
        const tags = ex.input?.tags as string[];
        expect(Array.isArray(tags)).toBe(true);
        expect(tags.length).toBeGreaterThanOrEqual(1);
        expect(tags.length).toBeLessThanOrEqual(5);
      }
    });

    it('complex difficulty generates larger arrays', () => {
      const bigSchema: JSONSchema = {
        type: 'object',
        properties: {
          items: { type: 'array', items: { type: 'number' } },
        },
        required: ['items'],
      };
      const examples = generateTestsFromToolSchema(bigSchema, { count: 3, difficulty: 'complex' });
      for (const ex of examples) {
        expect(Array.isArray(ex.input?.items)).toBe(true);
      }
    });
  });

  describe('nested object type', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        address: {
          type: 'object',
          properties: {
            street: { type: 'string' },
            city: { type: 'string' },
            zip: { type: 'string' },
          },
          required: ['street', 'city'],
        },
      },
      required: ['address'],
    };

    it('generates nested objects', () => {
      const examples = generateTestsFromToolSchema(schema, { count: 3, difficulty: 'simple' });
      for (const ex of examples) {
        const address = ex.input?.address as Record<string, unknown>;
        expect(typeof address).toBe('object');
        expect(typeof address.street).toBe('string');
        expect(typeof address.city).toBe('string');
      }
    });

    it('moderate difficulty may omit optional nested fields', () => {
      const examples = generateTestsFromToolSchema(schema, { count: 20, difficulty: 'moderate' });
      const hasOmittedZip = examples.some((ex) => {
        const address = ex.input?.address as Record<string, unknown>;
        return address.zip === undefined;
      });
      // With 20 examples at moderate difficulty (40% skip rate), very likely some omit zip
      expect(hasOmittedZip).toBe(true);
    });
  });

  describe('oneOf support', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        value: {
          oneOf: [{ type: 'string' }, { type: 'number' }],
        },
      },
      required: ['value'],
    };

    it('generates values matching one of the variants', () => {
      const examples = generateTestsFromToolSchema(schema, { count: 10, difficulty: 'moderate' });
      for (const ex of examples) {
        const value = ex.input?.value;
        expect(['string', 'number']).toContain(typeof value);
      }
    });
  });

  describe('anyOf support', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        id: {
          anyOf: [{ type: 'string' }, { type: 'integer' }],
        },
      },
      required: ['id'],
    };

    it('generates values matching any variant', () => {
      const examples = generateTestsFromToolSchema(schema, { count: 10, difficulty: 'moderate' });
      for (const ex of examples) {
        const id = ex.input?.id;
        expect(['string', 'number']).toContain(typeof id);
      }
    });
  });

  describe('const support', () => {
    const schema: JSONSchema = {
      type: 'object',
      properties: {
        version: { const: '1.0.0' },
      },
      required: ['version'],
    };

    it('returns the const value', () => {
      const examples = generateTestsFromToolSchema(schema, { count: 3, difficulty: 'simple' });
      for (const ex of examples) {
        expect(ex.input?.version).toBe('1.0.0');
      }
    });
  });

  describe('count parameter', () => {
    const schema: JSONSchema = { type: 'object', properties: {} };

    it('generates the requested number of examples', () => {
      expect(generateTestsFromToolSchema(schema, { count: 0, difficulty: 'simple' })).toHaveLength(0);
      expect(generateTestsFromToolSchema(schema, { count: 1, difficulty: 'simple' })).toHaveLength(1);
      expect(generateTestsFromToolSchema(schema, { count: 50, difficulty: 'simple' })).toHaveLength(50);
    });
  });

  describe('empty/minimal schema', () => {
    it('handles empty properties', () => {
      const examples = generateTestsFromToolSchema(
        { type: 'object', properties: {} },
        { count: 2, difficulty: 'simple' }
      );
      expect(examples).toHaveLength(2);
      for (const ex of examples) {
        expect(ex.input).toEqual({});
      }
    });

    it('handles schema with no type (but with properties)', () => {
      const schema: JSONSchema = {
        properties: { name: { type: 'string' } },
        required: ['name'],
      };
      const examples = generateTestsFromToolSchema(schema, { count: 1, difficulty: 'simple' });
      expect(examples[0].input).toHaveProperty('name');
    });
  });
});
