/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposerQuery } from '@elastic/esql';
import { getDestinationDeliverySeries } from './destination_delivery_series';
import type { EsqlRow } from './mappers/esql_rows';
import type { DestinationQueryRef } from './query_refs';

const window = { start: '2026-10-20T10:00:00.000Z', end: '2026-10-20T10:15:00.000Z' };
const baseParams = { unitId: 'default', window };
const bucketMs = 60_000;

const destination = (id: string, type: string): DestinationQueryRef => ({
  kind: 'destination',
  id,
  type,
  include: { delivery_series: true },
});

const rows: EsqlRow[] = [
  {
    id: 'es-dev',
    bucket: '2026-10-20T10:00:00.000Z',
    total_items: 100,
    failed_items: 40,
    authentication_items: 10,
    authorization_items: 25,
  },
];

describe('getDestinationDeliverySeries', () => {
  it('asks one query for all the Elasticsearch destinations, remote ones too, and maps its rows', async () => {
    const runQuery = jest.fn(async (_query: ComposerQuery) => rows);

    const { series, failedGroups } = await getDestinationDeliverySeries({
      runQuery,
      baseParams,
      destinations: [
        destination('es-dev', 'elasticsearch'),
        destination('es-backup', 'remote_elasticsearch'),
      ],
      bucketMs,
    });

    expect(runQuery).toHaveBeenCalledTimes(1);
    expect(runQuery.mock.calls[0][0].print('basic')).toContain(
      'scope.attributes.streams.destination.id IN ("es-dev", "es-backup")'
    );
    expect(failedGroups).toEqual([]);
    expect(series['es-dev'].points).toEqual([
      {
        start: '2026-10-20T10:00:00.000Z',
        total: 100,
        failed: 40,
        authentication: 10,
        authorization: 25,
      },
    ]);
  });

  it('gives a destination with no rows a series with no points, because it was asked for', async () => {
    const { series } = await getDestinationDeliverySeries({
      runQuery: async () => rows,
      baseParams,
      destinations: [
        destination('es-dev', 'elasticsearch'),
        destination('es-idle', 'elasticsearch'),
      ],
      bucketMs,
    });

    expect(series['es-idle']).toEqual({ bucket_ms: bucketMs, unit: '{item}', points: [] });
  });

  it('has no series for a type that has no way to report one, and asks it no query', async () => {
    const runQuery = jest.fn(async () => rows);

    const { series, failedGroups } = await getDestinationDeliverySeries({
      runQuery,
      baseParams,
      destinations: [destination('dbg', 'debug'), destination('other', 'otlp')],
      bucketMs,
    });

    expect(series).toEqual({});
    expect(failedGroups).toEqual([]);
    expect(runQuery).not.toHaveBeenCalled();
  });

  it('asks its own query for the S3 destinations, apart from the Elasticsearch one, and counts upload attempts', async () => {
    const runQuery = jest.fn(async (query: ComposerQuery) =>
      query.print('basic').includes('metrics.streams.destination.duration')
        ? [
            {
              id: 's3-test',
              bucket: '2026-10-20T10:00:00.000Z',
              total_items: 12,
              failed_items: 12,
              authentication_items: 12,
              authorization_items: 0,
            },
          ]
        : rows
    );

    const { series, failedGroups } = await getDestinationDeliverySeries({
      runQuery,
      baseParams,
      destinations: [destination('es-dev', 'elasticsearch'), destination('s3-test', 's3')],
      bucketMs,
    });

    expect(runQuery).toHaveBeenCalledTimes(2);
    expect(failedGroups).toEqual([]);
    expect(series['es-dev'].unit).toBe('{item}');
    expect(series['s3-test']).toEqual({
      bucket_ms: bucketMs,
      unit: '{request}',
      points: [
        {
          start: '2026-10-20T10:00:00.000Z',
          total: 12,
          failed: 12,
          authentication: 12,
          authorization: 0,
        },
      ],
    });
  });

  it('keeps the series of a type that works when the other type fails', async () => {
    const error = new Error('s3 series query failed');

    const { series, failedGroups } = await getDestinationDeliverySeries({
      runQuery: async (query) => {
        if (query.print('basic').includes('metrics.streams.destination.duration')) throw error;
        return rows;
      },
      baseParams,
      destinations: [destination('es-dev', 'elasticsearch'), destination('s3-test', 's3')],
      bucketMs,
    });

    expect(Object.keys(series)).toEqual(['es-dev']);
    expect(failedGroups).toEqual([{ types: ['s3'], ids: ['s3-test'], error }]);
  });

  it('puts a group whose provider throws in failedGroups, with its ids and types', async () => {
    const error = new Error('series query failed');

    const { series, failedGroups } = await getDestinationDeliverySeries({
      runQuery: async () => {
        throw error;
      },
      baseParams,
      destinations: [
        destination('es-dev', 'elasticsearch'),
        destination('es-backup', 'remote_elasticsearch'),
      ],
      bucketMs,
    });

    expect(series).toEqual({});
    expect(failedGroups).toEqual([
      { types: ['elasticsearch', 'remote_elasticsearch'], ids: ['es-dev', 'es-backup'], error },
    ]);
  });

  it('does not read the provider of a type named after a member of the prototype', async () => {
    const runQuery = jest.fn(async () => rows);

    const { series } = await getDestinationDeliverySeries({
      runQuery,
      baseParams,
      destinations: [destination('x', 'constructor')],
      bucketMs,
    });

    expect(series).toEqual({});
    expect(runQuery).not.toHaveBeenCalled();
  });
});
