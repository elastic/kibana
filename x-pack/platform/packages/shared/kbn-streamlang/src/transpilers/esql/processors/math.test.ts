/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ESQLAstCommand } from '@kbn/esql-ast';
import { BasicPrettyPrinter, Builder } from '@kbn/esql-ast';
import { convertMathProcessorToESQL } from './math';
import type { MathProcessor } from '../../../../types/processors';

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
      // ES|QL Builder formats decimal literals with .0 suffix
      expect(result).toBe('EVAL result = 2.0 + 2.0');
    });

    it('should transpile numeric subtraction: "10 - 5"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: '10 - 5',
        to: 'result',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      // ES|QL Builder formats decimal literals with .0 suffix
      expect(result).toBe('EVAL result = 10.0 - 5.0');
    });

    it('should transpile numeric multiplication: "3 * 4"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: '3 * 4',
        to: 'result',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL result = 3.0 * 4.0');
    });

    it('should transpile numeric division: "20 / 4"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: '20 / 4',
        to: 'result',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      // ES|QL Builder formats decimal literals with .0 suffix
      expect(result).toBe('EVAL result = 20.0 / 4.0');
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
      // ES|QL Builder formats negative decimals with .0 suffix
      expect(result).toBe('EVAL result = -5.0 + a');
    });

    it('should handle negative field subtraction: "a - -10"', () => {
      const processor: MathProcessor = {
        action: 'math',
        expression: 'a - -10',
        to: 'result',
      };
      const result = commandsToString(convertMathProcessorToESQL(processor));
      expect(result).toBe('EVAL result = a - -10.0');
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
});
