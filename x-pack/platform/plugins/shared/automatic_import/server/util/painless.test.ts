/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  isPainlessIdentifier,
  painlessStringRepresentation,
  addPainlessFieldAccess,
  fieldPathToPainlessExpression,
  type SafePainlessExpression,
} from './painless';

describe('isPainlessIdentifier', () => {
  it('should return true for valid identifiers', () => {
    expect(isPainlessIdentifier('_validIdentifier123')).toBe(true);
    expect(isPainlessIdentifier('valid')).toBe(true);
  });

  it('should return false for invalid identifiers', () => {
    expect(isPainlessIdentifier('123start')).toBe(false); // Identifiers cannot start with a number
    expect(isPainlessIdentifier('new')).toBe(true); // Reserved words are valid identifiers
    expect(isPainlessIdentifier('_source')).toBe(true); // Underscore-prefixed identifiers are valid
    expect(isPainlessIdentifier('invalid-char!')).toBe(false); // Identifiers cannot contain special characters
  });
});

describe('painlessFieldEscape', () => {
  it('should return a quoted and escaped string', () => {
    expect(painlessStringRepresentation('simple')).toBe('"simple"');
    expect(painlessStringRepresentation('"quote"')).toBe('"\\"quote\\""');
    expect(painlessStringRepresentation('back\\slash')).toBe('"back\\\\slash"');
  });
});

describe('addPainlessFieldAccess', () => {
  it('should add a dot-access for valid identifiers', () => {
    const expr = 'root' as SafePainlessExpression;
    const result = addPainlessFieldAccess('foo', expr, false);
    expect(result).toBe('root.foo');
  });

  it('should add a nullable dot-access for valid identifiers', () => {
    const expr = 'root' as SafePainlessExpression;
    const result = addPainlessFieldAccess('foo', expr);
    expect(result).toBe('root?.foo');
  });

  it('should add a get-access for invalid identifiers', () => {
    const expr = 'root' as SafePainlessExpression;
    const result = addPainlessFieldAccess('foo-bar', expr, false);
    expect(result).toContain('"foo-bar"');
    expect(result).toBe('root.get("foo-bar")');
  });

  it('should add a nullable get-access for invalid identifiers in the chain', () => {
    const expr = 'root' as SafePainlessExpression;
    const result = addPainlessFieldAccess('foo-bar', expr, true);
    expect(result).toContain('"foo-bar"');
    expect(result).toBe('root?.get("foo-bar")');
  });
});

describe('fieldPathToPainlessExpression', () => {
  it('should build a nested expression from a simple field path', () => {
    const result = fieldPathToPainlessExpression(['source', 'ip']);
    expect(result).toBe('ctx.source?.ip');
  });

  it('should quote invalid identifiers', () => {
    const result = fieldPathToPainlessExpression(['ip-address']);
    expect(result).toContain('"ip-address"');
    expect(result).toBe('ctx.get("ip-address")');
  });

  it('should use nullable get access for nested invalid identifiers', () => {
    const result = fieldPathToPainlessExpression(['field', 'ip-address']);
    expect(result).toContain('"ip-address"');
    expect(result).toBe('ctx.field?.get("ip-address")');
  });

  it('should return just "ctx" if the path is empty', () => {
    const result = fieldPathToPainlessExpression([]);
    expect(result).toBe('ctx');
  });
});
