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
import { STATS_REQUEST_FAILED_ERROR_CODE } from './map_stats_response';
import { buildStatsRequestBody, createUnitStatsClient, toFailureReason } from './unit_stats_client';

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

describe('toFailureReason', () => {
  // An HTTP error is an Error with the request that failed. Its message is the status text.
  const httpError = (body?: { message?: string }) =>
    Object.assign(new Error('Forbidden'), { name: 'HttpFetchError', request: {}, body });

  it('gives the message that the server sent, and not the status text', () => {
    const error = httpError({ message: 'The current user cannot read the stats stream.' });

    expect(toFailureReason(error)).toBe('The current user cannot read the stats stream.');
  });

  it('gives the message of the error when the server sent none', () => {
    expect(toFailureReason(httpError())).toBe('Forbidden');
    expect(toFailureReason(httpError({}))).toBe('Forbidden');
  });

  it('gives the message of an error that is not an HTTP error', () => {
    expect(toFailureReason(new Error('Network down'))).toBe('Network down');
  });

  it('gives a value that is not an error as text', () => {
    expect(toFailureReason('broken')).toBe('broken');
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

  describe('a request of many components', () => {
    const destinations = (count: number): StreamsUnit.StatsComponentRef[] =>
      Array.from({ length: count }, (_, index) => ({
        kind: 'destination',
        id: `destination-${index}`,
      }));

    const fetchMany = (fetch: jest.Mock, count: number, signal = new AbortController().signal) =>
      createClient(fetch).fetchStats(
        { components: destinations(count), window: { kind: 'default' } },
        { signal }
      );

    const sizesOfCalls = (fetch: jest.Mock): number[] =>
      fetch.mock.calls.map(([, { params }]) => params.body.components.length);

    it('sends exactly the limit as one request', async () => {
      const fetch = jest.fn().mockResolvedValue(STATS_FIXTURE_RESPONSES.noData);

      await fetchMany(fetch, MAX_STREAMS_UNIT_STATS_COMPONENTS);

      expect(sizesOfCalls(fetch)).toEqual([MAX_STREAMS_UNIT_STATS_COMPONENTS]);
    });

    it('splits it into requests of at most the limit, one after another', async () => {
      let inFlight = 0;
      let mostInFlight = 0;
      const fetch = jest.fn().mockImplementation(async () => {
        inFlight += 1;
        mostInFlight = Math.max(mostInFlight, inFlight);
        await Promise.resolve();
        inFlight -= 1;
        return STATS_FIXTURE_RESPONSES.noData;
      });

      await fetchMany(fetch, 250);

      expect(sizesOfCalls(fetch)).toEqual([100, 100, 50]);
      expect(mostInFlight).toBe(1);
    });

    it('merges the requests into one response that holds every component', async () => {
      const fetch = jest
        .fn()
        .mockResolvedValueOnce(STATS_FIXTURE_RESPONSES.data)
        .mockResolvedValue(STATS_FIXTURE_RESPONSES.noData);

      const result = await fetchMany(fetch, 250);

      expect(Object.keys(result.destinations)).toHaveLength(250);
      expect(result.window).toEqual(STATS_FIXTURE_RESPONSES.data.meta.window);
    });

    it('keeps the other requests when one fails, and gives its components an error', async () => {
      const fetch = jest
        .fn()
        .mockRejectedValueOnce(new Error('Service Unavailable'))
        .mockResolvedValue(STATS_FIXTURE_RESPONSES.noData);

      const result = await fetchMany(fetch, 250);

      expect(sizesOfCalls(fetch)).toEqual([100, 100, 50]);
      expect(result.destinations['destination-0']).toMatchObject({
        status: 'error',
        error: { code: STATS_REQUEST_FAILED_ERROR_CODE, reason: 'Service Unavailable' },
      });
      expect(result.destinations['destination-99'].status).toBe('error');
      expect(result.destinations['destination-100'].status).toBe('noData');
      expect(result.destinations['destination-249'].status).toBe('noData');
    });

    it('throws the first error when no request succeeded', async () => {
      const first = new Error('first');
      const fetch = jest.fn().mockRejectedValueOnce(first).mockRejectedValue(new Error('later'));

      await expect(fetchMany(fetch, 250)).rejects.toBe(first);
      expect(fetch).toHaveBeenCalledTimes(3);
    });

    it('sends no further request after an abort, and rejects', async () => {
      const controller = new AbortController();
      const fetch = jest.fn().mockImplementation(async () => {
        controller.abort();
        throw new DOMException('The request was aborted', 'AbortError');
      });

      await expect(fetchMany(fetch, 250, controller.signal)).rejects.toMatchObject({
        name: 'AbortError',
      });
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });
});
