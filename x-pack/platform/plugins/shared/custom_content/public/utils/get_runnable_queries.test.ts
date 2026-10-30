/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getRunnableQueries } from './get_runnable_queries';

describe('getRunnableQueries', () => {
  it('puts the main query first, then the additional ones in order', () => {
    expect(getRunnableQueries('FROM a', [{ text: 'FROM b' }, { text: 'FROM c' }])).toEqual([
      'FROM a',
      'FROM b',
      'FROM c',
    ]);
  });

  it('leaves out additional queries that were never filled in', () => {
    expect(
      getRunnableQueries('FROM a', [{ text: '' }, { text: '  ' }, { text: 'FROM c' }])
    ).toEqual(['FROM a', 'FROM c']);
  });

  it('returns nothing without a main query, whatever the additional ones hold', () => {
    expect(getRunnableQueries('', [{ text: 'FROM b' }])).toEqual([]);
    expect(getRunnableQueries('  ', [])).toEqual([]);
  });
});
