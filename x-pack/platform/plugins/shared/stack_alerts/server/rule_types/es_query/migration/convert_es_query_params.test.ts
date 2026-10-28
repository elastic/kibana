/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { convertEsQueryParams } from './convert_es_query_params';

describe('convertEsQueryParams', () => {
  it('splits an ES|QL query at the WHERE after the last STATS', () => {
    expect(
      convertEsQueryParams({
        searchType: 'esqlQuery',
        esqlQuery: {
          esql: 'FROM logs-* | STATS c = COUNT(*) BY host.name | WHERE c > 5',
        },
        timeField: 'event.ingested',
        timeWindowSize: 5,
        timeWindowUnit: 'm',
      })
    ).toEqual({
      query: {
        base: 'FROM logs-* | STATS c = COUNT(*) BY host.name',
        breach: { segment: '| WHERE c > 5' },
      },
      time_field: 'event.ingested',
      lookback: '5m',
      grouping: { fields: ['host.name'] },
    });
  });

  it('moves a trailing SORT and LIMIT after STATS into the breach segment', () => {
    expect(
      convertEsQueryParams({
        esqlQuery: { esql: 'FROM logs-* | STATS c = COUNT(*) BY host.name | SORT c DESC | LIMIT 10' },
      }).query
    ).toEqual({
      base: 'FROM logs-* | STATS c = COUNT(*) BY host.name',
      breach: { segment: '| SORT c DESC | LIMIT 10' },
    });
  });

  it('keeps the whole ES|QL query as the base when it cannot be split', () => {
    expect(
      convertEsQueryParams({
        esqlQuery: { esql: 'FROM logs-* | STATS c = COUNT(*) | EVAL d = c * 2' },
      }).query
    ).toEqual({ base: 'FROM logs-* | STATS c = COUNT(*) | EVAL d = c * 2' });
  });

  it.each([
    ['a list of indices', ['logs-a', 'logs-b'], 'FROM logs-a, logs-b'],
    ['a single index', 'logs-*', 'FROM logs-*'],
    ['no index', undefined, ''],
  ])('seeds a FROM for a DSL or KQL rule with %s', (_, index, base) => {
    expect(convertEsQueryParams({ searchType: 'esQuery', index })).toEqual({ query: { base } });
  });

  it('omits time field, lookback and grouping when they cannot be derived', () => {
    expect(
      convertEsQueryParams({ esqlQuery: { esql: 'FROM logs-* | WHERE x > 1' }, timeField: ' ' })
    ).toEqual({ query: { base: 'FROM logs-*', breach: { segment: '| WHERE x > 1' } } });
  });
});
