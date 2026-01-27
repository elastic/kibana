/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractFieldsFromMathExpression, inferMathExpressionReturnType } from './field_extractor';

describe('extractFieldsFromMathExpression', () => {
  describe('simple field references', () => {
    it('should extract single field', () => {
      expect(extractFieldsFromMathExpression('x')).toEqual(['x']);
    });

    it('should extract multiple fields from arithmetic', () => {
      expect(extractFieldsFromMathExpression('price * quantity')).toEqual(['price', 'quantity']);
    });

    it('should extract fields from complex expression', () => {
      expect(extractFieldsFromMathExpression('price * quantity + tax')).toEqual([
        'price',
        'quantity',
        'tax',
      ]);
    });

    it('should return sorted array', () => {
      expect(extractFieldsFromMathExpression('z + a + m')).toEqual(['a', 'm', 'z']);
    });
  });

  describe('dotted field paths', () => {
    it('should extract dotted field paths', () => {
      expect(extractFieldsFromMathExpression('attributes.price')).toEqual(['attributes.price']);
    });

    it('should extract multiple dotted paths', () => {
      expect(extractFieldsFromMathExpression('attributes.price * attributes.quantity')).toEqual([
        'attributes.price',
        'attributes.quantity',
      ]);
    });

    it('should handle deeply nested paths', () => {
      expect(extractFieldsFromMathExpression('order.item.price * order.item.qty')).toEqual([
        'order.item.price',
        'order.item.qty',
      ]);
    });

    it('should handle mixed simple and dotted fields', () => {
      expect(extractFieldsFromMathExpression('attributes.price * quantity + tax')).toEqual([
        'attributes.price',
        'quantity',
        'tax',
      ]);
    });
  });

  describe('function expressions', () => {
    it('should extract fields from function arguments', () => {
      expect(extractFieldsFromMathExpression('abs(delta)')).toEqual(['delta']);
    });

    it('should extract fields from nested functions', () => {
      expect(extractFieldsFromMathExpression('sqrt(pow(a, 2) + pow(b, 2))')).toEqual(['a', 'b']);
    });

    it('should extract fields from multiple functions', () => {
      expect(extractFieldsFromMathExpression('abs(x) + sqrt(y)')).toEqual(['x', 'y']);
    });

    it('should not include numeric arguments as fields', () => {
      expect(extractFieldsFromMathExpression('pow(x, 2)')).toEqual(['x']);
      expect(extractFieldsFromMathExpression('round(price, 2)')).toEqual(['price']);
    });
  });

  describe('constants and literals', () => {
    it('should return empty array for constants only', () => {
      expect(extractFieldsFromMathExpression('pi()')).toEqual([]);
      expect(extractFieldsFromMathExpression('e()')).toEqual([]);
      expect(extractFieldsFromMathExpression('tau()')).toEqual([]);
    });

    it('should return empty array for numeric literals only', () => {
      expect(extractFieldsFromMathExpression('2 + 2')).toEqual([]);
      expect(extractFieldsFromMathExpression('3.14 * 2')).toEqual([]);
    });

    it('should only extract fields, not literals', () => {
      expect(extractFieldsFromMathExpression('price * 0.0825')).toEqual(['price']);
      expect(extractFieldsFromMathExpression('100 + bonus')).toEqual(['bonus']);
    });
  });

  describe('deduplication', () => {
    it('should deduplicate repeated field references', () => {
      expect(extractFieldsFromMathExpression('a + a')).toEqual(['a']);
    });

    it('should deduplicate complex repeated references', () => {
      expect(extractFieldsFromMathExpression('a * a + a / a')).toEqual(['a']);
    });

    it('should deduplicate dotted paths', () => {
      expect(extractFieldsFromMathExpression('x.y + x.y * x.y')).toEqual(['x.y']);
    });
  });

  describe('edge cases', () => {
    it('should return empty array for invalid expressions', () => {
      expect(extractFieldsFromMathExpression('a + * b')).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      expect(extractFieldsFromMathExpression('')).toEqual([]);
    });

    it('should handle parenthesized expressions', () => {
      expect(extractFieldsFromMathExpression('(a + b) * c')).toEqual(['a', 'b', 'c']);
    });

    it('should handle expressions starting with subtraction', () => {
      // Note: TinyMath treats '-x' as a variable named '-x', not negation of x
      // This is a TinyMath parsing quirk
      expect(extractFieldsFromMathExpression('0 - x + y')).toEqual(['x', 'y']);
    });
  });

  describe('comparison operators', () => {
    it('should extract fields from comparison functions', () => {
      expect(extractFieldsFromMathExpression('lt(a, b)')).toEqual(['a', 'b']);
      expect(extractFieldsFromMathExpression('gt(price, 100)')).toEqual(['price']);
    });
  });
});

