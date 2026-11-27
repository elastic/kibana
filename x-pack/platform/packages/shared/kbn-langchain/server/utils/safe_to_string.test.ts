/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { safeToString } from './safe_to_string';

describe('safeToString', () => {
  it('stringifies printable values like String()', () => {
    expect(safeToString('text')).toBe('text');
    expect(safeToString(42)).toBe('42');
    expect(safeToString(undefined)).toBe('undefined');
    expect(safeToString(new Error('boom'))).toBe('Error: boom');
  });

  it.each([
    ['a prototype-less object', Object.create(null)],
    ['an Error with a Symbol message', Object.assign(new Error('x'), { message: Symbol('s') })],
    ['an Error with a Symbol name', Object.assign(new Error('x'), { name: Symbol('s') })],
  ])('returns a placeholder instead of throwing for %s', (_label, value) => {
    expect(() => String(value)).toThrow();
    expect(safeToString(value)).toBe('[unprintable]');
  });
});
