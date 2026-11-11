/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import { getElasticsearchAuthFailures } from './elasticsearch_auth_failures';
import type { EsqlRow } from './mappers/esql_rows';

const window = { start: '2026-10-20T10:00:00.000Z', end: '2026-10-20T10:15:00.000Z' };
const params = { unitId: 'default', window, ids: ['es-prod', 'es-dev'] };

const rate = (value: number | null) => ({ value, unit: '{item}', time_unit: 's' });

const healthy = { id: 'es-prod', authentication_rate: 0, authorization_rate: 0 };
const failing = { id: 'es-dev', authentication_rate: 0.5, authorization_rate: 1.9 };
const failingCollection = {
  id: 'es-dev',
  collection: 'logs-a-default',
  authentication_rate: null,
  authorization_rate: 1.9,
};

/** Answers the collections query (the one with `INLINE STATS`) and the rates query separately. */
const makeRunQuery = ({
  rates,
  collections = () => [],
}: {
  rates: () => EsqlRow[];
  collections?: () => EsqlRow[];
}) =>
  jest.fn(async (query: ComposerQuery) =>
    query.print('basic').includes('INLINE STATS') ? collections() : rates()
  );

const failWith = (error: Error) => () => {
  throw error;
};

describe('getElasticsearchAuthFailures', () => {
  it('asks for no collections when no destination has failures', async () => {
    const runQuery = makeRunQuery({ rates: () => [healthy] });
    const onFailure = jest.fn();

    const result = await getElasticsearchAuthFailures({ runQuery, params, onFailure });

    expect(runQuery).toHaveBeenCalledTimes(1);
    expect(onFailure).not.toHaveBeenCalled();
    expect(result).toEqual({
      'es-prod': { authentication: { rate: rate(0) }, authorization: { rate: rate(0) } },
    });
  });

  it('asks for the collections of the destinations with failures only', async () => {
    const runQuery = makeRunQuery({
      rates: () => [healthy, failing],
      collections: () => [failingCollection],
    });

    const result = await getElasticsearchAuthFailures({ runQuery, params, onFailure: jest.fn() });

    expect(runQuery).toHaveBeenCalledTimes(2);
    const collectionsQuery = runQuery.mock.calls[1][0].print('basic');
    expect(collectionsQuery).toContain('destination.id IN ("es-dev")');
    expect(collectionsQuery).not.toContain('"es-prod"');
    expect(result['es-dev']).toEqual({
      authentication: { rate: rate(0.5) },
      authorization: {
        rate: rate(1.9),
        collections: { 'logs-a-default': { rate: rate(1.9) } },
      },
    });
    expect(result['es-prod'].authorization).toEqual({ rate: rate(0) });
  });

  it('gives the destination rate and no collections for a 401, which a whole request has', async () => {
    const runQuery = makeRunQuery({
      rates: () => [{ id: 'es-dev', authentication_rate: 2, authorization_rate: 0 }],
    });

    const result = await getElasticsearchAuthFailures({ runQuery, params, onFailure: jest.fn() });

    expect(result['es-dev']).toEqual({
      authentication: { rate: rate(2) },
      authorization: { rate: rate(0) },
    });
  });

  it('keeps the rates and reports it when the collections query fails', async () => {
    const error = new Error('collections failed');
    const onFailure = jest.fn();
    const runQuery = makeRunQuery({
      rates: () => [failing],
      collections: failWith(error),
    });

    const result = await getElasticsearchAuthFailures({ runQuery, params, onFailure });

    expect(onFailure).toHaveBeenCalledWith(error, 'authentication and authorization collections');
    expect(result['es-dev']).toEqual({
      authentication: { rate: rate(0.5) },
      authorization: { rate: rate(1.9) },
    });
  });

  it('returns nothing and reports it when the rates query fails, without asking for collections', async () => {
    const error = new Error('rates failed');
    const onFailure = jest.fn();
    const runQuery = makeRunQuery({ rates: failWith(error) });

    const result = await getElasticsearchAuthFailures({ runQuery, params, onFailure });

    expect(result).toEqual({});
    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(onFailure).toHaveBeenCalledWith(error, 'authentication and authorization rates');
    expect(runQuery).toHaveBeenCalledTimes(1);
  });

  it('leaves out a destination that the rates query has no row for', async () => {
    const runQuery = makeRunQuery({ rates: () => [healthy] });

    const result = await getElasticsearchAuthFailures({ runQuery, params, onFailure: jest.fn() });

    expect(Object.keys(result)).toEqual(['es-prod']);
  });

  it('does not read the prototype for a destination id like "constructor"', async () => {
    const runQuery = makeRunQuery({
      rates: () => [{ id: 'constructor', authentication_rate: 1, authorization_rate: 0 }],
    });

    const result = await getElasticsearchAuthFailures({ runQuery, params, onFailure: jest.fn() });

    expect(Object.hasOwn(result, 'constructor')).toBe(true);
    expect(result.constructor).toEqual({
      authentication: { rate: rate(1) },
      authorization: { rate: rate(0) },
    });
  });
});
