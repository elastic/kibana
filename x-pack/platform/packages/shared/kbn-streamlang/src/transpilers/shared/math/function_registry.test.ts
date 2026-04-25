/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  FUNCTION_REGISTRY,
  BINARY_ARITHMETIC_OPERATORS,
  REJECTED_FUNCTIONS,
  isSupportedFunction,
  isRejectedFunction,
  getFunctionDefinition,
  getRejectionReason,
  validateArity,
} from './function_registry';
import { getFunctionsWithArity, getBinaryComparisonFunctions } from './language_definition';

describe('FUNCTION_REGISTRY', () => {
  describe('structure', () => {
    it('should have esql property for all functions', () => {
      Object.entries(FUNCTION_REGISTRY).forEach(([, def]) => {
        expect(def.esql).toBeDefined();
        expect(typeof def.esql).toBe('string');
      });
    });

    it('should have painless property for all functions', () => {
      Object.entries(FUNCTION_REGISTRY).forEach(([, def]) => {
        expect(def.painless).toBeDefined();
        expect(typeof def.painless).toBe('string');
      });
    });

    it('should have arity for all functions', () => {
      Object.entries(FUNCTION_REGISTRY).forEach(([, def]) => {
        expect(def.arity).toBeDefined();
        expect(typeof def.arity).toBe('number');
      });
    });
  });

  describe('single-arg functions', () => {
    // Derive from language_definition to keep in sync
    const singleArgFuncs = getFunctionsWithArity(1);

    singleArgFuncs.forEach((func) => {
      it(`should define ${func} with arity 1`, () => {
        expect(FUNCTION_REGISTRY[func]).toBeDefined();
        expect(FUNCTION_REGISTRY[func].arity).toBe(1);
      });
    });
  });

  describe('binary operators (comparison functions)', () => {
    // Comparison functions are derived from language_definition
    const binaryOps = getBinaryComparisonFunctions();

    binaryOps.forEach((op) => {
      it(`should define ${op} as binary operator`, () => {
        expect(FUNCTION_REGISTRY[op]).toBeDefined();
        expect(FUNCTION_REGISTRY[op].isBinaryOp).toBe(true);
        expect(FUNCTION_REGISTRY[op].arity).toBe(2);
      });
    });
  });

  describe('log function', () => {
    it('should define log with arity 1 (natural log only)', () => {
      expect(FUNCTION_REGISTRY.log).toBeDefined();
      expect(FUNCTION_REGISTRY.log.arity).toBe(1);
      expect(FUNCTION_REGISTRY.log.esql).toBe('LOG');
      expect(FUNCTION_REGISTRY.log.painless).toBe('Math.log');
    });
  });
});

describe('BINARY_ARITHMETIC_OPERATORS', () => {
  it('should define core arithmetic operators', () => {
    expect(BINARY_ARITHMETIC_OPERATORS.add).toBe('+');
    expect(BINARY_ARITHMETIC_OPERATORS.subtract).toBe('-');
    expect(BINARY_ARITHMETIC_OPERATORS.multiply).toBe('*');
    expect(BINARY_ARITHMETIC_OPERATORS.divide).toBe('/');
  });
});

