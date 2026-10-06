/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as esErrors } from '@elastic/elasticsearch';
import type { TransportResult } from '@elastic/elasticsearch';
import type { IndicesStatsResponse } from '@elastic/elasticsearch/lib/api/types';
import { storeStatsRoute } from './store_stats_route';

const route = storeStatsRoute['GET /internal/streams/{name}/_store_stats'];

type HandlerParams = Parameters<typeof route.handler>[0];

const callHandler = ({
  name,
  statsResult,
  statsError,
}: {
  name: string;
  statsResult?: IndicesStatsResponse;
  statsError?: Error;
}) => {
  const stats = jest.fn();
  if (statsError) {
    stats.mockRejectedValue(statsError);
  } else {
    stats.mockResolvedValue(statsResult);
  }

  const getScopedClients = jest.fn().mockResolvedValue({
    scopedClusterClient: { asCurrentUser: { indices: { stats } } },
  });

  const telemetry = {
    startTrackingEndpointLatency: jest.fn().mockReturnValue(jest.fn()),
    reportStreamsStateError: jest.fn(),
  };

  const handlerParams = {
    params: { path: { name } },
    request: {},
    getScopedClients,
    response: {},
    logger: { error: jest.fn() },
    context: {},
    telemetry,
  } as unknown as HandlerParams;

  return route.handler(handlerParams);
};

const makeEsResponseError = (statusCode: number) =>
  new esErrors.ResponseError({
    statusCode,
    headers: {},
    warnings: [],
    meta: {} as TransportResult['meta'],
    body: { error: { type: 'exception', reason: 'boom' } },
  } as TransportResult);

describe('store_stats route', () => {
  it('counts frozen searchable-snapshot data via total_data_set_size_in_bytes', async () => {
    // Frozen searchable-snapshot data reports size_in_bytes: 0; only total_data_set_size_in_bytes captures it.
    const result = await callHandler({
      name: 'my-stream',
      statsResult: {
        _all: {
          total: {
            store: { size_in_bytes: 0, total_data_set_size_in_bytes: 130_000_000 },
          },
        },
      } as IndicesStatsResponse,
    });

    expect(result).toEqual({ store_size_bytes: 130_000_000 });
  });

  it('reports replica-inclusive size (total, not primaries) to match the bulk storage_stats route', async () => {
    // With number_of_replicas > 0, `total` (primaries + replicas) exceeds `primaries`. This endpoint
    // must report `total` so the stream detail size matches the stream list / lifecycle surfaces.
    const result = await callHandler({
      name: 'my-stream',
      statsResult: {
        _all: {
          primaries: { store: { total_data_set_size_in_bytes: 100_000_000 } },
          total: { store: { total_data_set_size_in_bytes: 200_000_000 } },
        },
      } as IndicesStatsResponse,
    });

    expect(result).toEqual({ store_size_bytes: 200_000_000 });
  });

  it('returns 0 when stats are missing', async () => {
    const result = await callHandler({
      name: 'my-stream',
      statsResult: { _all: {} } as IndicesStatsResponse,
    });

    expect(result).toEqual({ store_size_bytes: 0 });
  });

  it('returns 0 when the index does not exist yet (404)', async () => {
    const result = await callHandler({
      name: 'missing-stream',
      statsError: makeEsResponseError(404),
    });

    expect(result).toEqual({ store_size_bytes: 0 });
  });

  it('rethrows non-404 errors (e.g. authorization failures)', async () => {
    await expect(
      callHandler({ name: 'my-stream', statsError: makeEsResponseError(403) })
    ).rejects.toThrow();
  });
});
