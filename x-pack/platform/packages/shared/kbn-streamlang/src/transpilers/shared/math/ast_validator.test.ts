/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { validateMathExpression, getSupportedFunctionNames } from './ast_validator';

describe('validateMathExpression', () => {
  describe('valid expressions', () => {
    it('should validate simple arithmetic', () => {
      expect(validateMathExpression('a + b')).toEqual({ valid: true, errors: [] });
      expect(validateMathExpression('a - b')).toEqual({ valid: true, errors: [] });
      expect(validateMathExpression('a * b')).toEqual({ valid: true, errors: [] });
      expect(validateMathExpression('a / b')).toEqual({ valid: true, errors: [] });
    });

    it('should validate numeric literals', () => {
      expect(validateMathExpression('2 + 2')).toEqual({ valid: true, errors: [] });
      expect(validateMathExpression('3.14 * 2')).toEqual({ valid: true, errors: [] });
      expect(validateMathExpression('-5 + 10')).toEqual({ valid: true, errors: [] });
    });

    it('should validate supported single-arg functions', () => {
      expect(validateMathExpression('abs(x)')).toEqual({ valid: true, errors: [] });
      expect(validateMathExpression('sqrt(x)')).toEqual({ valid: true, errors: [] });
      expect(validateMathExpression('ceil(x)')).toEqual({ valid: true, errors: [] });
      expect(validateMathExpression('floor(x)')).toEqual({ valid: true, errors: [] });
      expect(validateMathExpression('round(x)')).toEqual({ valid: true, errors: [] });
      expect(validateMathExpression('exp(x)')).toEqual({ valid: true, errors: [] });
      expect(validateMathExpression('log(x)')).toEqual({ valid: true, errors: [] });
      expect(validateMathExpression('sin(x)')).toEqual({ valid: true, errors: [] });
      expect(validateMathExpression('cos(x)')).toEqual({ valid: true, errors: [] });
      expect(validateMathExpression('tan(x)')).toEqual({ valid: true, errors: [] });
    });

    it('should validate supported two-arg functions', () => {
      expect(validateMathExpression('pow(x, 2)')).toEqual({ valid: true, errors: [] });
      expect(validateMathExpression('mod(x, 10)')).toEqual({ valid: true, errors: [] });
      expect(validateMathExpression('log(x, 10)')).toEqual({ valid: true, errors: [] });
      expect(validateMathExpression('round(x, 2)')).toEqual({ valid: true, errors: [] });
    });

    it('should validate comparison operators using function syntax', () => {
      expect(validateMathExpression('lt(a, b)')).toEqual({ valid: true, errors: [] });
      expect(validateMathExpression('gt(a, b)')).toEqual({ valid: true, errors: [] });
      expect(validateMathExpression('eq(a, b)')).toEqual({ valid: true, errors: [] });
      expect(validateMathExpression('neq(a, b)')).toEqual({ valid: true, errors: [] });
      expect(validateMathExpression('lte(a, b)')).toEqual({ valid: true, errors: [] });
      expect(validateMathExpression('gte(a, b)')).toEqual({ valid: true, errors: [] });
    });

    it('should validate comparison operators using infix syntax', () => {
      expect(validateMathExpression('a < b')).toEqual({ valid: true, errors: [] });
      expect(validateMathExpression('a > b')).toEqual({ valid: true, errors: [] });
      expect(validateMathExpression('a == b')).toEqual({ valid: true, errors: [] });
      expect(validateMathExpression('a <= b')).toEqual({ valid: true, errors: [] });
      expect(validateMathExpression('a >= b')).toEqual({ valid: true, errors: [] });
    });

    it('should validate constants', () => {
      expect(validateMathExpression('pi()')).toEqual({ valid: true, errors: [] });
    });

    it('should validate complex nested expressions', () => {
      expect(validateMathExpression('sqrt(pow(a, 2) + pow(b, 2))')).toEqual({
        valid: true,
        errors: [],
      });
      expect(validateMathExpression('abs(ceil(floor(x)))')).toEqual({ valid: true, errors: [] });
      expect(validateMathExpression('(a + b) * (c - d)')).toEqual({ valid: true, errors: [] });
    });

    it('should validate dotted field paths', () => {
      expect(validateMathExpression('attributes.price * attributes.quantity')).toEqual({
        valid: true,
        errors: [],
      });
    });
  });

  describe('invalid expressions', () => {
    it('should reject mean() with suggestion', () => {
      const result = validateMathExpression('mean(a, b, c)');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Function 'mean' is not supported");
      expect(result.errors[0]).toContain('add(a, b) / 2');
    });

    it('should reject sum() with suggestion', () => {
      const result = validateMathExpression('sum(a, b)');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Function 'sum' is not supported");
      expect(result.errors[0]).toContain('add(a, b)');
    });

    it('should reject square() with suggestion', () => {
      const result = validateMathExpression('square(x)');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Function 'square' is not supported");
      expect(result.errors[0]).toContain('pow(a, 2)');
    });

    it('should reject unknown functions', () => {
      const result = validateMathExpression('unknownFunc(x)');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Unknown function 'unknownFunc'");
    });

    it('should reject array functions', () => {
      expect(validateMathExpression('count(arr)').valid).toBe(false);
      expect(validateMathExpression('first(arr)').valid).toBe(false);
      expect(validateMathExpression('last(arr)').valid).toBe(false);
    });

    it('should reject random()', () => {
      const result = validateMathExpression('random(1, 10)');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Non-deterministic');
    });

    it('should collect multiple errors', () => {
      const result = validateMathExpression('mean(a) + sum(b)');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe('parse errors', () => {
    it('should handle syntax errors', () => {
      const result = validateMathExpression('a + * b');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Failed to parse');
    });

    it('should handle unclosed parentheses', () => {
      const result = validateMathExpression('abs(x');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Failed to parse');
    });

    it('should handle empty expression', () => {
      const result = validateMathExpression('');
      expect(result.valid).toBe(false);
    });
  });
});

describe('getSupportedFunctionNames', () => {
  it('should return a sorted list of function names', () => {
    const names = getSupportedFunctionNames();
    expect(Array.isArray(names)).toBe(true);
    expect(names.length).toBeGreaterThan(0);
    // Should be sorted
    const sorted = [...names].sort();
    expect(names).toEqual(sorted);
  });

  it('should include core arithmetic operators', () => {
    const names = getSupportedFunctionNames();
    expect(names).toContain('add');
    expect(names).toContain('subtract');
    expect(names).toContain('multiply');
    expect(names).toContain('divide');
  });

  it('should include registry functions', () => {
    const names = getSupportedFunctionNames();
    expect(names).toContain('abs');
    expect(names).toContain('sqrt');
    expect(names).toContain('pow');
    expect(names).toContain('pi');
  });
});
