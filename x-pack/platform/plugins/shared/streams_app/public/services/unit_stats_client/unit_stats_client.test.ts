/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StreamsUnit } from '@kbn/streams-schema';
import {
  MAX_STREAMS_UNIT_STATS_COMPONENTS,
  streamsUnitStatsRequestSchema,
} from '@kbn/streams-schema';
import { STATS_FIXTURE_RESPONSES } from './fixture_unit_stats_client';
import { buildStatsRequestBody, createUnitStatsClient } from './unit_stats_client';

const UNIT_ID = 'unit-under-test';

const COMPONENTS: StreamsUnit.StatsComponentRef[] = [
  { kind: 'destination', id: 'es-prod' },
  { kind: 'processor', id: 'uppercase-message' },
];

const createClient = (fetch: jest.Mock) =>
  createUnitStatsClient({ streamsRepositoryClient: { fetch } as never, unitId: UNIT_ID });

describe('buildStatsRequestBody', () => {
  it('names the components and sends no filter for the default window', () => {
    const body = buildStatsRequestBody({ components: COMPONENTS, window: { kind: 'default' } });

    expect(body).toEqual({ components: COMPONENTS });
    expect(streamsUnitStatsRequestSchema.safeParse(body).success).toBe(true);
  });

  it('sends a range as filter.time_range', () => {
    const body = buildStatsRequestBody({
      components: COMPONENTS,
      window: { kind: 'range', start: '2026-10-27T12:00:00.000Z', end: '2026-10-27T12:15:00.000Z' },
    });

    expect(body).toEqual({
      components: COMPONENTS,
      filter: {
        time_range: { start: '2026-10-27T12:00:00.000Z', end: '2026-10-27T12:15:00.000Z' },
      },
    });
    expect(streamsUnitStatsRequestSchema.safeParse(body).success).toBe(true);
  });

  it('keeps an empty component list, which asks for no components and not for all of them', () => {
    const body = buildStatsRequestBody({ components: [], window: { kind: 'default' } });

    expect(body).toEqual({ components: [] });
  });
});

describe('createUnitStatsClient', () => {
  it('calls the stats route for its unit with the body and the signal', async () => {
    const fetch = jest.fn().mockResolvedValue(STATS_FIXTURE_RESPONSES.data);
    const { signal } = new AbortController();

    await createClient(fetch).fetchStats(
      { components: COMPONENTS, window: { kind: 'default' } },
      { signal }
    );

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith('POST /internal/streams/unit/{id}/_stats', {
      params: { path: { id: UNIT_ID }, body: { components: COMPONENTS } },
      signal,
    });
    expect(fetch.mock.calls[0][1].signal).toBe(signal);
  });

  it('maps the response to the view types for the requested components', async () => {
    const fetch = jest.fn().mockResolvedValue(STATS_FIXTURE_RESPONSES.data);

    const result = await createClient(fetch).fetchStats(
      { components: COMPONENTS, window: { kind: 'default' } },
      { signal: new AbortController().signal }
    );

    expect(result.window).toEqual(STATS_FIXTURE_RESPONSES.data.meta.window);
    expect(result.destinations['es-prod']).toMatchObject({
      status: 'ready',
      stats: { eventsRate: 3700 },
    });
    expect(result.processors['uppercase-message'].status).toBe('ready');
  });

  it('throws the error of a failed request as it is', async () => {
    const unavailable = Object.assign(new Error('Service Unavailable'), {
      body: { statusCode: 503, error: 'Service Unavailable', message: 'Service Unavailable' },
    });
    const fetch = jest.fn().mockRejectedValue(unavailable);

    await expect(
      createClient(fetch).fetchStats(
        { components: COMPONENTS, window: { kind: 'default' } },
        { signal: new AbortController().signal }
      )
    ).rejects.toBe(unavailable);
  });

  it('rejects when the request is aborted, and leaves it to the caller to tell an abort from a failure', async () => {
    const controller = new AbortController();
    const fetch = jest.fn().mockImplementation(
      (_endpoint: string, { signal }: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () =>
            reject(new DOMException('The request was aborted', 'AbortError'))
          );
        })
    );

    const request = createClient(fetch).fetchStats(
      { components: COMPONENTS, window: { kind: 'default' } },
      { signal: controller.signal }
    );
    controller.abort();

    await expect(request).rejects.toMatchObject({ name: 'AbortError' });
    expect(controller.signal.aborted).toBe(true);
  });

  it('rejects before a call when a request names more components than one request allows', async () => {
    const fetch = jest.fn();
    const tooMany: StreamsUnit.StatsComponentRef[] = Array.from(
      { length: MAX_STREAMS_UNIT_STATS_COMPONENTS + 1 },
      (_, index) => ({ kind: 'destination', id: `destination-${index}` })
    );

    await expect(
      createClient(fetch).fetchStats(
        { components: tooMany, window: { kind: 'default' } },
        { signal: new AbortController().signal }
      )
    ).rejects.toThrow(`at most ${MAX_STREAMS_UNIT_STATS_COMPONENTS} components`);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('accepts a request of exactly the limit', async () => {
    const fetch = jest.fn().mockResolvedValue(STATS_FIXTURE_RESPONSES.noData);
    const atLimit: StreamsUnit.StatsComponentRef[] = Array.from(
      { length: MAX_STREAMS_UNIT_STATS_COMPONENTS },
      (_, index) => ({ kind: 'destination', id: `destination-${index}` })
    );

    await createClient(fetch).fetchStats(
      { components: atLimit, window: { kind: 'default' } },
      { signal: new AbortController().signal }
    );

    expect(fetch).toHaveBeenCalledTimes(1);
  });
});
