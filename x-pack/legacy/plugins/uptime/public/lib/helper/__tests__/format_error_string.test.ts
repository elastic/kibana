/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { formatUptimeGraphQLErrorList } from '../format_error_list';

describe('formatErrorString', () => {
  it('returns an empty string for empty array', () => {
    const result = formatUptimeGraphQLErrorList([]);
    expect(result).toEqual('');
  });
  it('returns a formatted string containing each error', () => {
    const result = formatUptimeGraphQLErrorList([
      {
        message: 'foo is bar',
        locations: undefined,
        path: undefined,
        nodes: undefined,
        source: undefined,
        positions: undefined,
        originalError: undefined,
        extensions: undefined,
        name: 'test error',
      },
      {
        message: 'bar is not foo',
        locations: undefined,
        path: undefined,
        nodes: undefined,
        source: undefined,
        positions: undefined,
        originalError: undefined,
        extensions: undefined,
        name: 'test error',
      },
    ]);
    expect(result).toMatchSnapshot();
  });
});
