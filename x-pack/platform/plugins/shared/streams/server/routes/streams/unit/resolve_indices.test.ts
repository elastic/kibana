/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import type { DestinationCollection } from '../../../lib/unit_stats/client';
import { resolveUnitIndicesRoute } from './resolve_indices';

const getUnitOrEmpty = jest.fn();

jest.mock('../../../lib/saved_objects/streams_unit_service', () => ({
  StreamsUnitService: jest.fn().mockImplementation(() => ({ getUnitOrEmpty })),
}));

const route = resolveUnitIndicesRoute['GET /internal/streams/unit/{id}/_resolve_indices'];

type HandlerParams = Parameters<typeof route.handler>[0];

/** 900 seconds, so a collection with the default 900 documents has a rate of 1 per second. */
const timeRange = { start: '2026-11-23T15:00:00.000Z', end: '2026-11-23T15:15:00.000Z' };
const DEFAULT_DOCUMENTS = 900;

const toCollection = (collection: string | DestinationCollection): DestinationCollection =>
  typeof collection === 'string' ? { name: collection, documents: DEFAULT_DOCUMENTS } : collection;

const callHandler = ({
  resolveIndex,
  getDataStream,
  collectionsByDestination = {},
  getDestinationCollections = jest.fn(async ({ destinationIds }: { destinationIds: string[] }) =>
    Object.fromEntries(
      destinationIds.map((id) => [id, (collectionsByDestination[id] ?? []).map(toCollection)])
    )
  ),
  readFailureStore = {},
  logger = { error: jest.fn(), warn: jest.fn() },
}: {
  resolveIndex: jest.Mock;
  getDataStream: jest.Mock;
  collectionsByDestination?: Record<string, Array<string | DestinationCollection>>;
  getDestinationCollections?: jest.Mock;
  readFailureStore?: Record<string, boolean>;
  logger?: { error: jest.Mock; warn: jest.Mock };
}) =>
  route.handler({
    request: {},
    params: { path: { id: 'default' }, query: timeRange },
    logger,
    telemetry: {
      startTrackingEndpointLatency: jest.fn().mockReturnValue(jest.fn()),
      reportStreamsStateError: jest.fn(),
    },
    getScopedClients: jest.fn().mockResolvedValue({
      uiSettingsClient: { get: jest.fn().mockResolvedValue(true) },
      soClient: {},
      scopedClusterClient: { asCurrentUser: { indices: { resolveIndex, getDataStream } } },
      unitStatsClient: { getDestinationCollections },
      streamsClient: {
        getPrivilegesPerStream: jest.fn(async (names: string[]) =>
          Object.fromEntries(
            names.map((name) => [name, { read_failure_store: readFailureStore[name] ?? false }])
          )
        ),
      },
    }),
  } as unknown as HandlerParams);

const mixedDestinationUnit = {
  unit: {
    destinations: [
      {
        id: 'es-mixed',
        name: 'Mixed',
        type: 'elasticsearch',
        supported_telemetry: ['logs'],
        config: [{ name: 'write_patterns', value: ['logs-*'] }],
      },
    ],
  },
  ui_metadata: {},
};

