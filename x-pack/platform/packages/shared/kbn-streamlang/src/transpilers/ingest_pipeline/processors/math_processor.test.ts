/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { processMathProcessor } from './math_processor';
import type { MathProcessor } from '../../../../types/processors';

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
          source: "ctx['total'] = (ctx['price'] * ctx['quantity']);",
          description: 'Math processor: price * quantity',
        },
      });
    });

    it('should handle all basic operators', () => {
      const expressions = [
        { expr: 'a + b', expected: "(ctx['a'] + ctx['b'])" },
        { expr: 'a - b', expected: "(ctx['a'] - ctx['b'])" },
        { expr: 'a * b', expected: "(ctx['a'] * ctx['b'])" },
        { expr: 'a / b', expected: "(ctx['a'] / ctx['b'])" },
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
    it('should handle dotted field paths', () => {
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
            "ctx['attributes']['total'] = (ctx['attributes']['price'] * ctx['attributes']['quantity']);",
          description: 'Math processor: attributes.price * attributes.quantity',
        },
      });
    });

    it('should handle deeply nested paths', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'order.item.price * order.item.qty',
        to: 'order.item.total',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['order']['item']['total'] = (ctx['order']['item']['price'] * ctx['order']['item']['qty']);"
      );
    });
  });

  describe('math functions', () => {
    it('should transpile abs()', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'abs(value)',
        to: 'result',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['result'] = Math.abs(ctx['value']);"
      );
    });

    it('should transpile sqrt()', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'sqrt(variance)',
        to: 'std_dev',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['std_dev'] = Math.sqrt(ctx['variance']);"
      );
    });

    it('should transpile pow()', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'pow(base, 2)',
        to: 'squared',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['squared'] = Math.pow(ctx['base'], 2);"
      );
    });

    it('should transpile ceil()', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'ceil(price)',
        to: 'rounded_up',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['rounded_up'] = Math.ceil(ctx['price']);"
      );
    });

    it('should transpile floor()', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'floor(price)',
        to: 'rounded_down',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['rounded_down'] = Math.floor(ctx['price']);"
      );
    });

    it('should transpile round() with single arg', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'round(price)',
        to: 'rounded',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['rounded'] = Math.round(ctx['price']);"
      );
    });

    it('should transpile round() with decimal places', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'round(price, 2)',
        to: 'rounded',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['rounded'] = (Math.round(ctx['price'] * Math.pow(10, 2)) / Math.pow(10, 2));"
      );
    });

    it('should transpile log() with single arg (natural log)', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'log(value)',
        to: 'ln_value',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['ln_value'] = Math.log(ctx['value']);"
      );
    });

    it('should transpile log() with base (change of base formula)', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'log(value, 10)',
        to: 'log10_value',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['log10_value'] = (Math.log(ctx['value']) / Math.log(10));"
      );
    });

    it('should transpile trig functions', () => {
      const functions = ['sin', 'cos', 'tan'];
      for (const fn of functions) {
        const processor: MathProcessor = {
          action: 'math',
          expression: `${fn}(angle)`,
          to: 'result',
        };
        const result = processMathProcessor(processor);
        expect((result.script as Record<string, unknown>).source).toBe(
          `ctx['result'] = Math.${fn}(ctx['angle']);`
        );
      }
    });

    it('should transpile exp()', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'exp(x)',
        to: 'result',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['result'] = Math.exp(ctx['x']);"
      );
    });

    it('should transpile cbrt()', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'cbrt(volume)',
        to: 'side',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['side'] = Math.cbrt(ctx['volume']);"
      );
    });
  });

  describe('constants', () => {
    it('should transpile pi()', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'radius * 2 * pi()',
        to: 'circumference',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['circumference'] = ((ctx['radius'] * 2) * Math.PI);"
      );
    });
  });

  describe('binary operators from registry', () => {
    it('should transpile mod()', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'mod(total, 10)',
        to: 'remainder',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['remainder'] = (ctx['total'] % 10);"
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
        "ctx['is_cheap'] = (ctx['price'] < 100);"
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
        "ctx['is_expensive'] = (ctx['price'] > 100);"
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
        "ctx['is_active'] = (ctx['status'] == 1);"
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
        "ctx['is_not_zero'] = (ctx['status'] != 0);"
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
        "ctx['in_budget'] = (ctx['price'] <= 50);"
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
        "ctx['passed'] = (ctx['score'] >= 60);"
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
        "ctx['is_expensive'] = (ctx['price'] > 100);"
      );
    });
  });

  describe('nested expressions', () => {
    it('should handle nested functions', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'sqrt(pow(a, 2) + pow(b, 2))',
        to: 'hypotenuse',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['hypotenuse'] = Math.sqrt((Math.pow(ctx['a'], 2) + Math.pow(ctx['b'], 2)));"
      );
    });

    it('should handle deeply nested expressions', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'ceil(abs(floor(x)))',
        to: 'result',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['result'] = Math.ceil(Math.abs(Math.floor(ctx['x'])));"
      );
    });
  });

  describe('ignore_missing handling', () => {
    it('should generate null checks for single field', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'abs(value)',
        to: 'result',
        ignore_missing: true,
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "if (ctx['value'] != null) { ctx['result'] = Math.abs(ctx['value']); }"
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
        "if (ctx['price'] != null && ctx['quantity'] != null && ctx['tax'] != null) { ctx['total'] = ((ctx['price'] * ctx['quantity']) + ctx['tax']); }"
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
        "if (ctx['attributes']['price'] != null && ctx['attributes']['qty'] != null) { ctx['total'] = (ctx['attributes']['price'] * ctx['attributes']['qty']); }"
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
        "ctx['total'] = (ctx['price'] * ctx['quantity']);"
      );
    });

    it('should handle expressions with no fields (constants only)', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'pi() * 2',
        to: 'tau_value',
        ignore_missing: true,
      };
      const result = processMathProcessor(processor);
      // No null checks needed - no fields
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['tau_value'] = (Math.PI * 2);"
      );
    });
  });

  describe('where condition handling', () => {
    it('should add if parameter for where condition', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'price * quantity',
        to: 'total',
        where: { field: 'active', eq: true },
      };
      const result = processMathProcessor(processor);
      expect(result.script).toHaveProperty('if');
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

  describe('validation errors', () => {
    it('should throw error for rejected functions', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'mean(a, b, c)',
        to: 'average',
      };
      expect(() => processMathProcessor(processor)).toThrow(/Function 'mean' is not supported/);
    });

    it('should throw error for unknown functions', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'unknownFunc(a)',
        to: 'result',
      };
      expect(() => processMathProcessor(processor)).toThrow(/Unknown function 'unknownFunc'/);
    });

    it('should throw error for invalid syntax', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'price * * quantity',
        to: 'result',
      };
      expect(() => processMathProcessor(processor)).toThrow(/Failed to parse expression/);
    });
  });
});
