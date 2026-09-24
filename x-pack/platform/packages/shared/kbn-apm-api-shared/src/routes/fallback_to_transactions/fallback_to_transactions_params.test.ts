/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { fallbackToTransactionsRoute } from './fallback_to_transactions';

describe('fallbackToTransactionsRoute params', () => {
  it('allows an entirely missing query', () => {
    expectParseSuccess(fallbackToTransactionsRoute.params!.safeParse({}));
  });

  it('accepts a query with required kuery and optional start/end', () => {
    const result = fallbackToTransactionsRoute.params!.safeParse({
      query: { kuery: 'service.name:opbeans-java' },
    });

    expectParseSuccess(result);
  });

  it('accepts start/end when provided alongside kuery', () => {
    const result = fallbackToTransactionsRoute.params!.safeParse({
      query: {
        kuery: '',
        start: '2023-01-01T00:00:00.000Z',
        end: '2023-01-02T00:00:00.000Z',
      },
    });

    expectParseSuccess(result);
  });

  it('rejects a query missing the required kuery field', () => {
    expectParseError(fallbackToTransactionsRoute.params!.safeParse({ query: {} }));
  });
});
