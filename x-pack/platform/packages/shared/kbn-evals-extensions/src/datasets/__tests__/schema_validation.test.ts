/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateExample, validateDataset } from '../schema_validation';
import type { ExampleSchema } from '../schema_validation';

describe('validateExample', () => {
  const schema: ExampleSchema = {
    required: ['input', 'expected'],
    fields: {
      input: 'string',
      expected: 'string',
      score: 'number',
      tags: 'array',
      metadata: 'object',
    },
  };

  it('should pass for a valid example', () => {
    const result = validateExample(
      { input: 'test query', expected: 'expected output', score: 0.9 },
      schema
    );
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should fail for missing required fields', () => {
    const result = validateExample({ input: 'test query' }, schema);
    expect(result.valid).toBe(false);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].path).toBe('expected');
    expect(result.errors[0].message).toContain('missing');
  });

  it('should fail for wrong field types', () => {
    const result = validateExample(
      { input: 'test', expected: 'output', score: 'not-a-number' },
      schema
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === 'score')).toBe(true);
  });

  it('should allow null values for typed fields', () => {
    const result = validateExample({ input: 'test', expected: 'output', score: null }, schema);
    expect(result.valid).toBe(true);
  });

  it('should detect unknown fields in strict mode', () => {
    const result = validateExample(
      { input: 'test', expected: 'output', unknownField: 'value' },
      schema,
      { strict: true }
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === 'unknownField')).toBe(true);
  });

  it('should allow unknown fields in non-strict mode', () => {
    const result = validateExample(
      { input: 'test', expected: 'output', unknownField: 'value' },
      schema
    );
    expect(result.valid).toBe(true);
  });

  it('should handle array type correctly', () => {
    const result = validateExample({ input: 'test', expected: 'output', tags: ['a', 'b'] }, schema);
    expect(result.valid).toBe(true);
  });

  it('should fail when array is expected but got object', () => {
    const result = validateExample(
      { input: 'test', expected: 'output', tags: { key: 'value' } },
      schema
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.path === 'tags')).toBe(true);
  });
});

describe('validateDataset', () => {
  const schema: ExampleSchema = {
    required: ['input'],
    fields: { input: 'string', expected: 'string' },
  };

  it('should validate all examples', () => {
    const result = validateDataset(
      [
        { input: 'a', expected: 'b' },
        { input: 'c', expected: 'd' },
      ],
      schema
    );
    expect(result.valid).toBe(true);
    expect(result.totalExamples).toBe(2);
    expect(result.invalidExamples).toBe(0);
  });

  it('should report invalid examples with indices', () => {
    const result = validateDataset(
      [{ input: 'valid' }, { notInput: 'missing input' }, { input: 'valid too' }],
      schema
    );
    expect(result.valid).toBe(false);
    expect(result.invalidExamples).toBe(1);
    expect(result.errors[0].index).toBe(1);
  });

  it('should handle empty datasets', () => {
    const result = validateDataset([], schema);
    expect(result.valid).toBe(true);
    expect(result.totalExamples).toBe(0);
  });
});
