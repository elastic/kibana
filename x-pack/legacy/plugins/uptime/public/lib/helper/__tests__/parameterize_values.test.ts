/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parameterizeValues } from '../parameterize_values';

describe('parameterizeValues', () => {
  let params: URLSearchParams;

  beforeEach(() => {
    params = new URLSearchParams();
  });

  it('parameterizes the provided values for a given field name', () => {
    parameterizeValues(params, { foo: ['bar', 'baz'] });
    expect(params.toString()).toMatchSnapshot();
  });

  it('parameterizes provided values for multiple fields', () => {
    parameterizeValues(params, { foo: ['bar', 'baz'], bar: ['foo', 'baz'] });
    expect(params.toString()).toMatchSnapshot();
  });

  it('returns an empty string when there are no values provided', () => {
    parameterizeValues(params, { foo: [] });
    expect(params.toString()).toBe('');
  });
});
