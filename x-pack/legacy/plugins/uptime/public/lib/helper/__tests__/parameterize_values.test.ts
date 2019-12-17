/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { parameterizeValues } from '../parameterize_values';

describe('parameterizeValues', () => {
  it('parameterizes the provided values for a given field name', () => {
    expect(parameterizeValues({ foo: ['bar', 'baz'] })).toMatchSnapshot();
  });

  it('parameterizes provided values for multiple fields', () => {
    expect(parameterizeValues({ foo: ['bar', 'baz'], bar: ['foo', 'baz'] })).toMatchSnapshot();
  });

  it('returns an empty string when there are no values provided', () => {
    expect(parameterizeValues({ foo: [] })).toBe('');
  });
});
