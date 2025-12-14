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
        const validArity =
          typeof def.arity === 'number' || (Array.isArray(def.arity) && def.arity.length === 2);
        expect(validArity).toBe(true);
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

  describe('two-arg functions', () => {
    const twoArgFuncs = ['pow'];

    twoArgFuncs.forEach((func) => {
      it(`should define ${func} with arity 2`, () => {
        expect(FUNCTION_REGISTRY[func]).toBeDefined();
        expect(FUNCTION_REGISTRY[func].arity).toBe(2);
      });
    });
  });

  describe('variable-arity functions', () => {
    it('should define round with arity [1, 2]', () => {
      expect(FUNCTION_REGISTRY.round.arity).toEqual([1, 2]);
    });

    it('should define log with arity [1, 2] and argOrder swap', () => {
      expect(FUNCTION_REGISTRY.log.arity).toEqual([1, 2]);
      expect(FUNCTION_REGISTRY.log.esqlArgOrder).toBe('swap');
    });
  });

  describe('binary operators', () => {
    // mod is special: arithmetic function but rendered as % operator
    // Comparison functions are derived from language_definition
    const binaryOps = ['mod', ...getBinaryComparisonFunctions()];

    binaryOps.forEach((op) => {
      it(`should define ${op} as binary operator`, () => {
        expect(FUNCTION_REGISTRY[op]).toBeDefined();
        expect(FUNCTION_REGISTRY[op].isBinaryOp).toBe(true);
        expect(FUNCTION_REGISTRY[op].arity).toBe(2);
      });
    });
  });

  describe('constants', () => {
    it('should define pi as constant with arity 0', () => {
      expect(FUNCTION_REGISTRY.pi).toBeDefined();
      expect(FUNCTION_REGISTRY.pi.arity).toBe(0);
      expect(FUNCTION_REGISTRY.pi.isConstant).toBe(true);
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
  it('should have suggestions for common rejected functions', () => {
    expect(REJECTED_FUNCTIONS.mean).toContain('add(a, b) / 2');
    expect(REJECTED_FUNCTIONS.sum).toContain('add(a, b)');
    expect(REJECTED_FUNCTIONS.square).toContain('pow(a, 2)');
    expect(REJECTED_FUNCTIONS.cube).toContain('pow(a, 3)');
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
  it('should return true for registry functions', () => {
    expect(isSupportedFunction('abs')).toBe(true);
    expect(isSupportedFunction('sqrt')).toBe(true);
    expect(isSupportedFunction('pow')).toBe(true);
  });

  it('should return true for binary arithmetic operators', () => {
    expect(isSupportedFunction('add')).toBe(true);
    expect(isSupportedFunction('subtract')).toBe(true);
    expect(isSupportedFunction('multiply')).toBe(true);
    expect(isSupportedFunction('divide')).toBe(true);
  });

  it('should return false for rejected functions', () => {
    expect(isSupportedFunction('mean')).toBe(false);
    expect(isSupportedFunction('sum')).toBe(false);
  });

  it('should return false for unknown functions', () => {
    expect(isSupportedFunction('unknownFunc')).toBe(false);
  });
});

describe('isRejectedFunction', () => {
  it('should return true for rejected functions', () => {
    expect(isRejectedFunction('mean')).toBe(true);
    expect(isRejectedFunction('sum')).toBe(true);
    expect(isRejectedFunction('random')).toBe(true);
  });

  it('should return false for supported functions', () => {
    expect(isRejectedFunction('abs')).toBe(false);
    expect(isRejectedFunction('add')).toBe(false);
  });

  it('should return false for unknown functions', () => {
    expect(isRejectedFunction('unknownFunc')).toBe(false);
  });
});

describe('getFunctionDefinition', () => {
  it('should return definition for registry functions', () => {
    const def = getFunctionDefinition('abs');
    expect(def).toBeDefined();
    expect(def?.esql).toBe('ABS');
    expect(def?.painless).toBe('Math.abs');
  });

  it('should return undefined for non-registry functions', () => {
    expect(getFunctionDefinition('add')).toBeUndefined();
    expect(getFunctionDefinition('mean')).toBeUndefined();
    expect(getFunctionDefinition('unknownFunc')).toBeUndefined();
  });
});

describe('getRejectionReason', () => {
  it('should return reason for rejected functions', () => {
    expect(getRejectionReason('mean')).toContain('add(a, b) / 2');
  });

  it('should return undefined for non-rejected functions', () => {
    expect(getRejectionReason('abs')).toBeUndefined();
    expect(getRejectionReason('unknownFunc')).toBeUndefined();
  });
});

describe('validateArity', () => {
  describe('fixed arity', () => {
    it('should validate correct arity', () => {
      expect(validateArity('abs', 1)).toEqual({ valid: true });
      expect(validateArity('pow', 2)).toEqual({ valid: true });
      expect(validateArity('pi', 0)).toEqual({ valid: true });
    });

    it('should reject incorrect arity', () => {
      const result = validateArity('abs', 2);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('requires exactly 1 argument');
    });
  });

  describe('variable arity', () => {
    it('should validate within range', () => {
      expect(validateArity('round', 1)).toEqual({ valid: true });
      expect(validateArity('round', 2)).toEqual({ valid: true });
      expect(validateArity('log', 1)).toEqual({ valid: true });
      expect(validateArity('log', 2)).toEqual({ valid: true });
    });

    it('should reject outside range', () => {
      const result = validateArity('round', 3);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('requires 1 to 2 arguments');
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
