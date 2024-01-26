/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRuntimeField } from './is_runtime_field';

describe('isRuntimeField()', () => {
  it('does not allow numbers', () => {
    expect(isRuntimeField(1)).toBe(false);
  });
  it('does not allow null', () => {
    expect(isRuntimeField(null)).toBe(false);
  });
  it('does not allow arrays', () => {
    expect(isRuntimeField([])).toBe(false);
  });
  it('does not allow empty objects', () => {
    expect(isRuntimeField({})).toBe(false);
  });
  it('does not allow objects with non-matching attributes', () => {
    expect(isRuntimeField({ someAttribute: 'someValue' })).toBe(false);
    expect(isRuntimeField({ type: 'wrong-type' })).toBe(false);
    expect(isRuntimeField({ type: 'keyword', someAttribute: 'some value' })).toBe(false);
  });
  it('allows objects with type attribute only', () => {
    expect(isRuntimeField({ type: 'keyword' })).toBe(true);
  });
  it('allows objects with both type and script attributes', () => {
    expect(isRuntimeField({ type: 'keyword', script: 'some script', format: 'some format' })).toBe(
      true
    );
  });
});
