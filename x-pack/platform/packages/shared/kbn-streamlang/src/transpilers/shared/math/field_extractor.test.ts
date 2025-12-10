/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractFieldReferencesFromMathExpression } from './field_extractor';

describe('extractFieldReferencesFromMathExpression', () => {
  describe('simple field references', () => {
    it('should extract single field', () => {
      expect(extractFieldReferencesFromMathExpression('x')).toEqual(['x']);
    });

    it('should extract multiple fields from arithmetic', () => {
      expect(extractFieldReferencesFromMathExpression('price * quantity')).toEqual([
        'price',
        'quantity',
      ]);
    });

    it('should extract fields from complex expression', () => {
      expect(extractFieldReferencesFromMathExpression('price * quantity + tax')).toEqual([
        'price',
        'quantity',
        'tax',
      ]);
    });

    it('should return sorted array', () => {
      expect(extractFieldReferencesFromMathExpression('z + a + m')).toEqual(['a', 'm', 'z']);
    });
  });

  describe('dotted field paths', () => {
    it('should extract dotted field paths', () => {
      expect(extractFieldReferencesFromMathExpression('attributes.price')).toEqual([
        'attributes.price',
      ]);
    });

    it('should extract multiple dotted paths', () => {
      expect(
        extractFieldReferencesFromMathExpression('attributes.price * attributes.quantity')
      ).toEqual(['attributes.price', 'attributes.quantity']);
    });

    it('should handle deeply nested paths', () => {
      expect(extractFieldReferencesFromMathExpression('order.item.price * order.item.qty')).toEqual(
        ['order.item.price', 'order.item.qty']
      );
    });

    it('should handle mixed simple and dotted fields', () => {
      expect(extractFieldReferencesFromMathExpression('attributes.price * quantity + tax')).toEqual(
        ['attributes.price', 'quantity', 'tax']
      );
    });
  });

  describe('function expressions', () => {
    it('should extract fields from function arguments', () => {
      expect(extractFieldReferencesFromMathExpression('abs(delta)')).toEqual(['delta']);
    });

    it('should extract fields from nested functions', () => {
      expect(extractFieldReferencesFromMathExpression('sqrt(pow(a, 2) + pow(b, 2))')).toEqual([
        'a',
        'b',
      ]);
    });

    it('should extract fields from multiple functions', () => {
      expect(extractFieldReferencesFromMathExpression('abs(x) + sqrt(y)')).toEqual(['x', 'y']);
    });

    it('should not include numeric arguments as fields', () => {
      expect(extractFieldReferencesFromMathExpression('pow(x, 2)')).toEqual(['x']);
      expect(extractFieldReferencesFromMathExpression('round(price, 2)')).toEqual(['price']);
    });
  });

  describe('constants and literals', () => {
    it('should return empty array for constants only', () => {
      expect(extractFieldReferencesFromMathExpression('pi()')).toEqual([]);
      expect(extractFieldReferencesFromMathExpression('e()')).toEqual([]);
      expect(extractFieldReferencesFromMathExpression('tau()')).toEqual([]);
    });

    it('should return empty array for numeric literals only', () => {
      expect(extractFieldReferencesFromMathExpression('2 + 2')).toEqual([]);
      expect(extractFieldReferencesFromMathExpression('3.14 * 2')).toEqual([]);
    });

    it('should only extract fields, not literals', () => {
      expect(extractFieldReferencesFromMathExpression('price * 0.0825')).toEqual(['price']);
      expect(extractFieldReferencesFromMathExpression('100 + bonus')).toEqual(['bonus']);
    });
  });

  describe('deduplication', () => {
    it('should deduplicate repeated field references', () => {
      expect(extractFieldReferencesFromMathExpression('a + a')).toEqual(['a']);
    });

    it('should deduplicate complex repeated references', () => {
      expect(extractFieldReferencesFromMathExpression('a * a + a / a')).toEqual(['a']);
    });

    it('should deduplicate dotted paths', () => {
      expect(extractFieldReferencesFromMathExpression('x.y + x.y * x.y')).toEqual(['x.y']);
    });
  });

  describe('edge cases', () => {
    it('should return empty array for invalid expressions', () => {
      expect(extractFieldReferencesFromMathExpression('a + * b')).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      expect(extractFieldReferencesFromMathExpression('')).toEqual([]);
    });

    it('should handle parenthesized expressions', () => {
      expect(extractFieldReferencesFromMathExpression('(a + b) * c')).toEqual(['a', 'b', 'c']);
    });

    it('should handle expressions starting with subtraction', () => {
      // Note: TinyMath treats '-x' as a variable named '-x', not negation of x
      // This is a TinyMath parsing quirk
      expect(extractFieldReferencesFromMathExpression('0 - x + y')).toEqual(['x', 'y']);
    });
  });

  describe('comparison operators', () => {
    it('should extract fields from comparison functions', () => {
      expect(extractFieldReferencesFromMathExpression('lt(a, b)')).toEqual(['a', 'b']);
      expect(extractFieldReferencesFromMathExpression('gt(price, 100)')).toEqual(['price']);
    });
  });
});
