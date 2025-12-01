/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getTemplateFromRule } from './template_semantics';

describe('getTemplateFromRule', () => {
  it('returns primitives unchanged', () => {
    expect(getTemplateFromRule('x')).toBe('x');
    expect(getTemplateFromRule(1)).toBe(1);
    expect(getTemplateFromRule(true)).toBe(true);
    expect(getTemplateFromRule(null)).toBeNull();
  });

  it('returns [] for arrays, or wraps inner single-object array', () => {
    expect(getTemplateFromRule(['x'])).toEqual([]);
    expect(getTemplateFromRule([{}])).toEqual([{}]);
    expect(getTemplateFromRule([{ __template: 'v' }])).toEqual(['v']);
  });

  it('honors __template', () => {
    expect(getTemplateFromRule({ __template: { a: 1 } })).toEqual({ a: 1 });
  });

  it('honors __one_of by taking first candidate', () => {
    expect(
      getTemplateFromRule({ __one_of: [{ __template: { a: 1 } }, { __template: { b: 2 } }] })
    ).toEqual({ a: 1 });
  });

  it('returns {} for plain rule objects without meta keys', () => {
    expect(getTemplateFromRule({ some: 'rule' })).toEqual({});
  });
});
