/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { expectParseError, expectParseSuccess } from '@kbn/zod-helpers/v4';
import { ApmDocumentType, RollupInterval } from '@kbn/apm-types';
import {
  filtersSchema,
  kuerySchema,
  offsetSchema,
  probabilitySchema,
  rangeSchema,
  serviceTransactionDataSourceSchema,
  transactionDataSourceSchema,
} from './default_api_types';

describe('rangeSchema', () => {
  it('parses ISO strings into epoch numbers', () => {
    const result = rangeSchema.safeParse({
      start: '2023-01-01T00:00:00.000Z',
      end: '2023-01-02T00:00:00.000Z',
    });

    expectParseSuccess(result);
    expect(result.data).toEqual({
      start: new Date('2023-01-01T00:00:00.000Z').getTime(),
      end: new Date('2023-01-02T00:00:00.000Z').getTime(),
    });
  });

  it('rejects an invalid date string', () => {
    const result = rangeSchema.safeParse({ start: 'not-a-date', end: '2023-01-02T00:00:00.000Z' });

    expectParseError(result);
  });
});

describe('kuerySchema', () => {
  it('parses a kuery string', () => {
    const result = kuerySchema.safeParse({ kuery: 'service.name:opbeans-java' });

    expectParseSuccess(result);
    expect(result.data.kuery).toEqual('service.name:opbeans-java');
  });
});

describe('probabilitySchema', () => {
  it('coerces a numeric string', () => {
    const result = probabilitySchema.safeParse({ probability: '0.5' });

    expectParseSuccess(result);
    expect(result.data.probability).toEqual(0.5);
  });

  it('rejects a non-numeric value', () => {
    const result = probabilitySchema.safeParse({ probability: 'not-a-number' });

    expectParseError(result);
  });
});

describe('offsetSchema', () => {
  it('allows omitting offset', () => {
    const result = offsetSchema.safeParse({});

    expectParseSuccess(result);
  });

  it('parses an offset string when provided', () => {
    const result = offsetSchema.safeParse({ offset: '1d' });

    expectParseSuccess(result);
    expect(result.data.offset).toEqual('1d');
  });
});

describe('serviceTransactionDataSourceSchema', () => {
  it('accepts ServiceTransactionMetric', () => {
    const result = serviceTransactionDataSourceSchema.safeParse({
      documentType: ApmDocumentType.ServiceTransactionMetric,
      rollupInterval: RollupInterval.OneMinute,
    });

    expectParseSuccess(result);
  });

  it('rejects an unknown document type', () => {
    const result = serviceTransactionDataSourceSchema.safeParse({
      documentType: 'not_a_real_type',
      rollupInterval: RollupInterval.OneMinute,
    });

    expectParseError(result);
  });
});

describe('transactionDataSourceSchema', () => {
  it('rejects ServiceTransactionMetric (unlike serviceTransactionDataSourceSchema)', () => {
    const result = transactionDataSourceSchema.safeParse({
      documentType: ApmDocumentType.ServiceTransactionMetric,
      rollupInterval: RollupInterval.OneMinute,
    });

    expectParseError(result);
  });

  it('accepts TransactionMetric', () => {
    const result = transactionDataSourceSchema.safeParse({
      documentType: ApmDocumentType.TransactionMetric,
      rollupInterval: RollupInterval.OneMinute,
    });

    expectParseSuccess(result);
  });
});

describe('filtersSchema', () => {
  it('parses a JSON-encoded filter string into a BoolQuery', () => {
    const result = filtersSchema.safeParse(
      JSON.stringify({ filter: [{ term: { foo: 'bar' } }], must_not: [{ term: { baz: 'qux' } }] })
    );

    expectParseSuccess(result);
    expect(result.data).toEqual({
      should: [],
      must: [],
      must_not: [{ term: { baz: 'qux' } }],
      filter: [{ term: { foo: 'bar' } }],
    });
  });

  it('defaults must_not/filter to empty arrays when absent', () => {
    const result = filtersSchema.safeParse(JSON.stringify({}));

    expectParseSuccess(result);
    expect(result.data).toEqual({ should: [], must: [], must_not: [], filter: [] });
  });

  it('rejects a non-JSON string', () => {
    const result = filtersSchema.safeParse('not json');

    expectParseError(result);
  });

  it('rejects a non-iterable filter/must_not value', () => {
    const result = filtersSchema.safeParse(JSON.stringify({ filter: 123 }));

    expectParseError(result);
  });
});
