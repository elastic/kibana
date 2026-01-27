/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { processMathProcessor } from './math_processor';
import type { MathProcessor } from '../../../../types/processors';
import { conditionToPainless } from '../../../conditions/condition_to_painless';

describe('processMathProcessor', () => {
  describe('basic arithmetic', () => {
    it('should transpile simple addition', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: '2 + 2',
        to: 'result',
      };
      const result = processMathProcessor(processor);
      expect(result).toEqual({
        script: {
          lang: 'painless',
          source: "ctx['result'] = (2 + 2);",
          description: 'Math processor: 2 + 2',
        },
      });
    });

    it('should transpile field multiplication', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'price * quantity',
        to: 'total',
      };
      const result = processMathProcessor(processor);
      expect(result).toEqual({
        script: {
          lang: 'painless',
          source: "ctx['total'] = ($('price', null) * $('quantity', null));",
          description: 'Math processor: price * quantity',
        },
      });
    });

    it('should handle all basic operators', () => {
      const expressions = [
        { expr: 'a + b', expected: "($('a', null) + $('b', null))" },
        { expr: 'a - b', expected: "($('a', null) - $('b', null))" },
        { expr: 'a * b', expected: "($('a', null) * $('b', null))" },
        { expr: 'a / b', expected: "($('a', null) / $('b', null))" },
      ];

      for (const { expr, expected } of expressions) {
        const processor: MathProcessor = { action: 'math', expression: expr, to: 'result' };
        const result = processMathProcessor(processor);
        expect((result.script as Record<string, unknown>).source).toBe(
          `ctx['result'] = ${expected};`
        );
      }
    });
  });

  describe('nested field paths', () => {
    it('should handle dotted field paths with flat key assignment', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'attributes.price * attributes.quantity',
        to: 'attributes.total',
      };
      const result = processMathProcessor(processor);
      expect(result).toEqual({
        script: {
          lang: 'painless',
          source:
            "ctx['attributes.total'] = ($('attributes.price', null) * $('attributes.quantity', null));",
          description: 'Math processor: attributes.price * attributes.quantity',
        },
      });
    });

    it('should handle deeply nested paths with flat key assignment', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'order.item.price * order.item.qty',
        to: 'order.item.total',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['order.item.total'] = ($('order.item.price', null) * $('order.item.qty', null));"
      );
    });
  });

  describe('log function', () => {
    it('should transpile log() (natural log)', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'log(value)',
        to: 'ln_value',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['ln_value'] = Math.log($('value', null));"
      );
    });

    it('should transpile log with literal', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'log(100)',
        to: 'result',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['result'] = Math.log(100);"
      );
    });

    it('should transpile log with expression', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'log(a * b)',
        to: 'result',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['result'] = Math.log(($('a', null) * $('b', null)));"
      );
    });
  });

  describe('comparison operators', () => {
    it('should transpile lt()', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'lt(price, 100)',
        to: 'is_cheap',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['is_cheap'] = ($('price', null) < 100);"
      );
    });

    it('should transpile gt()', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'gt(price, 100)',
        to: 'is_expensive',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['is_expensive'] = ($('price', null) > 100);"
      );
    });

    it('should transpile eq()', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'eq(status, 1)',
        to: 'is_active',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['is_active'] = ($('status', null) == 1);"
      );
    });

    it('should transpile neq()', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'neq(status, 0)',
        to: 'is_not_zero',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['is_not_zero'] = ($('status', null) != 0);"
      );
    });

    it('should transpile lte()', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'lte(price, 50)',
        to: 'in_budget',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['in_budget'] = ($('price', null) <= 50);"
      );
    });

    it('should transpile gte()', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'gte(score, 60)',
        to: 'passed',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['passed'] = ($('score', null) >= 60);"
      );
    });

    it('should handle infix comparison syntax', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'price > 100',
        to: 'is_expensive',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['is_expensive'] = ($('price', null) > 100);"
      );
    });
  });

  describe('ignore_missing handling', () => {
    it('should generate null checks for single field', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'value * 2',
        to: 'result',
        ignore_missing: true,
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "if ($('value', null) != null) { ctx['result'] = ($('value', null) * 2); }"
      );
    });

    it('should generate null checks for multiple fields', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'price * quantity + tax',
        to: 'total',
        ignore_missing: true,
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "if ($('price', null) != null && $('quantity', null) != null && $('tax', null) != null) { ctx['total'] = (($('price', null) * $('quantity', null)) + $('tax', null)); }"
      );
    });

    it('should handle dotted paths in null checks', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'attributes.price * attributes.qty',
        to: 'total',
        ignore_missing: true,
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "if ($('attributes.price', null) != null && $('attributes.qty', null) != null) { ctx['total'] = ($('attributes.price', null) * $('attributes.qty', null)); }"
      );
    });

    it('should not generate null checks when ignore_missing is false', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'price * quantity',
        to: 'total',
        ignore_missing: false,
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['total'] = ($('price', null) * $('quantity', null));"
      );
    });
  });

  describe('if condition handling', () => {
    it('should add if parameter when provided (compiled from where condition)', () => {
      const whereCondition = { field: 'active', eq: true };
      const compiledIf = conditionToPainless(whereCondition);

      const processor: Parameters<typeof processMathProcessor>[0] = {
        action: 'math',
        expression: 'price * quantity',
        to: 'total',
        if: compiledIf,
      };
      const result = processMathProcessor(processor);
      expect(result.script).toHaveProperty('if');
      expect((result.script as Record<string, unknown>).if).toBe(compiledIf);
      expect((result.script as Record<string, unknown>).if).toContain('active');
    });
  });

  describe('optional parameters', () => {
    it('should include tag when provided', () => {
      const processor: MathProcessor & { tag?: string } = {
        action: 'math',
        expression: 'price * quantity',
        to: 'total',
        tag: 'calc_total',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).tag).toBe('calc_total');
    });

    it('should include ignore_failure when true', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'price * quantity',
        to: 'total',
        ignore_failure: true,
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).ignore_failure).toBe(true);
    });

    it('should always include description', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'a + b',
        to: 'sum',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).description).toBe('Math processor: a + b');
    });
  });

  describe('validation errors for rejected functions', () => {
    it.each([
      ['abs(value)', 'abs'],
      ['sqrt(value)', 'sqrt'],
      ['pow(base, 2)', 'pow'],
      ['sin(angle)', 'sin'],
      ['pi()', 'pi'],
      ['mod(a, 10)', 'mod'],
      ['round(price)', 'round'],
    ])('should generate error-throwing script for: %s', (expression, funcName) => {
      const processor: MathProcessor = { action: 'math', expression, to: 'result' };
      const result = processMathProcessor(processor);
      const source = (result.script as Record<string, unknown>).source as string;
      expect(source).toContain('throw new IllegalArgumentException("');
      expect(source).toContain(funcName);
      expect(source).toContain('not supported');
    });

    it('should generate error-throwing script for unknown functions', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'unknownFunc(a)',
        to: 'result',
      };
      const result = processMathProcessor(processor);
      const source = (result.script as Record<string, unknown>).source as string;
      expect(source).toContain('throw new IllegalArgumentException("');
      expect(source).toContain('Unknown function');
    });

    it('should generate error-throwing script for invalid syntax', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'price * * quantity',
        to: 'result',
      };
      const result = processMathProcessor(processor);
      const source = (result.script as Record<string, unknown>).source as string;
      expect(source).toContain('throw new IllegalArgumentException("');
      expect(source).toContain('Failed to parse expression');
    });
  });
});
