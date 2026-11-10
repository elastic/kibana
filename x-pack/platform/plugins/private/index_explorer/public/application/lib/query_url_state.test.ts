/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseQueryViewState, serializeQueryViewState } from './query_url_state';

describe('query view URL state', () => {
  it('parses the query, parameter values and non-default types', () => {
    expect(
      parseQueryViewState('?esql=FROM%20logs&p.min=5&t.min=number&t.bad=nope&p.host=web')
    ).toEqual({
      query: 'FROM logs',
      values: { min: '5', host: 'web' },
      types: { min: 'number' },
    });
  });

  it('round-trips query and params, omitting string types', () => {
    const search = serializeQueryViewState({
      query: 'FROM logs | WHERE a == ?a',
      params: [
        { name: 'a', type: 'string', value: 'x' },
        { name: 'b', type: 'boolean', value: 'true' },
      ],
    });
    expect(search).not.toContain('t.a');
    expect(parseQueryViewState(search)).toEqual({
      query: 'FROM logs | WHERE a == ?a',
      values: { a: 'x', b: 'true' },
      types: { b: 'boolean' },
    });
  });

  it('omits the query for canned queries', () => {
    expect(serializeQueryViewState({ params: [] })).toBe('');
  });
});
