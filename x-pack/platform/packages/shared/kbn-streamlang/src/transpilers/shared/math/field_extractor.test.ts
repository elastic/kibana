/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { extractFieldReferences } from './field_extractor';

describe('extractFieldReferences', () => {
  describe('simple field references', () => {
    it('should extract single field', () => {
      expect(extractFieldReferences('x')).toEqual(['x']);
    });

    it('should extract multiple fields from arithmetic', () => {
      expect(extractFieldReferences('price * quantity')).toEqual(['price', 'quantity']);
    });

    it('should extract fields from complex expression', () => {
      expect(extractFieldReferences('price * quantity + tax')).toEqual([
        'price',
        'quantity',
        'tax',
      ]);
    });

    it('should return sorted array', () => {
      expect(extractFieldReferences('z + a + m')).toEqual(['a', 'm', 'z']);
    });
  });

  describe('dotted field paths', () => {
    it('should extract dotted field paths', () => {
      expect(extractFieldReferences('attributes.price')).toEqual(['attributes.price']);
    });

    it('should extract multiple dotted paths', () => {
      expect(extractFieldReferences('attributes.price * attributes.quantity')).toEqual([
        'attributes.price',
        'attributes.quantity',
      ]);
    });

    it('should handle deeply nested paths', () => {
      expect(extractFieldReferences('order.item.price * order.item.qty')).toEqual([
        'order.item.price',
        'order.item.qty',
      ]);
    });

    it('should handle mixed simple and dotted fields', () => {
      expect(extractFieldReferences('attributes.price * quantity + tax')).toEqual([
        'attributes.price',
        'quantity',
        'tax',
      ]);
    });
  });

  describe('function expressions', () => {
    it('should extract fields from function arguments', () => {
      expect(extractFieldReferences('abs(delta)')).toEqual(['delta']);
    });

    it('should extract fields from nested functions', () => {
      expect(extractFieldReferences('sqrt(pow(a, 2) + pow(b, 2))')).toEqual(['a', 'b']);
    });

    it('should extract fields from multiple functions', () => {
      expect(extractFieldReferences('abs(x) + sqrt(y)')).toEqual(['x', 'y']);
    });

    it('should not include numeric arguments as fields', () => {
      expect(extractFieldReferences('pow(x, 2)')).toEqual(['x']);
      expect(extractFieldReferences('round(price, 2)')).toEqual(['price']);
    });
  });

  describe('constants and literals', () => {
    it('should return empty array for constants only', () => {
      expect(extractFieldReferences('pi()')).toEqual([]);
      expect(extractFieldReferences('e()')).toEqual([]);
      expect(extractFieldReferences('tau()')).toEqual([]);
    });

    it('should return empty array for numeric literals only', () => {
      expect(extractFieldReferences('2 + 2')).toEqual([]);
      expect(extractFieldReferences('3.14 * 2')).toEqual([]);
    });

    it('should only extract fields, not literals', () => {
      expect(extractFieldReferences('price * 0.0825')).toEqual(['price']);
      expect(extractFieldReferences('100 + bonus')).toEqual(['bonus']);
    });
  });

  describe('deduplication', () => {
    it('should deduplicate repeated field references', () => {
      expect(extractFieldReferences('a + a')).toEqual(['a']);
    });

    it('should deduplicate complex repeated references', () => {
      expect(extractFieldReferences('a * a + a / a')).toEqual(['a']);
    });

    it('should deduplicate dotted paths', () => {
      expect(extractFieldReferences('x.y + x.y * x.y')).toEqual(['x.y']);
    });
  });

  describe('edge cases', () => {
    it('should return empty array for invalid expressions', () => {
      expect(extractFieldReferences('a + * b')).toEqual([]);
    });

    it('should return empty array for empty string', () => {
      expect(extractFieldReferences('')).toEqual([]);
    });

    it('should handle parenthesized expressions', () => {
      expect(extractFieldReferences('(a + b) * c')).toEqual(['a', 'b', 'c']);
    });

    it('should handle expressions starting with subtraction', () => {
      // Note: TinyMath treats '-x' as a variable named '-x', not negation of x
      // This is a TinyMath parsing quirk
      expect(extractFieldReferences('0 - x + y')).toEqual(['x', 'y']);
    });
  });

  describe('comparison operators', () => {
    it('should extract fields from comparison functions', () => {
      expect(extractFieldReferences('lt(a, b)')).toEqual(['a', 'b']);
      expect(extractFieldReferences('gt(price, 100)')).toEqual(['price']);
    });
  });
});
