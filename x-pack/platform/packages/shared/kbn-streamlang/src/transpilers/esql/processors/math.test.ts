/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BasicPrettyPrinter, Builder, type ESQLAstCommand } from '@kbn/esql-language';
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
      expect(result).toBe('EVAL result = 2 + 2');
    });

    it('should transpile numeric subtraction: "10 - 5"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: '10 - 5',
        to: 'result',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
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
      expect(result).toBe('EVAL total = `attributes.price` * `attributes.quantity`');
    });

    it('should transpile mixed dotted and simple fields', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'attributes.price * quantity + tax',
        to: 'final_price',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL final_price = `attributes.price` * quantity + tax');
    });

    it('should transpile deeply nested paths', () => {
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

  describe('log function', () => {
    it('should transpile log() (natural log): "log(value)"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'log(value)',
        to: 'ln_value',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL ln_value = LOG(value)');
    });

    it('should transpile log with literal: "log(100)"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'log(100)',
        to: 'result',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL result = LOG(100)');
    });

    it('should transpile log with expression: "log(a * b)"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'log(a * b)',
        to: 'result',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL result = LOG(a * b)');
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

  describe('where condition', () => {
    it('should wrap with CASE for where condition: eq filter', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'price * quantity',
        to: 'total',
        where: { field: 'active', eq: true },
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL total = CASE(active == TRUE, price * quantity, total)');
    });

    it('should handle where with gt condition', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'price * 2',
        to: 'doubled',
        where: { field: 'priority', gt: 5 },
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL doubled = CASE(priority > 5, price * 2, doubled)');
    });

    it('should handle where with exists condition', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'value * 10',
        to: 'scaled',
        where: { field: 'value', exists: true },
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL scaled = CASE(NOT(value IS NULL), value * 10, scaled)');
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

  describe('ignore_missing handling', () => {
    it('should generate null checks for single field when ignore_missing is true', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'value * 2',
        to: 'result',
        ignore_missing: true,
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL result = CASE(NOT(value IS NULL), value * 2, result)');
    });

    it('should generate null checks for multiple fields when ignore_missing is true', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'price * quantity + tax',
        to: 'total',
        ignore_missing: true,
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
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

    it('should deduplicate repeated field references', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'a + a + a * a',
        to: 'result',
        ignore_missing: true,
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL result = CASE(NOT(a IS NULL), a + a + a * a, result)');
    });
  });

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
  });

  describe('validation errors for rejected functions', () => {
    it.each([
      ['abs(value)', 'abs'],
      ['sqrt(value)', 'sqrt'],
      ['pow(base, 2)', 'pow'],
      ['mod(a, 10)', 'mod'],
      ['sin(angle)', 'sin'],
      ['pi()', 'pi'],
      ['log_ten(value)', 'log_ten'],
      ['round(price)', 'round'],
      ['mean(a, b, c)', 'mean'],
    ])('should throw error for rejected function: %s', (expression, funcName) => {
      const processor: MathProcessor = { action: 'math', expression, to: 'result' };
      expect(() => convertMathProcessorToESQL(processor)).toThrow(
        new RegExp(`Function '${funcName}' is not supported`)
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
  });
});