describe('GET /internal/streams/unit/{id}/_resolve_indices', () => {
  it('asks the metrics where each local Elasticsearch destination wrote in the time range', async () => {
    getUnitOrEmpty.mockResolvedValue({
      unit: {
        destinations: [
          {
            id: 'es-auto',
            name: 'Auto',
            type: 'elasticsearch',
            supported_telemetry: ['logs', 'metrics', 'traces'],
          },
          { id: 's3-archive', name: 'Archive', type: 's3', supported_telemetry: ['logs'] },
        ],
      },
      ui_metadata: {},
    });
    const getDestinationCollections = jest.fn().mockResolvedValue({ 'es-auto': [] });
    const resolveIndex = jest.fn();
    const getDataStream = jest.fn();

    const result = await callHandler({ resolveIndex, getDataStream, getDestinationCollections });

    expect(getDestinationCollections).toHaveBeenCalledWith({
      unitId: 'default',
      destinationIds: ['es-auto'],
      window: timeRange,
    });
    expect(resolveIndex).not.toHaveBeenCalled();
    expect(result).toEqual({
      destinations: { 'es-auto': { indices: [] }, 's3-archive': { indices: [] } },
    });
  });

  it('lists only the indices a destination wrote to, not every index its write patterns match', async () => {
    getUnitOrEmpty.mockResolvedValue({
      unit: {
        destinations: [
          {
            id: 'es-auto',
            name: 'Auto',
            type: 'elasticsearch',
            supported_telemetry: ['logs'],
          },
        ],
      },
      ui_metadata: {},
    });
    const resolveIndex = jest.fn().mockResolvedValue({
      data_streams: [{ name: 'logs-app.otel-default' }],
      indices: [],
    });
    const getDataStream = jest.fn().mockResolvedValue({ data_streams: [] });

    const result = await callHandler({
      resolveIndex,
      getDataStream,
      collectionsByDestination: { 'es-auto': ['logs-app.otel-default'] },
    });

    expect(resolveIndex).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'logs-app.otel-default' })
    );
    expect(result.destinations['es-auto'].indices.map((index) => index.name)).toEqual([
      'logs-app.otel-default',
    ]);
  });

  it('gives each index the documents the destination wrote to it, and their rate over the time range', async () => {
    getUnitOrEmpty.mockResolvedValue(mixedDestinationUnit);
    const resolveIndex = jest.fn().mockResolvedValue({
      data_streams: [{ name: 'logs-app-default' }],
      indices: [{ name: 'logs-regular' }],
    });
    const getDataStream = jest.fn().mockResolvedValue({ data_streams: [] });

    const result = await callHandler({
      resolveIndex,
      getDataStream,
      collectionsByDestination: {
        'es-mixed': [
          { name: 'logs-app-default', documents: 1800 },
          { name: 'logs-regular', documents: 45 },
        ],
      },
    });

    expect(result.destinations['es-mixed'].indices).toEqual([
      expect.objectContaining({ name: 'logs-app-default', documents: 1800, ingestion_rate: 2 }),
      expect.objectContaining({ name: 'logs-regular', documents: 45, ingestion_rate: 0.05 }),
    ]);
  });

  it('leaves out a written-to index that no longer resolves', async () => {
    getUnitOrEmpty.mockResolvedValue(mixedDestinationUnit);
    const resolveIndex = jest.fn().mockResolvedValue({
      data_streams: [{ name: 'logs-kept-default' }],
      indices: [],
    });
    const getDataStream = jest.fn().mockResolvedValue({ data_streams: [] });

    const result = await callHandler({
      resolveIndex,
      getDataStream,
      collectionsByDestination: { 'es-mixed': ['logs-kept-default', 'logs-deleted-default'] },
    });

    expect(result.destinations['es-mixed'].indices.map((index) => index.name)).toEqual([
      'logs-kept-default',
    ]);
  });

  it('fails with the error of the metrics query', async () => {
    getUnitOrEmpty.mockResolvedValue(mixedDestinationUnit);
    const forbidden = Object.assign(new Error('The current user cannot read the stats stream.'), {
      statusCode: 403,
    });

    await expect(
      callHandler({
        resolveIndex: jest.fn(),
        getDataStream: jest.fn(),
        getDestinationCollections: jest.fn().mockRejectedValue(forbidden),
      })
    ).rejects.toBe(forbidden);
  });

  it('keys resolved indices by the destination that wrote them', async () => {
    getUnitOrEmpty.mockResolvedValue({
      unit: {
        destinations: [
          {
            id: 'es-logs',
            name: 'Logs',
            type: 'elasticsearch',
            supported_telemetry: ['logs'],
            config: [{ name: 'write_patterns', value: ['logs-*-*'] }],
          },
          {
            id: 'es-metrics',
            name: 'Metrics',
            type: 'elasticsearch',
            supported_telemetry: ['metrics'],
            config: [{ name: 'index', value: 'metrics-host-default' }],
          },
          { id: 'debug-out', name: 'Debug', type: 'debug', supported_telemetry: ['logs'] },
        ],
      },
      ui_metadata: {},
    });
    const resolveIndex = jest.fn().mockResolvedValue({
      data_streams: [{ name: 'logs-nginx-default' }, { name: 'metrics-host-default' }],
      indices: [],
    });
    const getDataStream = jest.fn().mockResolvedValue({
      data_streams: [
        {
          name: 'logs-nginx-default',
          next_generation_managed_by: 'Data stream lifecycle',
          lifecycle: { data_retention: '7d' },
          failure_store: {
            enabled: true,
            indices: [{ index_name: '.fs-logs-nginx-default-000001' }],
          },
          status: 'GREEN',
        },
        {
          name: 'metrics-host-default',
          next_generation_managed_by: 'Index Lifecycle Management',
          ilm_policy: 'metrics',
          status: 'yellow',
        },
      ],
    });

    const result = await callHandler({
      resolveIndex,
      getDataStream,
      collectionsByDestination: {
        'es-logs': ['logs-nginx-default'],
        'es-metrics': ['metrics-host-default'],
      },
      readFailureStore: { 'logs-nginx-default': true },
    });

    expect(resolveIndex).toHaveBeenCalledWith({
      name: 'logs-nginx-default,metrics-host-default',
      expand_wildcards: 'open',
      ignore_unavailable: true,
      allow_no_indices: true,
    });
    expect(result.destinations['es-logs'].indices.map((index) => index.name)).toEqual([
      'logs-nginx-default',
    ]);
    expect(result.destinations['es-metrics'].indices.map((index) => index.name)).toEqual([
      'metrics-host-default',
    ]);
    expect(result.destinations['debug-out'].indices).toEqual([]);
    expect(result.destinations['es-logs'].indices[0]).toEqual({
      name: 'logs-nginx-default',
      documents: DEFAULT_DOCUMENTS,
      ingestion_rate: 1,
      is_data_stream: true,
      lifecycle: { dsl: { data_retention: '7d', downsample: undefined, frozen_after: undefined } },
      failure_store_enabled: true,
      health: 'green',
      privileges: { read_failure_store: true },
    });
    expect(result.destinations['es-metrics'].indices[0]).toMatchObject({
      failure_store_enabled: false,
      health: 'yellow',
      privileges: { read_failure_store: false },
    });
  });

  it('lists regular indices without lifecycle alongside data streams', async () => {
    getUnitOrEmpty.mockResolvedValue(mixedDestinationUnit);
    const resolveIndex = jest.fn().mockResolvedValue({
      data_streams: [{ name: 'logs-nginx-default' }],
      indices: [{ name: 'logs-regular' }],
    });
    const getDataStream = jest.fn().mockResolvedValue({
      data_streams: [
        {
          name: 'logs-nginx-default',
          next_generation_managed_by: 'Data stream lifecycle',
          lifecycle: { data_retention: '7d' },
        },
      ],
    });

    const result = await callHandler({
      resolveIndex,
      getDataStream,
      collectionsByDestination: { 'es-mixed': ['logs-nginx-default', 'logs-regular'] },
    });

    expect(getDataStream).toHaveBeenCalledWith({ name: ['logs-nginx-default'] });
    expect(result.destinations['es-mixed'].indices).toEqual([
      {
        name: 'logs-nginx-default',
        documents: DEFAULT_DOCUMENTS,
        ingestion_rate: 1,
        is_data_stream: true,
        lifecycle: {
          dsl: { data_retention: '7d', downsample: undefined, frozen_after: undefined },
        },
        failure_store_enabled: false,
        privileges: { read_failure_store: false },
      },
      {
        name: 'logs-regular',
        documents: DEFAULT_DOCUMENTS,
        ingestion_rate: 1,
        is_data_stream: false,
      },
    ]);
  });

  it('reports data stream lookup failures instead of "not found"', async () => {
    getUnitOrEmpty.mockResolvedValue(mixedDestinationUnit);
    const resolveIndex = jest.fn().mockResolvedValue({
      data_streams: [{ name: 'logs-nginx-default' }],
      indices: [],
    });
    const getDataStream = jest.fn().mockRejectedValue(new Error('security_exception'));
    const logger = { error: jest.fn(), warn: jest.fn() };

    const result = await callHandler({
      resolveIndex,
      getDataStream,
      collectionsByDestination: { 'es-mixed': ['logs-nginx-default'] },
      logger,
    });

    expect(result.destinations['es-mixed'].indices[0]).toMatchObject({
      is_data_stream: true,
      lifecycle: { error: { message: 'security_exception' } },
      failure_store_enabled: true,
    });
    expect(logger.warn).toHaveBeenCalled();
  });

  it('reports data streams missing from a 404 lookup as not found', async () => {
    getUnitOrEmpty.mockResolvedValue(mixedDestinationUnit);
    const resolveIndex = jest.fn().mockResolvedValue({
      data_streams: [{ name: 'logs-nginx-default' }],
      indices: [],
    });
    const getDataStream = jest.fn().mockRejectedValue(
      new errors.ResponseError({
        statusCode: 404,
        body: {},
        headers: {},
        warnings: [],
        meta: {} as never,
      })
    );

    const result = await callHandler({
      resolveIndex,
      getDataStream,
      collectionsByDestination: { 'es-mixed': ['logs-nginx-default'] },
    });

    expect(result.destinations['es-mixed'].indices[0]).toMatchObject({
      lifecycle: { error: { message: 'Data stream not found' } },
    });
  });
});
