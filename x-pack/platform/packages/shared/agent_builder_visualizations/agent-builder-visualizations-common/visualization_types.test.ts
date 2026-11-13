/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readCustomContentQueries, toQueryList } from './visualization_types';

describe('toQueryList', () => {
  it('reads a single string, as saved before a panel could have several, as one query', () => {
    expect(toQueryList('FROM a')).toEqual(['FROM a']);
  });

  it('reads a list as it is, keeping a blank entry at its position', () => {
    expect(toQueryList(['FROM a', '', 'FROM c'])).toEqual(['FROM a', '', 'FROM c']);
  });

  it.each([[undefined], [''], [[]]])('reads %j as no queries', (esql) => {
    expect(toQueryList(esql as string | string[] | undefined)).toEqual([]);
  });

  it('returns a copy, so a caller cannot change the attachment', () => {
    const stored = ['FROM a'];

    toQueryList(stored).push('FROM b');

    expect(stored).toEqual(['FROM a']);
  });
});

describe('readCustomContentQueries', () => {
  it('reads the queries of a custom content attachment, saved as a list or as a string', () => {
    const base = {
      renderer: 'custom_content' as const,
      query: 'q',
      visualization: { template: 't' },
    };

    expect(readCustomContentQueries({ ...base, esql: ['FROM a', 'FROM b'] })).toEqual([
      'FROM a',
      'FROM b',
    ]);
    expect(
      readCustomContentQueries({ ...base, esql: 'FROM legacy' } as unknown as Parameters<
        typeof readCustomContentQueries
      >[0])
    ).toEqual(['FROM legacy']);
  });

  it('reads the single query of a chart', () => {
    expect(
      readCustomContentQueries({ renderer: 'lens', query: 'q', visualization: {}, esql: 'FROM a' })
    ).toEqual(['FROM a']);
  });
});
