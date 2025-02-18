/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasKeywordDuplicate, isKeywordDuplicate, removeKeywordPostfix } from './field_utils';

const allFields = new Set([
  'field1',
  'field2',
  'field2.keyword',
  'field3.keyword',
  'field3.keyword.keyword',
  'field4.keyword.b',
  'field4.keyword.b.keyword',
]);

describe('field_utils: hasKeywordDuplicate()', () => {
  it('returns true when a corresponding keyword field is available', () => {
    expect(hasKeywordDuplicate('field2', allFields)).toBe(true);
    expect(hasKeywordDuplicate('field3.keyword', allFields)).toBe(true);
    expect(hasKeywordDuplicate('field4.keyword.b', allFields)).toBe(true);
  });
  it('returns false when a corresponding keyword field is not available', () => {
    expect(hasKeywordDuplicate('field1', allFields)).toBe(false);
    expect(hasKeywordDuplicate('field2.keyword', allFields)).toBe(false);
    expect(hasKeywordDuplicate('field3.keyword.keyword', allFields)).toBe(false);
    expect(hasKeywordDuplicate('field4.keyword.b.keyword', allFields)).toBe(false);
  });
});

describe('field_utils: isKeywordDuplicate()', () => {
  it('returns true when a corresponding field without keyword postfix is available', () => {
    expect(isKeywordDuplicate('field2.keyword', allFields)).toBe(true);
    expect(isKeywordDuplicate('field3.keyword.keyword', allFields)).toBe(true);
    expect(isKeywordDuplicate('field4.keyword.b.keyword', allFields)).toBe(true);
  });
  it('returns false when a corresponding field without keyword postfix is not available', () => {
    expect(isKeywordDuplicate('field1', allFields)).toBe(false);
    expect(isKeywordDuplicate('field2', allFields)).toBe(false);
    expect(isKeywordDuplicate('field3.keyword', allFields)).toBe(false);
    expect(isKeywordDuplicate('field4.keyword.b', allFields)).toBe(false);
  });
});

describe('field_utils: removeKeywordPostfix()', () => {
  it('removes the keyword postfix', () => {
    expect(removeKeywordPostfix('field2.keyword')).toBe('field2');
    expect(removeKeywordPostfix('field3.keyword.keyword')).toBe('field3.keyword');
    expect(removeKeywordPostfix('field4.keyword.b.keyword')).toBe('field4.keyword.b');
  });
  it("returns the field name as is when there's no keyword postfix", () => {
    expect(removeKeywordPostfix('field1')).toBe('field1');
    expect(removeKeywordPostfix('field2')).toBe('field2');
    expect(removeKeywordPostfix('field4.keyword.b')).toBe('field4.keyword.b');
  });
});
