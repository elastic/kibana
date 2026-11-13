/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import type { StreamsUnit } from '@kbn/streams-schema';
import { getElasticsearchAuthFailures } from './elasticsearch_auth_failures';
import type { EsqlRow } from './mappers/esql_rows';
import { noDestinationStats } from './mappers/map_destination_stats_result';
import { toItemRate } from './mappers/stats_values';
import type { DestinationQueryRef } from './query_refs';

const window = { start: '2026-10-20T10:00:00.000Z', end: '2026-10-20T10:15:00.000Z' };
const baseParams = { unitId: 'default', window };

const destination = (id: string): DestinationQueryRef => ({
  kind: 'destination',
  id,
  type: 'elasticsearch',
});
const destinations = [destination('es-prod'), destination('es-dev')];

const rate = (value: number | null) => ({ value, unit: '{item}', time_unit: 's' });
/** The share of the incoming items that `part` is, when 10 items a second come in. */
const pct = (part: number) => ({ value: (part / 10) * 100, unit: '%' });
const noPct = { value: null, unit: '%' };

/**
 * The result of a destination so far, with the failed rate and the incoming rate that the provider
 * reads. 10 items a second come in unless a test says otherwise.
 */
const resultWithFailedRate = (
  failedRate: number | null,
  incomingRate: number | null = 10
): StreamsUnit.StatsDestinationResult => {
  const { events, ...result } = noDestinationStats(60_000);

  return {
    ...result,
    events: {
      incoming: { ...events.incoming, rate: toItemRate(incomingRate) },
      failed: { ...events.failed, rate: toItemRate(failedRate) },
    },
  };
};

/** `es-prod` has no failures and `es-dev` has some. */
const parentResults = {
  'es-prod': resultWithFailedRate(0),
  'es-dev': resultWithFailedRate(2.4),
};

const failing = { id: 'es-dev', authentication_rate: 0.5, authorization_rate: 1.9 };
const failingCause = {
  id: 'es-dev',
  collection: 'logs-a-default',
  reason: 'security_exception',
  authentication_rate: null,
  authorization_rate: 1.9,
};

/** Answers the breakdown query (the one with `INLINE STATS`) and the rates query separately. */
const makeRunQuery = ({
  rates = () => [],
  breakdown = () => [],
}: {
  rates?: () => EsqlRow[];
  breakdown?: () => EsqlRow[];
} = {}) =>
  jest.fn(async (query: ComposerQuery) =>
    query.print('basic').includes('INLINE STATS') ? breakdown() : rates()
  );

const failWith = (error: Error) => () => {
  throw error;
};