describe('REJECTED_FUNCTIONS', () => {
  it('should reject previously supported math functions', () => {
    // These were supported before OTTL restriction
    expect(REJECTED_FUNCTIONS.abs).toBeDefined();
    expect(REJECTED_FUNCTIONS.sqrt).toBeDefined();
    expect(REJECTED_FUNCTIONS.pow).toBeDefined();
    expect(REJECTED_FUNCTIONS.ceil).toBeDefined();
    expect(REJECTED_FUNCTIONS.floor).toBeDefined();
    expect(REJECTED_FUNCTIONS.round).toBeDefined();
    expect(REJECTED_FUNCTIONS.mod).toBeDefined();
  });

  it('should reject trigonometric functions', () => {
    expect(REJECTED_FUNCTIONS.sin).toBeDefined();
    expect(REJECTED_FUNCTIONS.cos).toBeDefined();
    expect(REJECTED_FUNCTIONS.tan).toBeDefined();
  });

  it('should reject constants', () => {
    expect(REJECTED_FUNCTIONS.pi).toContain('3.14159265359');
    expect(REJECTED_FUNCTIONS.e).toContain('2.71828182846');
    expect(REJECTED_FUNCTIONS.tau).toContain('6.28318530718');
  });

  it('should reject log_ten with helpful message', () => {
    expect(REJECTED_FUNCTIONS.log_ten).toContain('natural logarithm');
  });

  it('should reject array functions', () => {
    expect(REJECTED_FUNCTIONS.count).toBeDefined();
    expect(REJECTED_FUNCTIONS.first).toBeDefined();
    expect(REJECTED_FUNCTIONS.last).toBeDefined();
    expect(REJECTED_FUNCTIONS.unique).toBeDefined();
  });

  it('should reject random()', () => {
    expect(REJECTED_FUNCTIONS.random).toContain('Non-deterministic');
  });
});

describe('isSupportedFunction', () => {
  it.each(['log', 'eq', 'neq', 'lt', 'gt', 'lte', 'gte', 'add', 'subtract', 'multiply', 'divide'])(
    'should return true for supported function: %s',
    (func) => {
      expect(isSupportedFunction(func)).toBe(true);
    }
  );

  it.each(['abs', 'sqrt', 'pow', 'sin', 'pi', 'unknownFunc'])(
    'should return false for rejected/unknown function: %s',
    (func) => {
      expect(isSupportedFunction(func)).toBe(false);
    }
  );
});

describe('isRejectedFunction', () => {
  it.each(['mean', 'sum', 'random', 'abs', 'sqrt'])('should return true for: %s', (func) => {
    expect(isRejectedFunction(func)).toBe(true);
  });

  it.each(['log', 'eq', 'add', 'unknownFunc'])('should return false for: %s', (func) => {
    expect(isRejectedFunction(func)).toBe(false);
  });
});

describe('getFunctionDefinition', () => {
  it('should return definition for registry functions', () => {
    const def = getFunctionDefinition('log');
    expect(def).toBeDefined();
    expect(def?.esql).toBe('LOG');
    expect(def?.painless).toBe('Math.log');
  });

  it('should return undefined for non-registry functions', () => {
    expect(getFunctionDefinition('add')).toBeUndefined();
    expect(getFunctionDefinition('abs')).toBeUndefined();
    expect(getFunctionDefinition('unknownFunc')).toBeUndefined();
  });
});

describe('getRejectionReason', () => {
  it('should return reason for rejected functions', () => {
    expect(getRejectionReason('abs')).toContain('not supported');
  });

  it('should return undefined for non-rejected functions', () => {
    expect(getRejectionReason('log')).toBeUndefined();
    expect(getRejectionReason('unknownFunc')).toBeUndefined();
  });
});

describe('validateArity', () => {
  describe('fixed arity', () => {
    it('should validate correct arity', () => {
      expect(validateArity('log', 1)).toEqual({ valid: true });
      expect(validateArity('eq', 2)).toEqual({ valid: true });
    });

    it('should reject incorrect arity', () => {
      const result = validateArity('log', 2);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('requires exactly 1 argument');
    });
  });

  describe('binary arithmetic operators', () => {
    it('should validate correct arity for arithmetic operators', () => {
      expect(validateArity('add', 2)).toEqual({ valid: true });
      expect(validateArity('subtract', 2)).toEqual({ valid: true });
      expect(validateArity('multiply', 2)).toEqual({ valid: true });
      expect(validateArity('divide', 2)).toEqual({ valid: true });
    });

    it('should reject incorrect arity for arithmetic operators', () => {
      const result = validateArity('add', 3);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('requires exactly 2 arguments');
    });
  });

  describe('unknown functions', () => {
    it('should reject unknown functions', () => {
      const result = validateArity('unknownFunc', 1);
      expect(result.valid).toBe(false);
      expect(result.error).toContain("Unknown function 'unknownFunc'");
    });
  });
});
