/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { listStreamsRoute } from './route';

jest.mock('../../../../lib/streams/stream_crud', () => ({
  getDataStreamLifecycle: jest.fn((dataStream: { name: string } | null) => ({
    lifecycleFor: dataStream?.name ?? null,
  })),
  getFailureStore: jest.fn(({ dataStream }: { dataStream: { name: string } | null }) => ({
    failureStoreFor: dataStream?.name ?? null,
  })),
}));

const route = listStreamsRoute['GET /internal/streams'];

type HandlerParams = Parameters<typeof route.handler>[0];

const makeNames = (count: number): string[] =>
  Array.from({ length: count }, (_, i) => `logs-app-${String(i).padStart(5, '0')}.child`);

const callHandler = ({
  existing,
  missing = [],
  failureStoreReadable = [],
}: {
  existing: string[];
  missing?: string[];
  failureStoreReadable?: string[];
}) => {
  const getDataStream = jest.fn(async ({ name }: { name: string[] }) => ({
    // Reverse each chunk so the route cannot rely on response order.
    data_streams: [...name].reverse().map((streamName) => ({ name: streamName })),
  }));

  const streamsClient = {
    listStreamsWithDataStreamExistence: jest
      .fn()
      .mockResolvedValue([
        ...existing.map((name) => ({ stream: { name }, exists: true })),
        ...missing.map((name) => ({ stream: { name }, exists: false })),
      ]),
    getPrivilegesPerStream: jest.fn(async (names: string[]) =>
      Object.fromEntries(
        names.map((name) => [name, { read_failure_store: failureStoreReadable.includes(name) }])
      )
    ),
  };

  const getScopedClients = jest.fn().mockResolvedValue({
    streamsClient,
    scopedClusterClient: { asCurrentUser: { indices: { getDataStream } } },
    uiSettingsClient: { get: jest.fn().mockResolvedValue(false) },
  });

  return {
    getDataStream,
    result: route.handler({
      request: {},
      getScopedClients,
      telemetry: {
        startTrackingEndpointLatency: jest.fn().mockReturnValue(jest.fn()),
        reportStreamsStateError: jest.fn(),
      },
      logger: { error: jest.fn() },
    } as unknown as HandlerParams),
  };
};

describe('GET /internal/streams', () => {
  it('attaches each stream its own data stream when names span several chunks', async () => {
    const existing = makeNames(400);
    const { getDataStream, result } = callHandler({ existing });

    const { streams } = await result;

    expect(getDataStream.mock.calls.length).toBeGreaterThan(1);
    expect(streams).toHaveLength(400);
    for (const { stream, data_stream: dataStream, effective_lifecycle: lifecycle } of streams) {
      expect(dataStream).toEqual({ name: stream.name });
      expect(lifecycle).toEqual({ lifecycleFor: stream.name });
    }
  });

  it('leaves data_stream undefined for streams without a data stream', async () => {
    const { result } = callHandler({ existing: ['logs-a'], missing: ['logs-b'] });

    const { streams } = await result;
    const missingStream = streams.find(({ stream }) => stream.name === 'logs-b');

    expect(missingStream?.data_stream).toBeUndefined();
    expect(missingStream?.effective_lifecycle).toEqual({ lifecycleFor: null });
  });

  it('only adds the failure store for streams whose failure store the user can read', async () => {
    const { result } = callHandler({
      existing: ['logs-a', 'logs-b'],
      failureStoreReadable: ['logs-b'],
    });

    const { streams } = await result;
    const byName = Object.fromEntries(streams.map((detail) => [detail.stream.name, detail]));

    expect(byName['logs-a'].effective_failure_store).toBeUndefined();
    expect(byName['logs-a'].privileges).toEqual({ read_failure_store: false });
    expect(byName['logs-b'].effective_failure_store).toEqual({ failureStoreFor: 'logs-b' });
    expect(byName['logs-b'].privileges).toEqual({ read_failure_store: true });
  });
});
