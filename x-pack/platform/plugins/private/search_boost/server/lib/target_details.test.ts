/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DiagnosticResult } from '@elastic/elasticsearch';
import { errors } from '@elastic/elasticsearch';
import type { IndicesDataStream } from '@elastic/elasticsearch/lib/api/types';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { getStorageSizes, getTargetDetails, toRetention } from './target_details';

const forbidden = () =>
  new errors.ResponseError({
    statusCode: 403,
    body: { error: { type: 'security_exception' } },
    headers: {},
    warnings: [],
    meta: {} as DiagnosticResult['meta'],
  });

const dataStream = (name: string, lifecycle?: IndicesDataStream['lifecycle']) =>
  ({ name, lifecycle } as IndicesDataStream);

const DATA_STREAMS = [dataStream('logs', { enabled: true, effective_retention: '30d' })];

const createClient = () => {
  const client = elasticsearchServiceMock.createScopedClusterClient();
  client.asSecondaryAuthUser.transport.request.mockResolvedValue({
    indices: [{ name: 'catalog', size_in_bytes: 1024 }],
    datastreams: [{ name: 'logs', size_in_bytes: 4096 }],
  });
  return client;
};

describe('toRetention', () => {
  it.each([
    ['no lifecycle', undefined, { type: 'disabled' }],
    ['a disabled lifecycle', { enabled: false }, { type: 'disabled' }],
    ['no retention', { enabled: true }, { type: 'infinite' }],
    [
      'a retention',
      { effective_retention: '7d' },
      { type: 'value', value: '7d', inMilliseconds: 604_800_000 },
    ],
    [
      'a retention in hours',
      { effective_retention: '12h' },
      { type: 'value', value: '12h', inMilliseconds: 43_200_000 },
    ],
    [
      'a retention in seconds',
      { effective_retention: '60s' },
      { type: 'value', value: '60s', inMilliseconds: 60_000 },
    ],
    // Elasticsearch accepts "-1" and "0", and returns them as "-1" and "0ms".
    [
      'a negative retention',
      { effective_retention: '-1' },
      { type: 'value', value: '-1', inMilliseconds: -1 },
    ],
    [
      'a zero retention',
      { effective_retention: '0ms' },
      { type: 'value', value: '0ms', inMilliseconds: 0 },
    ],
  ])('reads %s', (_, lifecycle, expected) => {
    expect(toRetention(lifecycle as IndicesDataStream['lifecycle'])).toEqual(expected);
  });
});

describe('getStorageSizes', () => {
  it('reads the sizes of indices and data streams from `_metering/stats`', async () => {
    const client = createClient();

    expect(await getStorageSizes(client, loggingSystemMock.createLogger())).toEqual([
      { name: 'catalog', size_in_bytes: 1024 },
      { name: 'logs', size_in_bytes: 4096 },
    ]);
    expect(client.asSecondaryAuthUser.transport.request).toHaveBeenCalledWith(
      { method: 'GET', path: '/_metering/stats/*' },
      { requestTimeout: 5_000 }
    );
  });

  it('lists none and warns when they fail to load', async () => {
    const client = createClient();
    client.asSecondaryAuthUser.transport.request.mockRejectedValue(new Error('Not available'));
    const logger = loggingSystemMock.createLogger();

    expect(await getStorageSizes(client, logger)).toEqual([]);
    expect(logger.warn).toHaveBeenCalledWith('Unable to load storage sizes: Not available');
  });

  it('lists none and only logs at debug level for users without the privileges', async () => {
    const client = createClient();
    client.asSecondaryAuthUser.transport.request.mockRejectedValue(forbidden());
    const logger = loggingSystemMock.createLogger();

    expect(await getStorageSizes(client, logger)).toEqual([]);
    expect(logger.warn).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalled();
  });

  it('lists none when the request has no credentials to pass on', async () => {
    const client = createClient();
    Object.defineProperty(client, 'asSecondaryAuthUser', {
      get: () => {
        throw new Error('No authorization header');
      },
    });
    const logger = loggingSystemMock.createLogger();

    expect(await getStorageSizes(client, logger)).toEqual([]);
    expect(logger.warn).not.toHaveBeenCalled();
  });
});

describe('getTargetDetails', () => {
  it('keys the sizes of indices and data streams, and the retention of data streams, by name', () => {
    const details = getTargetDetails(
      [
        { name: 'catalog', size_in_bytes: 1024 },
        { name: 'logs', size_in_bytes: 4096 },
      ],
      DATA_STREAMS
    );

    expect(Object.fromEntries(details)).toEqual({
      catalog: { storageSizeInBytes: 1024 },
      logs: {
        storageSizeInBytes: 4096,
        retention: { type: 'value', value: '30d', inMilliseconds: 2_592_000_000 },
      },
    });
  });

  it('keeps the retention when no size loaded', () => {
    expect(Object.fromEntries(getTargetDetails([], DATA_STREAMS))).toEqual({
      logs: { retention: { type: 'value', value: '30d', inMilliseconds: 2_592_000_000 } },
    });
  });
});
