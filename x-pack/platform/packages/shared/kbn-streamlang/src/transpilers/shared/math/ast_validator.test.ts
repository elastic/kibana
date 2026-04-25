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
    it.each([
      ['abs(x)', 'abs'],
      ['sqrt(x)', 'sqrt'],
      ['pow(x, 2)', 'pow'],
      ['mod(a, 10)', 'mod'],
      ['round(x)', 'round'],
      ['ceil(x)', 'ceil'],
      ['floor(x)', 'floor'],
      ['sin(x)', 'sin'],
      ['cos(x)', 'cos'],
      ['tan(x)', 'tan'],
      ['log_ten(x)', 'log_ten'],
    ])('should reject %s', (expression, funcName) => {
      const result = validateMathExpression(expression);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain(`Function '${funcName}' is not supported`);
    });

    it('should reject constants with literal suggestion', () => {
      const result = validateMathExpression('pi()');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("Function 'pi' is not supported");
      expect(result.errors[0]).toContain('3.14159265359');
    });
  });

  describe('invalid expressions', () => {
    it.each([
      ['mean(a, b, c)', "Function 'mean' is not supported"],
      ['sum(a, b)', "Function 'sum' is not supported"],
      ['unknownFunc(x)', "Unknown function 'unknownFunc'"],
      ['count(arr)', "Function 'count' is not supported"],
      ['first(arr)', "Function 'first' is not supported"],
      ['last(arr)', "Function 'last' is not supported"],
      ['random(1, 10)', 'Non-deterministic'],
    ])('should reject %s', (expression, expectedError) => {
      const result = validateMathExpression(expression);
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain(expectedError);
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
