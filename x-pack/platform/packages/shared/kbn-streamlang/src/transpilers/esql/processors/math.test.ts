/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Builder, type ESQLAstCommand } from '@kbn/esql-ast';
import { convertMathProcessorToESQL } from './math';
import { type MathProcessor } from '../../../../types/processors';

/**
 * Helper to convert ESQLAstCommand[] to a string for assertion
 */
function commandsToString(commands: ESQLAstCommand[]): string {
  const query = Builder.expression.query(commands);
  return BasicPrettyPrinter.print(query);
}

describe('convertMathProcessorToESQL', () => {
  describe('simple literals', () => {
    it('should transpile numeric addition: "2 + 2"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: '2 + 2',
        to: 'result',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      // Whole numbers are rendered as integers (no .0 suffix)
      expect(result).toBe('EVAL result = 2 + 2');
    });

    it('should transpile numeric subtraction: "10 - 5"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: '10 - 5',
        to: 'result',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      // Whole numbers are rendered as integers (no .0 suffix)
      expect(result).toBe('EVAL result = 10 - 5');
    });

    it('should transpile numeric multiplication: "3 * 4"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: '3 * 4',
        to: 'result',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL result = 3 * 4');
    });

    it('should transpile numeric division: "20 / 4"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: '20 / 4',
        to: 'result',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      // Whole numbers are rendered as integers (no .0 suffix)
      expect(result).toBe('EVAL result = 20 / 4');
    });
  });

  describe('field references', () => {
    it('should transpile simple field multiplication: "price * quantity"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'price * quantity',
        to: 'total',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL total = price * quantity');
    });

    it('should transpile field addition: "a + b"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'a + b',
        to: 'sum',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL sum = a + b');
    });
  });

  describe('dotted field paths', () => {
    it('should transpile dotted field paths: "attributes.price * attributes.quantity"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'attributes.price * attributes.quantity',
        to: 'total',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      // ES|QL Builder quotes dotted paths with backticks
      expect(result).toBe('EVAL total = `attributes.price` * `attributes.quantity`');
    });

    it('should transpile mixed dotted and simple fields: "attributes.price * quantity + tax"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'attributes.price * quantity + tax',
        to: 'final_price',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL final_price = `attributes.price` * quantity + tax');
    });

    it('should transpile deeply nested paths: "order.item.price * order.item.qty"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'order.item.price * order.item.qty',
        to: 'order.item.total',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL `order.item.total` = `order.item.price` * `order.item.qty`');
    });
  });

  describe('operator precedence', () => {
    it('should respect operator precedence: "a + b * c"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'a + b * c',
        to: 'result',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      // TinyMath parses this with correct precedence (multiplication first)
      expect(result).toBe('EVAL result = a + b * c');
    });

    it('should handle subtraction and division: "a - b / c"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'a - b / c',
        to: 'result',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL result = a - b / c');
    });
  });

  describe('parentheses', () => {
    it('should honor parentheses: "(a + b) * c"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: '(a + b) * c',
        to: 'result',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL result = (a + b) * c');
    });

    it('should handle nested parentheses: "((a + b) * (c - d))"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: '((a + b) * (c - d))',
        to: 'result',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL result = (a + b) * (c - d)');
    });
  });

  describe('negative numbers', () => {
    it('should handle negative literals: "-5 + a"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: '-5 + a',
        to: 'result',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      // Negative whole numbers are rendered as integers
      expect(result).toBe('EVAL result = -5 + a');
    });

    it('should handle negative field subtraction: "a - -10"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'a - -10',
        to: 'result',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL result = a - -10');
    });
  });

  describe('decimal numbers', () => {
    it('should handle decimal literals: "price * 0.0825"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'price * 0.0825',
        to: 'tax',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL tax = price * 0.0825');
    });
  });

  describe('complex expressions', () => {
    it('should handle a realistic pricing calculation', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'attributes.price * attributes.quantity + attributes.shipping',
        to: 'attributes.total',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe(
        'EVAL `attributes.total` = `attributes.price` * `attributes.quantity` + `attributes.shipping`'
      );
    });
  });

  // Math Functions
  describe('single-argument functions', () => {
    it('should transpile abs(): "abs(price - 10)"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'abs(price - 10)',
        to: 'diff',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL diff = ABS(price - 10)');
    });

    it('should transpile sqrt(): "sqrt(variance)"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'sqrt(variance)',
        to: 'std_dev',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL std_dev = SQRT(variance)');
    });

    it('should transpile cbrt(): "cbrt(volume)"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'cbrt(volume)',
        to: 'side',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL side = CBRT(volume)');
    });

    it('should transpile ceil(): "ceil(price)"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'ceil(price)',
        to: 'rounded_up',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL rounded_up = CEIL(price)');
    });

    it('should transpile floor(): "floor(price)"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'floor(price)',
        to: 'rounded_down',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL rounded_down = FLOOR(price)');
    });

    it('should transpile exp(): "exp(rate)"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'exp(rate)',
        to: 'growth_factor',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL growth_factor = EXP(rate)');
    });

    it('should transpile sin(): "sin(angle)"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'sin(angle)',
        to: 'sine_value',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL sine_value = SIN(angle)');
    });

    it('should transpile cos(): "cos(angle)"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'cos(angle)',
        to: 'cosine_value',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL cosine_value = COS(angle)');
    });

    it('should transpile tan(): "tan(angle)"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'tan(angle)',
        to: 'tangent_value',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL tangent_value = TAN(angle)');
    });

    // Inverse trigonometric functions
    it('should transpile asin(): "asin(ratio)"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'asin(ratio)',
        to: 'angle',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL angle = ASIN(ratio)');
    });

    it('should transpile acos(): "acos(ratio)"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'acos(ratio)',
        to: 'angle',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL angle = ACOS(ratio)');
    });

    it('should transpile atan(): "atan(slope)"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'atan(slope)',
        to: 'angle',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL angle = ATAN(slope)');
    });

    it('should transpile atan_two(): "atan_two(y, x)"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'atan_two(delta_y, delta_x)',
        to: 'heading',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL heading = ATAN2(delta_y, delta_x)');
    });

    // Hyperbolic functions
    it('should transpile sinh(): "sinh(x)"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'sinh(x)',
        to: 'result',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL result = SINH(x)');
    });

    it('should transpile cosh(): "cosh(x)"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'cosh(x)',
        to: 'result',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL result = COSH(x)');
    });

    it('should transpile tanh(): "tanh(x)"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'tanh(x)',
        to: 'result',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL result = TANH(x)');
    });

    // Additional math functions
    it('should transpile signum(): "signum(delta)"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'signum(delta)',
        to: 'sign',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL sign = SIGNUM(delta)');
    });

    it('should transpile log_ten(): "log_ten(bytes)"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'log_ten(bytes)',
        to: 'magnitude',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL magnitude = LOG10(bytes)');
    });

    it('should transpile hypot(): "hypot(x, y)"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'hypot(delta_x, delta_y)',
        to: 'distance',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL distance = HYPOT(delta_x, delta_y)');
    });

    it('should transpile tau(): "radius * tau()"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'radius * tau()',
        to: 'circumference',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL circumference = radius * TAU()');
    });
  });

  describe('variable-arity functions', () => {
    it('should transpile round() with single arg: "round(price)"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'round(price)',
        to: 'rounded',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL rounded = ROUND(price)');
    });

    it('should transpile round() with two args: "round(price, 2)"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'round(price, 2)',
        to: 'rounded',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL rounded = ROUND(price, 2)');
    });

    it('should transpile log() with single arg (natural log): "log(value)"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'log(value)',
        to: 'ln_value',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL ln_value = LOG(value)');
    });

    it('should transpile log() with two args and swap: "log(value, base)" -> LOG(base, value)', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'log(value, 10)',
        to: 'log_base_10',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      // ES|QL uses LOG(base, value), so args are swapped
      expect(result).toBe('EVAL log_base_10 = LOG(10, value)');
    });
  });

  describe('two-argument functions', () => {
    it('should transpile pow(): "pow(base, exponent)"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'pow(base, 2)',
        to: 'squared',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL squared = POW(base, 2)');
    });
  });

  describe('binary operators from registry', () => {
    it('should transpile mod(): "mod(a, b)" -> "a % b"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'mod(total, 10)',
        to: 'remainder',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL remainder = total % 10');
    });
  });

  describe('comparison operators', () => {
    it('should transpile lt(): "lt(a, b)" -> "a < b"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'lt(price, 100)',
        to: 'is_cheap',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL is_cheap = price < 100');
    });

    it('should transpile gt(): "gt(a, b)" -> "a > b"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'gt(price, 100)',
        to: 'is_expensive',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL is_expensive = price > 100');
    });

    it('should transpile eq(): "eq(a, b)" -> "a == b"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'eq(status, 1)',
        to: 'is_active',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL is_active = status == 1');
    });

    it('should transpile neq(): "neq(a, b)" -> "a != b"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'neq(status, 0)',
        to: 'is_not_zero',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL is_not_zero = status != 0');
    });

    it('should transpile lte(): "lte(a, b)" -> "a <= b"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'lte(price, 50)',
        to: 'in_budget',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL in_budget = price <= 50');
    });

    it('should transpile gte(): "gte(a, b)" -> "a >= b"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'gte(score, 60)',
        to: 'passed',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      // Note: BasicPrettyPrinter adds backticks to field names in comparison context
      expect(result).toBe('EVAL passed = `score` >= 60');
    });

    it('should handle comparison with dotted fields', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'gt(attributes.cpu_usage, attributes.memory_usage)',
        to: 'attributes.cpu_dominant',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe(
        'EVAL `attributes.cpu_dominant` = `attributes.cpu_usage` > `attributes.memory_usage`'
      );
    });

    it('should handle infix comparison syntax: "a > b"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'price > 100',
        to: 'is_expensive',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL is_expensive = price > 100');
    });

    it('should handle infix comparison syntax: "a == b"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'status == 1',
        to: 'is_active',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL is_active = status == 1');
    });
  });

  describe('constants', () => {
    it('should transpile pi(): "pi()"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'radius * 2 * pi()',
        to: 'circumference',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL circumference = radius * 2 * PI()');
    });
  });

  describe('nested function expressions', () => {
    it('should handle nested functions: "sqrt(pow(a, 2) + pow(b, 2))"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'sqrt(pow(a, 2) + pow(b, 2))',
        to: 'hypotenuse',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL hypotenuse = SQRT(POW(a, 2) + POW(b, 2))');
    });

    it('should handle deeply nested: "ceil(abs(floor(x)))"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'ceil(abs(floor(x)))',
        to: 'result',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL result = CEIL(ABS(FLOOR(x)))');
    });

    it('should handle nested with dotted paths: "sqrt(pow(attributes.x, 2) + pow(attributes.y, 2))"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'sqrt(pow(attributes.x, 2) + pow(attributes.y, 2))',
        to: 'attributes.distance',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe(
        'EVAL `attributes.distance` = SQRT(POW(`attributes.x`, 2) + POW(`attributes.y`, 2))'
      );
    });
  });

  // Where condition handling
  describe('where condition', () => {
    it('should wrap with CASE WHEN for where condition: eq filter', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'price * quantity',
        to: 'total',
        where: { field: 'active', eq: true },
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      // ES|QL formats boolean as TRUE (uppercase)
      expect(result).toBe('EVAL total = CASE(active == TRUE, price * quantity, total)');
    });

    it('should handle where with gt condition', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'abs(delta)',
        to: 'magnitude',
        where: { field: 'priority', gt: 5 },
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL magnitude = CASE(priority > 5, ABS(delta), magnitude)');
    });

    it('should handle where with exists condition', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'sqrt(variance)',
        to: 'std_dev',
        where: { field: 'variance', exists: true },
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL std_dev = CASE(NOT(variance IS NULL), SQRT(variance), std_dev)');
    });

    it('should handle where with and condition', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'price * 0.9',
        to: 'discounted',
        where: {
          and: [
            { field: 'eligible', eq: true },
            { field: 'price', gt: 100 },
          ],
        },
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe(
        'EVAL discounted = CASE(eligible == TRUE AND price > 100, price * 0.9, discounted)'
      );
    });
  });

  // ignore_missing handling
  describe('ignore_missing handling', () => {
    it('should generate null checks for single field when ignore_missing is true', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'abs(value)',
        to: 'result',
        ignore_missing: true,
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL result = CASE(NOT(value IS NULL), ABS(value), result)');
    });

    it('should generate null checks for multiple fields when ignore_missing is true', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'price * quantity + tax',
        to: 'total',
        ignore_missing: true,
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      // Fields are extracted and sorted: price, quantity, tax
      expect(result).toBe(
        'EVAL total = CASE(NOT(price IS NULL) AND NOT(quantity IS NULL) AND NOT(tax IS NULL), price * quantity + tax, total)'
      );
    });

    it('should handle ignore_missing with dotted field paths', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'attributes.price * attributes.qty',
        to: 'attributes.total',
        ignore_missing: true,
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe(
        'EVAL `attributes.total` = CASE(NOT(`attributes.price` IS NULL) AND NOT(`attributes.qty` IS NULL), `attributes.price` * `attributes.qty`, `attributes.total`)'
      );
    });

    it('should not generate null checks when ignore_missing is false', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'price * quantity',
        to: 'total',
        ignore_missing: false,
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL total = price * quantity');
    });

    it('should not generate null checks when ignore_missing is undefined', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'price * quantity',
        to: 'total',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL total = price * quantity');
    });

    it('should handle expression with no fields (constants only)', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'pi() * 2',
        to: 'tau_value',
        ignore_missing: true,
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      // No fields to check, no CASE wrapper needed
      expect(result).toBe('EVAL tau_value = PI() * 2');
    });

    it('should deduplicate repeated field references', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'a + a + a * a',
        to: 'result',
        ignore_missing: true,
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      // Only one null check for 'a' even though it's referenced 4 times
      expect(result).toBe('EVAL result = CASE(NOT(a IS NULL), a + a + a * a, result)');
    });
  });

  // Combined where + ignore_missing
  describe('combined where and ignore_missing', () => {
    it('should combine where and ignore_missing conditions with AND', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'price * quantity',
        to: 'total',
        where: { field: 'active', eq: true },
        ignore_missing: true,
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe(
        'EVAL total = CASE(active == TRUE AND NOT(price IS NULL) AND NOT(quantity IS NULL), price * quantity, total)'
      );
    });

    it('should handle complex where with multiple fields and ignore_missing', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'sqrt(pow(x, 2) + pow(y, 2))',
        to: 'distance',
        where: {
          and: [
            { field: 'valid', eq: true },
            { field: 'type', eq: 'point' },
          ],
        },
        ignore_missing: true,
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe(
        'EVAL distance = CASE(valid == TRUE AND type == "point" AND NOT(x IS NULL) AND NOT(y IS NULL), SQRT(POW(x, 2) + POW(y, 2)), distance)'
      );
    });
  });

  // Validation errors
  describe('validation errors', () => {
    it('should throw error for rejected function: mean()', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'mean(a, b, c)',
        to: 'average',
      };
      expect(() => convertMathProcessorToESQL(processor)).toThrow(
        /Function 'mean' is not supported/
      );
    });

    it('should throw error for rejected function: sum()', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'sum(a, b)',
        to: 'total',
      };
      expect(() => convertMathProcessorToESQL(processor)).toThrow(
        /Function 'sum' is not supported/
      );
    });

    it('should throw error for unknown function', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'unknownFunc(a)',
        to: 'result',
      };
      expect(() => convertMathProcessorToESQL(processor)).toThrow(/Unknown function 'unknownFunc'/);
    });

    it('should throw error for invalid expression syntax', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'price * * quantity',
        to: 'result',
      };
      expect(() => convertMathProcessorToESQL(processor)).toThrow(/Failed to parse expression/);
    });

    it('should include suggestion in error for rejected functions', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'square(x)',
        to: 'squared',
      };
      expect(() => convertMathProcessorToESQL(processor)).toThrow(/pow\(a, 2\)/);
    });
  });
});
