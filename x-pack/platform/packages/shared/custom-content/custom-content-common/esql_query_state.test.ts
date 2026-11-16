/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toEsqlQueryState } from './esql_query_state';

describe('toEsqlQueryState', () => {
  it('keeps the queries in order, as a copy', () => {
    const queries = ['FROM a', 'FROM b'];

    const state = toEsqlQueryState(queries);

    expect(state).toEqual(['FROM a', 'FROM b']);
    expect(state).not.toBe(queries);
  });

  it('leaves the field out for a panel without queries', () => {
    expect(toEsqlQueryState([])).toBeUndefined();
  });
});
