/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AggregationType } from '@kbn/apm-types';
import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { alertParamsSchema } from './types';

const baseParams = {
  environment: 'production',
  start: '2023-01-01T00:00:00.000Z',
  end: '2023-01-02T00:00:00.000Z',
  interval: '1m',
};

describe('alertParamsSchema', () => {
  it('accepts the minimal required params', () => {
    expectParseSuccess(alertParamsSchema.safeParse(baseParams));
  });

  it('rejects a missing required interval', () => {
    const { interval, ...withoutInterval } = baseParams;

    expectParseError(alertParamsSchema.safeParse(withoutInterval));
  });

  it('accepts optional fields', () => {
    const result = alertParamsSchema.safeParse({
      ...baseParams,
      aggregationType: AggregationType.P95,
      serviceName: 'opbeans-java',
      errorGroupingKey: 'abc',
      transactionType: 'request',
      transactionName: 'GET /api',
      groupBy: ['service.name'],
    });

    expectParseSuccess(result);
  });

  it('parses a JSON-encoded searchConfiguration into the validated object', () => {
    const result = alertParamsSchema.safeParse({
      ...baseParams,
      searchConfiguration: JSON.stringify({ query: { query: 'foo:bar', language: 'kuery' } }),
    });

    expectParseSuccess(result);
    expect(result.data.searchConfiguration).toEqual({
      query: { query: 'foo:bar', language: 'kuery' },
    });
  });

  it('rejects a non-JSON searchConfiguration', () => {
    const result = alertParamsSchema.safeParse({
      ...baseParams,
      searchConfiguration: 'not json',
    });

    expectParseError(result);
  });

  it('rejects a searchConfiguration that does not match the expected shape once parsed', () => {
    const result = alertParamsSchema.safeParse({
      ...baseParams,
      searchConfiguration: JSON.stringify({ foo: 'bar' }),
    });

    expectParseError(result);
  });

  describe('input limits', () => {
    it.each(['serviceName', 'errorGroupingKey', 'transactionType', 'interval'])(
      'rejects an over-long %s',
      (field) => {
        expectParseSuccess(
          alertParamsSchema.safeParse({ ...baseParams, [field]: 'a'.repeat(1024) })
        );
        expectParseError(alertParamsSchema.safeParse({ ...baseParams, [field]: 'a'.repeat(1025) }));
      }
    );

    it('accepts a transactionName up to 10,000 characters, as the UI reads it from _source', () => {
      expectParseSuccess(
        alertParamsSchema.safeParse({ ...baseParams, transactionName: 'a'.repeat(10_000) })
      );
      expectParseError(
        alertParamsSchema.safeParse({ ...baseParams, transactionName: 'a'.repeat(10_001) })
      );
    });

    it('accepts ten groupBy fields and rejects eleven', () => {
      expectParseSuccess(
        alertParamsSchema.safeParse({
          ...baseParams,
          groupBy: Array.from({ length: 10 }, () => 'a'),
        })
      );
      expectParseError(
        alertParamsSchema.safeParse({
          ...baseParams,
          groupBy: Array.from({ length: 11 }, () => 'a'),
        })
      );
    });

    it('rejects an over-long groupBy item', () => {
      expectParseError(alertParamsSchema.safeParse({ ...baseParams, groupBy: ['a'.repeat(1025)] }));
    });

    it('rejects an over-long serialized searchConfiguration', () => {
      expectParseError(
        alertParamsSchema.safeParse({ ...baseParams, searchConfiguration: 'a'.repeat(100_001) })
      );
    });

    it('rejects an over-long query and language inside searchConfiguration', () => {
      const withQuery = (query: string, language = 'kuery') => ({
        ...baseParams,
        searchConfiguration: JSON.stringify({ query: { query, language } }),
      });

      expectParseError(alertParamsSchema.safeParse(withQuery('a'.repeat(10_001))));
      expectParseError(alertParamsSchema.safeParse(withQuery('a', 'k'.repeat(65))));
    });
  });
});
