/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import type { StreamsUnit } from '@kbn/streams-schema';
import { getDestinationAuthFailures, getNoAuthFailures } from './destination_auth_failures';
import type { EsqlRow } from './mappers/esql_rows';
import { noDestinationStats } from './mappers/map_destination_stats_result';
import type { DestinationQueryRef } from './query_refs';

const window = { start: '2026-10-20T10:00:00.000Z', end: '2026-10-20T10:15:00.000Z' };
const baseParams = { unitId: 'default', window };

const destination = (id: string, type: string): DestinationQueryRef => ({
  kind: 'destination',
  id,
  type,
});

/** The ES|QL that each provider asks for, told apart by the metric field it reads. */
const isS3Query = (query: ComposerQuery) =>
  query.print('basic').includes('metrics.streams.destination.duration') &&
  query.print('basic').includes('attempts');

const parentResults: Record<string, StreamsUnit.StatsDestinationResult> = {
  'es-dev': noDestinationStats(60_000),
};

const s3Rows: EsqlRow[] = [
  { id: 's3-test', reason: 'AccessDenied', failed_rate: 0.5, attempts_rate: 1 },
];

describe('getDestinationAuthFailures', () => {
  it('asks each provider once, with its own destinations, and merges what they read', async () => {
    const runQuery = jest.fn(async (query: ComposerQuery) => (isS3Query(query) ? s3Rows : []));

    const { failures, failedGroups } = await getDestinationAuthFailures({
      runQuery,
      baseParams,
      destinations: [
        destination('s3-test', 's3'),
        destination('es-dev', 'elasticsearch'),
        destination('dbg', 'debug'),
      ],
      parentResults,
    });

    expect(failedGroups).toEqual([]);
    expect(Object.keys(failures)).toEqual(['s3-test']);
    expect(failures['s3-test'].authorization.rate.value).toBe(0.5);
    // `es-dev` has no failed rate to read, and `dbg` has no provider: neither asked a query.
    expect(runQuery).toHaveBeenCalledTimes(1);
  });

  it('puts a group whose provider throws in failedGroups, and keeps what the others read', async () => {
    const error = new Error('s3 query failed');
    const runQuery = jest.fn(async (query: ComposerQuery) => {
      if (isS3Query(query)) throw error;
      return [];
    });

    const { failures, failedGroups } = await getDestinationAuthFailures({
      runQuery,
      baseParams,
      destinations: [
        destination('s3-a', 's3'),
        destination('s3-b', 's3'),
        destination('es-dev', 'elasticsearch'),
      ],
      parentResults: {
        'es-dev': {
          ...noDestinationStats(60_000),
          events: {
            ...noDestinationStats(60_000).events,
            failed: {
              ...noDestinationStats(60_000).events.failed,
              rate: { value: 0, unit: '{item}', time_unit: 's' },
            },
          },
        },
      },
    });

    expect(failedGroups).toEqual([{ types: ['s3'], ids: ['s3-a', 's3-b'], error }]);
    expect(Object.keys(failures)).toEqual(['es-dev']);
  });

  it('shares one group between the types that share a provider, with each type once', async () => {
    const error = new Error('es query failed');
    const runQuery = jest.fn().mockRejectedValue(error);
    const failing: StreamsUnit.StatsDestinationResult = {
      ...noDestinationStats(60_000),
      events: {
        ...noDestinationStats(60_000).events,
        failed: {
          ...noDestinationStats(60_000).events.failed,
          rate: { value: 1, unit: '{item}', time_unit: 's' },
        },
      },
    };

    const { failedGroups } = await getDestinationAuthFailures({
      runQuery,
      baseParams,
      destinations: [
        destination('es-a', 'elasticsearch'),
        destination('remote-a', 'remote_elasticsearch'),
        destination('es-b', 'elasticsearch'),
      ],
      parentResults: { 'es-a': failing, 'remote-a': failing, 'es-b': failing },
    });

    expect(failedGroups).toEqual([
      {
        types: ['elasticsearch', 'remote_elasticsearch'],
        ids: ['es-a', 'remote-a', 'es-b'],
        error,
      },
    ]);
  });

  it('gives a destination of a type with no provider nothing, and no failed group', async () => {
    const runQuery = jest.fn();

    const result = await getDestinationAuthFailures({
      runQuery,
      baseParams,
      destinations: [destination('dbg', 'debug'), destination('toString', 'constructor')],
      parentResults,
    });

    expect(result).toEqual({ failures: {}, failedGroups: [] });
    expect(runQuery).not.toHaveBeenCalled();
  });
});

describe('getNoAuthFailures', () => {
  const noPercentage = { value: null, unit: '%' };
  const noRate = (unit: string) => ({ value: null, unit, time_unit: 's' });

  it('has no data in upload attempts, with a total of failures, for S3', () => {
    expect(getNoAuthFailures('s3')).toEqual({
      failed: { rate: noRate('{request}'), percentage: noPercentage },
      authentication: { rate: noRate('{request}'), percentage: noPercentage },
      authorization: { rate: noRate('{request}'), percentage: noPercentage },
    });
  });

  it.each(['elasticsearch', 'remote_elasticsearch', 'debug', 'constructor'])(
    'has no data in items, and no total of failures, for %s',
    (type) => {
      expect(getNoAuthFailures(type)).toEqual({
        authentication: { rate: noRate('{item}'), percentage: noPercentage },
        authorization: { rate: noRate('{item}'), percentage: noPercentage },
      });
    }
  );
});
