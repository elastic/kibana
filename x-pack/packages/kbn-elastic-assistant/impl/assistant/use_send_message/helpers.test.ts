/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getOptionalRequestParams, OptionalRequestParams } from './helpers';

describe('getOptionalRequestParams', () => {
  it('returns the correct optional request params', () => {
    const params: OptionalRequestParams = {
      allow: ['a', 'b', 'c'],
      allowReplacement: ['b', 'c'],
      replacements: { key: 'value' },
    };

    const result = getOptionalRequestParams(params);

    expect(result).toEqual({
      allow: ['a', 'b', 'c'],
      allowReplacement: ['b', 'c'],
      replacements: { key: 'value' },
    });
  });

  it('returns an empty object if no optional params are provided', () => {
    const params = {};

    const result = getOptionalRequestParams(params);

    expect(result).toEqual({});
  });

  it('returns only the provided optional params', () => {
    const params = {
      allowReplacement: ['b', 'c'],
    };

    const result = getOptionalRequestParams(params);

    expect(result).toEqual({
      allowReplacement: ['b', 'c'],
    });
  });
});