describe('getElasticsearchAuthFailures', () => {
  it('asks for nothing, and gives no failures, to destinations whose failed rate is 0', async () => {
    const runQuery = makeRunQuery();
    const onFailure = jest.fn();

    const result = await getElasticsearchAuthFailures({
      runQuery,
      baseParams,
      destinations,
      parentResults: { 'es-prod': resultWithFailedRate(0), 'es-dev': resultWithFailedRate(0) },
      onFailure,
    });

    expect(runQuery).not.toHaveBeenCalled();
    expect(onFailure).not.toHaveBeenCalled();
    expect(result).toEqual({
      'es-prod': {
        authentication: { rate: rate(0), percentage: pct(0) },
        authorization: { rate: rate(0), percentage: pct(0) },
      },
      'es-dev': {
        authentication: { rate: rate(0), percentage: pct(0) },
        authorization: { rate: rate(0), percentage: pct(0) },
      },
    });
  });

  it('leaves out a destination with no data, or with no result so far', async () => {
    const runQuery = makeRunQuery();

    const result = await getElasticsearchAuthFailures({
      runQuery,
      baseParams,
      destinations,
      parentResults: { 'es-prod': resultWithFailedRate(null) },
      onFailure: jest.fn(),
    });

    expect(runQuery).not.toHaveBeenCalled();
    expect(result).toEqual({});
  });

  it('gives each share of the incoming items, and none when no items came in or the rate is unknown', async () => {
    const runQuery = makeRunQuery({ rates: () => [failing], breakdown: () => [failingCause] });

    const noIncoming = await getElasticsearchAuthFailures({
      runQuery,
      baseParams,
      destinations,
      parentResults: {
        'es-prod': resultWithFailedRate(0, 0),
        'es-dev': resultWithFailedRate(2.4, null),
      },
      onFailure: jest.fn(),
    });

    expect(noIncoming['es-prod'].authentication.percentage).toEqual(noPct);
    expect(noIncoming['es-dev'].authorization.percentage).toEqual(noPct);
    expect(noIncoming['es-dev'].authorization.breakdown?.[0].percentage).toEqual(noPct);
    // The rates are still there.
    expect(noIncoming['es-dev'].authorization.rate).toEqual(rate(1.9));
  });

  it('asks about the destinations that fail only, and gives the others no failures', async () => {
    const runQuery = makeRunQuery({
      rates: () => [failing],
      breakdown: () => [failingCause],
    });

    const result = await getElasticsearchAuthFailures({
      runQuery,
      baseParams,
      destinations,
      parentResults,
      onFailure: jest.fn(),
    });

    expect(runQuery).toHaveBeenCalledTimes(2);
    runQuery.mock.calls.forEach(([query]) => {
      expect(query.print('basic')).toContain('destination.id IN ("es-dev")');
      expect(query.print('basic')).not.toContain('"es-prod"');
    });
    expect(result['es-dev']).toEqual({
      authentication: { rate: rate(0.5), percentage: pct(0.5) },
      authorization: {
        rate: rate(1.9),
        percentage: pct(1.9),
        breakdown: [
          {
            collection: 'logs-a-default',
            reason: 'security_exception',
            rate: rate(1.9),
            percentage: pct(1.9),
          },
        ],
      },
    });
    expect(result['es-prod']).toEqual({
      authentication: { rate: rate(0), percentage: pct(0) },
      authorization: { rate: rate(0), percentage: pct(0) },
    });
  });

  it('asks for no breakdown when the failures are not authentication or authorization', async () => {
    const runQuery = makeRunQuery({
      rates: () => [{ id: 'es-dev', authentication_rate: 0, authorization_rate: 0 }],
    });

    const result = await getElasticsearchAuthFailures({
      runQuery,
      baseParams,
      destinations,
      parentResults,
      onFailure: jest.fn(),
    });

    expect(runQuery).toHaveBeenCalledTimes(1);
    expect(result['es-dev']).toEqual({
      authentication: { rate: rate(0), percentage: pct(0) },
      authorization: { rate: rate(0), percentage: pct(0) },
    });
  });

  it('gives the destination rate and no breakdown for a 401, which a whole request has', async () => {
    const runQuery = makeRunQuery({
      rates: () => [{ id: 'es-dev', authentication_rate: 2, authorization_rate: 0 }],
      // The breakdown query returns the row of a whole request, with neither collection nor reason.
      breakdown: () => [
        {
          id: 'es-dev',
          collection: null,
          reason: null,
          authentication_rate: 2,
          authorization_rate: null,
        },
      ],
    });

    const result = await getElasticsearchAuthFailures({
      runQuery,
      baseParams,
      destinations,
      parentResults,
      onFailure: jest.fn(),
    });

    expect(result['es-dev']).toEqual({
      authentication: { rate: rate(2), percentage: pct(2) },
      authorization: { rate: rate(0), percentage: pct(0) },
    });
  });

  it('keeps the rates and reports it when the breakdown query fails', async () => {
    const error = new Error('breakdown failed');
    const onFailure = jest.fn();
    const runQuery = makeRunQuery({ rates: () => [failing], breakdown: failWith(error) });

    const result = await getElasticsearchAuthFailures({
      runQuery,
      baseParams,
      destinations,
      parentResults,
      onFailure,
    });

    expect(onFailure).toHaveBeenCalledWith(error, 'authentication and authorization breakdown');
    expect(result['es-dev']).toEqual({
      authentication: { rate: rate(0.5), percentage: pct(0.5) },
      authorization: { rate: rate(1.9), percentage: pct(1.9) },
    });
  });

  it('reports it, leaves out the failing destinations, and asks for no breakdown when the rates query fails', async () => {
    const error = new Error('rates failed');
    const onFailure = jest.fn();
    const runQuery = makeRunQuery({ rates: failWith(error) });

    const result = await getElasticsearchAuthFailures({
      runQuery,
      baseParams,
      destinations,
      parentResults,
      onFailure,
    });

    expect(onFailure).toHaveBeenCalledTimes(1);
    expect(onFailure).toHaveBeenCalledWith(error, 'authentication and authorization rates');
    expect(runQuery).toHaveBeenCalledTimes(1);
    // `es-prod` needed no query, so it still has its answer.
    expect(Object.keys(result)).toEqual(['es-prod']);
  });

  it('leaves out a destination that the rates query has no row for', async () => {
    const runQuery = makeRunQuery({ rates: () => [] });

    const result = await getElasticsearchAuthFailures({
      runQuery,
      baseParams,
      destinations,
      parentResults,
      onFailure: jest.fn(),
    });

    expect(Object.keys(result)).toEqual(['es-prod']);
  });

  it('does not read the prototype for a destination id like "constructor"', async () => {
    const runQuery = makeRunQuery({
      rates: () => [{ id: 'constructor', authentication_rate: 1, authorization_rate: 0 }],
    });
    const odd = [destination('constructor')];

    const failingResult = await getElasticsearchAuthFailures({
      runQuery,
      baseParams,
      destinations: odd,
      parentResults: Object.fromEntries([['constructor', resultWithFailedRate(1)]]),
      onFailure: jest.fn(),
    });
    const noResult = await getElasticsearchAuthFailures({
      runQuery,
      baseParams,
      destinations: odd,
      parentResults: {},
      onFailure: jest.fn(),
    });

    expect(Object.hasOwn(failingResult, 'constructor')).toBe(true);
    expect(failingResult.constructor).toEqual({
      authentication: { rate: rate(1), percentage: pct(1) },
      authorization: { rate: rate(0), percentage: pct(0) },
    });
    expect(noResult).toEqual({});
  });
});
