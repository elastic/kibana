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
          // Uses flat key assignment to be consistent with $() reading
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
      // Uses flat key for target to be consistent with $() flexible access
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['order.item.total'] = ($('order.item.price', null) * $('order.item.qty', null));"
      );
    });

    it('should not add initialization for non-nested target field', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'price * quantity',
        to: 'total',
      };
      const result = processMathProcessor(processor);
      // Flat key assignment - no parent initialization needed
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['total'] = ($('price', null) * $('quantity', null));"
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
        "ctx['result'] = Math.abs($('value', null));"
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
        "ctx['std_dev'] = Math.sqrt($('variance', null));"
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
        "ctx['squared'] = Math.pow($('base', null), 2);"
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
        "ctx['rounded_up'] = Math.ceil($('price', null));"
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
        "ctx['rounded_down'] = Math.floor($('price', null));"
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
        "ctx['rounded'] = Math.round($('price', null));"
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
        "ctx['rounded'] = (Math.round($('price', null) * Math.pow(10, 2)) / Math.pow(10, 2));"
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
        "ctx['ln_value'] = Math.log($('value', null));"
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
        "ctx['log10_value'] = (Math.log($('value', null)) / Math.log(10));"
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
          `ctx['result'] = Math.${fn}($('angle', null));`
        );
      }
    });

    it('should transpile inverse trig functions', () => {
      const functions = ['asin', 'acos', 'atan'];
      for (const fn of functions) {
        const processor: MathProcessor = {
          action: 'math',
          expression: `${fn}(ratio)`,
          to: 'angle',
        };
        const result = processMathProcessor(processor);
        expect((result.script as Record<string, unknown>).source).toBe(
          `ctx['angle'] = Math.${fn}($('ratio', null));`
        );
      }
    });

    it('should transpile atan_two()', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'atan_two(y, x)',
        to: 'heading',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['heading'] = Math.atan2($('y', null), $('x', null));"
      );
    });

    it('should transpile hyperbolic functions', () => {
      const functions = ['sinh', 'cosh', 'tanh'];
      for (const fn of functions) {
        const processor: MathProcessor = {
          action: 'math',
          expression: `${fn}(x)`,
          to: 'result',
        };
        const result = processMathProcessor(processor);
        expect((result.script as Record<string, unknown>).source).toBe(
          `ctx['result'] = Math.${fn}($('x', null));`
        );
      }
    });

    it('should transpile signum()', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'signum(delta)',
        to: 'sign',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['sign'] = Math.signum($('delta', null));"
      );
    });

    it('should transpile log_ten()', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'log_ten(bytes)',
        to: 'magnitude',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['magnitude'] = Math.log10($('bytes', null));"
      );
    });

    it('should transpile hypot()', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'hypot(x, y)',
        to: 'distance',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['distance'] = Math.hypot($('x', null), $('y', null));"
      );
    });

    it('should transpile exp()', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'exp(x)',
        to: 'result',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['result'] = Math.exp($('x', null));"
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
        "ctx['side'] = Math.cbrt($('volume', null));"
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
        "ctx['circumference'] = (($('radius', null) * 2) * Math.PI);"
      );
    });

    it('should transpile tau()', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'radius * tau()',
        to: 'circumference',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['circumference'] = ($('radius', null) * (2 * Math.PI));"
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
        "ctx['remainder'] = ($('total', null) % 10);"
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

  describe('nested expressions', () => {
    it('should handle nested functions', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'sqrt(pow(a, 2) + pow(b, 2))',
        to: 'hypotenuse',
      };
      const result = processMathProcessor(processor);
      expect((result.script as Record<string, unknown>).source).toBe(
        "ctx['hypotenuse'] = Math.sqrt((Math.pow($('a', null), 2) + Math.pow($('b', null), 2)));"
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
        "ctx['result'] = Math.ceil(Math.abs(Math.floor($('x', null))));"
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
        "if ($('value', null) != null) { ctx['result'] = Math.abs($('value', null)); }"
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

  describe('if condition handling', () => {
    it('should add if parameter when provided (compiled from where condition)', () => {
      // Simulate how conversions.ts compiles 'where' to 'if' before calling processMathProcessor
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

  describe('validation errors', () => {
    // Invalid expressions generate a Painless script that throws at runtime,
    // allowing simulation to run and capture errors like other processor errors.
    it('should generate error-throwing script for rejected functions', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'mean(a, b, c)',
        to: 'average',
      };
      const result = processMathProcessor(processor);
      const source = (result.script as Record<string, unknown>).source as string;
      expect(source).toContain('throw new IllegalArgumentException("');
      expect(source).toContain('mean');
      expect(source).toContain('is not supported');
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
      expect(source).toContain('unknownFunc');
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
