/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { findEmptyQueryPosition, getRunnableQueries } from './get_runnable_queries';

const drafts = (...texts: string[]) => texts.map((text) => ({ text }));

describe('getRunnableQueries', () => {
  it('keeps the queries in order, and a blank one between them where it is', () => {
    expect(getRunnableQueries(drafts('FROM a', '', 'FROM c'))).toEqual(['FROM a', '', 'FROM c']);
  });

  it('leaves out the queries at the end that were never filled in', () => {
    expect(getRunnableQueries(drafts('FROM a', 'FROM b', '', '  '))).toEqual(['FROM a', 'FROM b']);
  });

  it('returns nothing without a first query, whatever the others hold', () => {
    expect(getRunnableQueries(drafts('', 'FROM b'))).toEqual([]);
    expect(getRunnableQueries([])).toEqual([]);
  });
});

describe('findEmptyQueryPosition', () => {
  it('finds the first blank query that a filled one follows', () => {
    expect(findEmptyQueryPosition(drafts('FROM a', ' ', '', 'FROM d'))).toBe(2);
    expect(findEmptyQueryPosition(drafts('', 'FROM b'))).toBe(1);
  });

  it('ignores blank queries at the end', () => {
    expect(findEmptyQueryPosition(drafts('FROM a', 'FROM b', '', ''))).toBeUndefined();
  });

  it('finds no gap when nothing is filled in, however many tabs there are', () => {
    expect(findEmptyQueryPosition(drafts(''))).toBeUndefined();
    expect(findEmptyQueryPosition(drafts('', ''))).toBeUndefined();
    expect(findEmptyQueryPosition(drafts('', ' ', ''))).toBeUndefined();
    expect(getRunnableQueries(drafts('', ''))).toEqual([]);
  });
});