describe('inferMathExpressionReturnType', () => {
  describe('numeric expressions', () => {
    it('should return number for arithmetic operations', () => {
      expect(inferMathExpressionReturnType('a + b')).toBe('number');
      expect(inferMathExpressionReturnType('a - b')).toBe('number');
      expect(inferMathExpressionReturnType('a * b')).toBe('number');
      expect(inferMathExpressionReturnType('a / b')).toBe('number');
    });

    it('should return number for math functions', () => {
      expect(inferMathExpressionReturnType('sqrt(x)')).toBe('number');
      expect(inferMathExpressionReturnType('abs(x)')).toBe('number');
      expect(inferMathExpressionReturnType('pow(x, 2)')).toBe('number');
      expect(inferMathExpressionReturnType('round(x, 2)')).toBe('number');
    });

    it('should return number for constants', () => {
      expect(inferMathExpressionReturnType('pi()')).toBe('number');
      expect(inferMathExpressionReturnType('e()')).toBe('number');
    });

    it('should return number for numeric literals', () => {
      expect(inferMathExpressionReturnType('42')).toBe('number');
      expect(inferMathExpressionReturnType('3.14')).toBe('number');
    });

    it('should return number for single variable', () => {
      expect(inferMathExpressionReturnType('x')).toBe('number');
    });
  });

  describe('boolean expressions (comparison operators)', () => {
    it('should return boolean for operator syntax', () => {
      expect(inferMathExpressionReturnType('a > b')).toBe('boolean');
      expect(inferMathExpressionReturnType('a >= b')).toBe('boolean');
      expect(inferMathExpressionReturnType('a < b')).toBe('boolean');
      expect(inferMathExpressionReturnType('a <= b')).toBe('boolean');
      expect(inferMathExpressionReturnType('a == b')).toBe('boolean');
    });

    it('should return boolean for function syntax', () => {
      expect(inferMathExpressionReturnType('gt(a, b)')).toBe('boolean');
      expect(inferMathExpressionReturnType('gte(a, b)')).toBe('boolean');
      expect(inferMathExpressionReturnType('lt(a, b)')).toBe('boolean');
      expect(inferMathExpressionReturnType('lte(a, b)')).toBe('boolean');
      expect(inferMathExpressionReturnType('eq(a, b)')).toBe('boolean');
      expect(inferMathExpressionReturnType('neq(a, b)')).toBe('boolean');
    });

    it('should return boolean for comparisons with literals', () => {
      expect(inferMathExpressionReturnType('price > 100')).toBe('boolean');
      expect(inferMathExpressionReturnType('status == 200')).toBe('boolean');
      expect(inferMathExpressionReturnType('neq(error_count, 0)')).toBe('boolean');
    });

    it('should return boolean for complex comparisons', () => {
      expect(inferMathExpressionReturnType('a + b > c * d')).toBe('boolean');
      expect(inferMathExpressionReturnType('sqrt(x) >= threshold')).toBe('boolean');
    });
  });

  describe('edge cases', () => {
    it('should return number for invalid expressions', () => {
      expect(inferMathExpressionReturnType('a + * b')).toBe('number');
      expect(inferMathExpressionReturnType('')).toBe('number');
    });
  });
});
