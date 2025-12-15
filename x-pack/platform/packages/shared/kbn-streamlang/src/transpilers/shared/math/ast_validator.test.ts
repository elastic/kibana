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

    it('should validate log function', () => {
      expect(validateMathExpression('log(x)')).toEqual({ valid: true, errors: [] });
      expect(validateMathExpression('log(100)')).toEqual({ valid: true, errors: [] });
      expect(validateMathExpression('log(a * b)')).toEqual({ valid: true, errors: [] });
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

    it('should validate complex arithmetic expressions', () => {
      expect(validateMathExpression('(a + b) * (c - d)')).toEqual({ valid: true, errors: [] });
      expect(validateMathExpression('a + b * c / d - e')).toEqual({ valid: true, errors: [] });
    });

    it('should validate dotted field paths', () => {
      expect(validateMathExpression('attributes.price * attributes.quantity')).toEqual({
        valid: true,
        errors: [],
      });
    });
  });

  describe('rejected functions (previously supported)', () => {
    it('should reject abs()', () => {
      const result = validateMathExpression('abs(x)');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Function 'abs' is not supported");
    });

    it('should reject sqrt()', () => {
      const result = validateMathExpression('sqrt(x)');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Function 'sqrt' is not supported");
    });

    it('should reject pow()', () => {
      const result = validateMathExpression('pow(x, 2)');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Function 'pow' is not supported");
    });

    it('should reject mod()', () => {
      const result = validateMathExpression('mod(a, 10)');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Function 'mod' is not supported");
    });

    it('should reject round()', () => {
      const result = validateMathExpression('round(x)');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Function 'round' is not supported");
    });

    it('should reject ceil() and floor()', () => {
      expect(validateMathExpression('ceil(x)').valid).toBe(false);
      expect(validateMathExpression('floor(x)').valid).toBe(false);
    });

    it('should reject trigonometric functions', () => {
      expect(validateMathExpression('sin(x)').valid).toBe(false);
      expect(validateMathExpression('cos(x)').valid).toBe(false);
      expect(validateMathExpression('tan(x)').valid).toBe(false);
    });

    it('should reject constants', () => {
      const result = validateMathExpression('pi()');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Function 'pi' is not supported");
      expect(result.errors[0]).toContain('3.14159265359');
    });

    it('should reject log_ten()', () => {
      const result = validateMathExpression('log_ten(x)');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Function 'log_ten' is not supported");
    });
  });

  describe('invalid expressions', () => {
    it('should reject mean() with suggestion', () => {
      const result = validateMathExpression('mean(a, b, c)');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Function 'mean' is not supported");
    });

    it('should reject sum() with suggestion', () => {
      const result = validateMathExpression('sum(a, b)');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Function 'sum' is not supported");
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
      const result = validateMathExpression('abs(a) + sqrt(b)');
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
      const result = validateMathExpression('log(x');
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

  it('should include log function', () => {
    const names = getSupportedFunctionNames();
    expect(names).toContain('log');
  });

  it('should include comparison functions', () => {
    const names = getSupportedFunctionNames();
    expect(names).toContain('eq');
    expect(names).toContain('neq');
    expect(names).toContain('lt');
    expect(names).toContain('gt');
    expect(names).toContain('lte');
    expect(names).toContain('gte');
  });

  it('should NOT include removed functions', () => {
    const names = getSupportedFunctionNames();
    expect(names).not.toContain('abs');
    expect(names).not.toContain('sqrt');
    expect(names).not.toContain('pow');
    expect(names).not.toContain('sin');
    expect(names).not.toContain('pi');
  });
});
