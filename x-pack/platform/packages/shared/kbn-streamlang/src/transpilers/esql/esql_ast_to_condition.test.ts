/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Builder } from '@kbn/esql-ast';
import { esqlAstExpressionToCondition } from './esql_ast_to_condition';
import { BinaryExpressionOperator } from '@kbn/esql-ast/src/types';

describe('esqlAstExpressionToCondition', () => {
  describe('Binary operators', () => {
    it('should convert == operator to eq condition', () => {
      const expr = Builder.expression.func.binary('==', [
        Builder.expression.column('field'),
        Builder.expression.literal.string('value'),
      ]);
      
      const condition = esqlAstExpressionToCondition(expr);
      expect(condition).toEqual({ field: 'field', eq: 'value' });
    });

    it('should convert != operator to neq condition', () => {
      const expr = Builder.expression.func.binary('!=', [
        Builder.expression.column('field'),
        Builder.expression.literal.integer(42),
      ]);
      
      const condition = esqlAstExpressionToCondition(expr);
      expect(condition).toEqual({ field: 'field', neq: 42 });
    });

    it('should convert comparison operators', () => {
      const operators = [
        { op: '>', expected: 'gt' },
        { op: '>=', expected: 'gte' },
        { op: '<', expected: 'lt' },
        { op: '<=', expected: 'lte' },
      ];

      operators.forEach(({ op, expected }) => {
        const expr = Builder.expression.func.binary(op as BinaryExpressionOperator, [
          Builder.expression.column('field'),
          Builder.expression.literal.decimal(10.5),
        ]);
        
        const condition = esqlAstExpressionToCondition(expr);
        expect(condition).toEqual({ field: 'field', [expected]: 10.5 });
      });
    });

    it('should handle reversed operands (literal first)', () => {
      const expr = Builder.expression.func.binary('==', [
        Builder.expression.literal.string('value'),
        Builder.expression.column('field'),
      ]);
      
      const condition = esqlAstExpressionToCondition(expr);
      expect(condition).toEqual({ field: 'field', eq: 'value' });
    });

    it('should handle boolean literals', () => {
      const expr = Builder.expression.func.binary('==', [
        Builder.expression.column('active'),
        Builder.expression.literal.boolean(true),
      ]);
      
      const condition = esqlAstExpressionToCondition(expr);
      expect(condition).toEqual({ field: 'active', eq: true });
    });
  });

  describe('Logical operators', () => {
    it('should convert AND operator', () => {
      const expr = Builder.expression.func.binary('and', [
        Builder.expression.func.binary('==', [
          Builder.expression.column('field1'),
          Builder.expression.literal.string('value1'),
        ]),
        Builder.expression.func.binary('==', [
          Builder.expression.column('field2'),
          Builder.expression.literal.string('value2'),
        ]),
      ]);
      
      const condition = esqlAstExpressionToCondition(expr);
      expect(condition).toEqual({
        and: [
          { field: 'field1', eq: 'value1' },
          { field: 'field2', eq: 'value2' },
        ],
      });
    });

    it('should convert OR operator', () => {
      const expr = Builder.expression.func.binary('or', [
        Builder.expression.func.binary('==', [
          Builder.expression.column('field1'),
          Builder.expression.literal.string('value1'),
        ]),
        Builder.expression.func.binary('==', [
          Builder.expression.column('field2'),
          Builder.expression.literal.string('value2'),
        ]),
      ]);
      
      const condition = esqlAstExpressionToCondition(expr);
      expect(condition).toEqual({
        or: [
          { field: 'field1', eq: 'value1' },
          { field: 'field2', eq: 'value2' },
        ],
      });
    });
  });

  describe('LIKE operator', () => {
    it('should convert LIKE with % wildcards to contains', () => {
      const expr = Builder.expression.func.call('like', [
        Builder.expression.column('message'),
        Builder.expression.literal.string('%error%'),
      ]);
      
      const condition = esqlAstExpressionToCondition(expr);
      expect(condition).toEqual({ field: 'message', contains: 'error' });
    });

    it('should convert LIKE with trailing % to startsWith', () => {
      const expr = Builder.expression.func.call('like', [
        Builder.expression.column('message'),
        Builder.expression.literal.string('error%'),
      ]);
      
      const condition = esqlAstExpressionToCondition(expr);
      expect(condition).toEqual({ field: 'message', startsWith: 'error' });
    });

    it('should convert LIKE with leading % to endsWith', () => {
      const expr = Builder.expression.func.call('like', [
        Builder.expression.column('message'),
        Builder.expression.literal.string('%error'),
      ]);
      
      const condition = esqlAstExpressionToCondition(expr);
      expect(condition).toEqual({ field: 'message', endsWith: 'error' });
    });

    it('should convert LIKE without wildcards to eq', () => {
      const expr = Builder.expression.func.call('like', [
        Builder.expression.column('message'),
        Builder.expression.literal.string('exact match'),
      ]);
      
      const condition = esqlAstExpressionToCondition(expr);
      expect(condition).toEqual({ field: 'message', eq: 'exact match' });
    });

    it('should return undefined for LIKE with underscore wildcard', () => {
      const expr = Builder.expression.func.call('like', [
        Builder.expression.column('message'),
        Builder.expression.literal.string('err_r'),
      ]);
      
      const condition = esqlAstExpressionToCondition(expr);
      expect(condition).toBeUndefined();
    });
  });

  describe('IN operator', () => {
    it('should convert IN with single value to eq', () => {
      const expr = Builder.expression.func.call('in', [
        Builder.expression.column('status'),
        Builder.expression.literal.string('active'),
      ]);
      
      const condition = esqlAstExpressionToCondition(expr);
      expect(condition).toEqual({ field: 'status', eq: 'active' });
    });

    it('should convert IN with multiple values to OR', () => {
      const expr = Builder.expression.func.call('in', [
        Builder.expression.column('status'),
        Builder.expression.list.literal({
          values: [
            Builder.expression.literal.string('active'),
            Builder.expression.literal.string('pending'),
            Builder.expression.literal.string('approved'),
          ],
        }),
      ]);
      
      const condition = esqlAstExpressionToCondition(expr);
      expect(condition).toEqual({
        or: [
          { field: 'status', eq: 'active' },
          { field: 'status', eq: 'pending' },
          { field: 'status', eq: 'approved' },
        ],
      });
    });

    it('should handle IN with mixed value types', () => {
      const expr = Builder.expression.func.call('in', [
        Builder.expression.column('value'),
        Builder.expression.list.literal({
          values: [
            Builder.expression.literal.string('text'),
            Builder.expression.literal.integer(42),
            Builder.expression.literal.boolean(true),
          ],
        }),
      ]);
      
      const condition = esqlAstExpressionToCondition(expr);
      expect(condition).toEqual({
        or: [
          { field: 'value', eq: 'text' },
          { field: 'value', eq: 42 },
          { field: 'value', eq: true },
        ],
      });
    });
  });

  describe('NOT IN operator', () => {
    it('should convert NOT IN with single value to neq', () => {
      const expr = Builder.expression.func.call('NOT IN', [
        Builder.expression.column('status'),
        Builder.expression.literal.string('inactive'),
      ]);
      
      const condition = esqlAstExpressionToCondition(expr);
      expect(condition).toEqual({ field: 'status', neq: 'inactive' });
    });

    it('should convert NOT IN with multiple values to AND of neq', () => {
      const expr = Builder.expression.func.call('NOT IN', [
        Builder.expression.column('status'),
        Builder.expression.list.literal({
          values: [
            Builder.expression.literal.string('inactive'),
            Builder.expression.literal.string('deleted'),
          ],
        }),
      ]);
      
      const condition = esqlAstExpressionToCondition(expr);
      expect(condition).toEqual({
        and: [
          { field: 'status', neq: 'inactive' },
          { field: 'status', neq: 'deleted' },
        ],
      });
    });
  });

  describe('NULL checks', () => {
    it('should convert IS NULL to exists: false', () => {
      const expr = Builder.expression.func.postfix('IS NULL', 
        Builder.expression.column('field')
      );
      
      const condition = esqlAstExpressionToCondition(expr);
      expect(condition).toEqual({ field: 'field', exists: false });
    });

    it('should convert IS NOT NULL to exists: true', () => {
      const expr = Builder.expression.func.postfix('IS NOT NULL', 
        Builder.expression.column('field')
      );
      
      const condition = esqlAstExpressionToCondition(expr);
      expect(condition).toEqual({ field: 'field', exists: true });
    });
  });

  describe('NOT operator', () => {
    it('should negate simple conditions', () => {
      const expr = Builder.expression.func.unary('NOT', 
        Builder.expression.func.binary('==', [
          Builder.expression.column('field'),
          Builder.expression.literal.string('value'),
        ])
      );
      
      const condition = esqlAstExpressionToCondition(expr);
      expect(condition).toEqual({ not: { field: 'field', eq: 'value' } });
    });

    it('should normalize NOT(IS NULL) to exists: true', () => {
      const expr = Builder.expression.func.unary('NOT', 
        Builder.expression.func.postfix('IS NULL', 
          Builder.expression.column('field')
        )
      );
      
      const condition = esqlAstExpressionToCondition(expr);
      expect(condition).toEqual({ field: 'field', exists: true });
    });

    it('should handle NOT with complex conditions', () => {
      const expr = Builder.expression.func.unary('NOT', 
        Builder.expression.func.binary('or', [
          Builder.expression.func.binary('==', [
            Builder.expression.column('field1'),
            Builder.expression.literal.string('value1'),
          ]),
          Builder.expression.func.binary('==', [
            Builder.expression.column('field2'),
            Builder.expression.literal.string('value2'),
          ]),
        ])
      );
      
      const condition = esqlAstExpressionToCondition(expr);
      expect(condition).toEqual({
        not: {
          or: [
            { field: 'field1', eq: 'value1' },
            { field: 'field2', eq: 'value2' },
          ],
        },
      });
    });
  });

  describe('Edge cases', () => {
    it('should return undefined for unsupported expressions', () => {
      const expr = Builder.expression.func.call('RANDOM_FUNCTION', [
        Builder.expression.column('field'),
      ]);
      
      const condition = esqlAstExpressionToCondition(expr);
      expect(condition).toBeUndefined();
    });

    it('should return undefined for expressions without field', () => {
      const expr = Builder.expression.func.binary('==', [
        Builder.expression.literal.string('value1'),
        Builder.expression.literal.string('value2'),
      ]);
      
      const condition = esqlAstExpressionToCondition(expr);
      expect(condition).toBeUndefined();
    });

    it('should handle nested function calls', () => {
      const expr = Builder.expression.func.binary('and', [
        Builder.expression.func.unary('NOT', 
          Builder.expression.func.postfix('IS NULL', 
            Builder.expression.column('field1')
          )
        ),
        Builder.expression.func.call('like', [
          Builder.expression.column('field2'),
          Builder.expression.literal.string('%test%'),
        ]),
      ]);
      
      const condition = esqlAstExpressionToCondition(expr);
      expect(condition).toEqual({
        and: [
          { field: 'field1', exists: true },
          { field: 'field2', contains: 'test' },
        ],
      });
    });
  });

  describe('String literal handling', () => {
    it('should handle ES|QL string literals with valueUnquoted', () => {
      // Simulate an ES|QL string literal with valueUnquoted property
      const stringLiteral = Builder.expression.literal.string('test value');
      (stringLiteral as any).valueUnquoted = 'test value';
      
      const expr = Builder.expression.func.binary('==', [
        Builder.expression.column('field'),
        stringLiteral,
      ]);
      
      const condition = esqlAstExpressionToCondition(expr);
      expect(condition).toEqual({ field: 'field', eq: 'test value' });
    });

    it('should handle quoted strings in text property', () => {
      // Simulate a literal with only text property containing quotes
      const literal = Builder.expression.literal.string('');
      (literal as any).text = '"quoted string"';
      delete (literal as any).value;
      
      const expr = Builder.expression.func.binary('==', [
        Builder.expression.column('field'),
        literal,
      ]);
      
      const condition = esqlAstExpressionToCondition(expr);
      expect(condition).toEqual({ field: 'field', eq: 'quoted string' });
    });

    it('should handle escaped quotes in strings', () => {
      const literal = Builder.expression.literal.string('');
      (literal as any).text = '"string with \\"escaped\\" quotes"';
      delete (literal as any).value;
      
      const expr = Builder.expression.func.binary('==', [
        Builder.expression.column('field'),
        literal,
      ]);
      
      const condition = esqlAstExpressionToCondition(expr);
      expect(condition).toEqual({ field: 'field', eq: 'string with "escaped" quotes' });
    });
  });
});

