/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { deleteSourceMapRoute } from './delete_source_map';
import { listSourceMapsRoute } from './list_source_maps';

describe('deleteSourceMapRoute params', () => {
  it('accepts a path id', () => {
    const result = deleteSourceMapRoute.params!.safeParse({ path: { id: 'abc123' } });

    expectParseSuccess(result);
  });

  it('rejects a missing path id', () => {
    expectParseError(deleteSourceMapRoute.params!.safeParse({ path: {} }));
  });
});

describe('listSourceMapsRoute params', () => {
  it('allows an entirely missing query', () => {
    expectParseSuccess(listSourceMapsRoute.params!.safeParse({}));
  });

  it('coerces page and perPage to numbers', () => {
    const result = listSourceMapsRoute.params!.safeParse({
      query: { page: '2', perPage: '10' },
    });

    expectParseSuccess(result);
    if (result.success) {
      expect(result.data).toEqual({ query: { page: 2, perPage: 10 } });
    }
  });

  it('rejects a non-numeric page', () => {
    expectParseError(listSourceMapsRoute.params!.safeParse({ query: { page: 'not-a-number' } }));
  });
});
