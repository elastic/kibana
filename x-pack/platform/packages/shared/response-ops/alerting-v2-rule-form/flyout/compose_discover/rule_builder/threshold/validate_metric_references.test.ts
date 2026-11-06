/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getExpressionColumnReferences,
  getInvalidExpressionReferences,
} from './validate_metric_references';

describe('getExpressionColumnReferences', () => {
  it('returns an empty array for a blank expression', () => {
    expect(getExpressionColumnReferences('')).toEqual([]);
    expect(getExpressionColumnReferences('   ')).toEqual([]);
  });

  it('returns the single referenced column', () => {
    expect(getExpressionColumnReferences('count')).toEqual(['count']);
  });

  it('returns all referenced columns in a nested arithmetic expression', () => {
    expect(getExpressionColumnReferences('a / (b + c) * d')).toEqual(['a', 'b', 'c', 'd']);
  });

  it('dedupes repeated references to the same column', () => {
    expect(getExpressionColumnReferences('errors / errors * 100')).toEqual(['errors']);
  });

  it('returns an empty array when the expression fails to parse', () => {
    expect(getExpressionColumnReferences('errors /')).toEqual([]);
  });
});

describe('getInvalidExpressionReferences', () => {
  it('returns an empty array when all references are available', () => {
    expect(getInvalidExpressionReferences('errors / total * 100', ['errors', 'total'])).toEqual([]);
  });

  it('returns the unknown references only', () => {
    expect(getInvalidExpressionReferences('errors / total * 100', ['errors'])).toEqual(['total']);
  });

  it('returns all references when none are available', () => {
    expect(getInvalidExpressionReferences('a / (b + c) * d', ['a', 'c'])).toEqual(['b', 'd']);
  });

  it('returns an empty array for a blank expression regardless of available labels', () => {
    expect(getInvalidExpressionReferences('', [])).toEqual([]);
  });

  it('returns an empty array when the expression fails to parse', () => {
    expect(getInvalidExpressionReferences('errors /', ['errors'])).toEqual([]);
  });
});
