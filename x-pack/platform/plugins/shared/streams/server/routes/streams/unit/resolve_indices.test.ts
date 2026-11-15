/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { resolveUnitIndicesRoute } from './resolve_indices';

const getUnitOrEmpty = jest.fn();

jest.mock('../../../lib/saved_objects/streams_unit_service', () => ({
  StreamsUnitService: jest.fn().mockImplementation(() => ({ getUnitOrEmpty })),
}));

const route = resolveUnitIndicesRoute['GET /internal/streams/unit/{id}/_resolve_indices'];

type HandlerParams = Parameters<typeof route.handler>[0];

const callHandler = ({
  resolveIndex,
  getDataStream,
  readFailureStore = {},
  logger = { error: jest.fn(), warn: jest.fn() },
}: {
  resolveIndex: jest.Mock;
  getDataStream: jest.Mock;
  readFailureStore?: Record<string, boolean>;
  logger?: { error: jest.Mock; warn: jest.Mock };
}) =>
  route.handler({
    request: {},
    params: { path: { id: 'default' } },
    logger,
    telemetry: {
      startTrackingEndpointLatency: jest.fn().mockReturnValue(jest.fn()),
      reportStreamsStateError: jest.fn(),
    },
    getScopedClients: jest.fn().mockResolvedValue({
      uiSettingsClient: { get: jest.fn().mockResolvedValue(true) },
      soClient: {},
      scopedClusterClient: { asCurrentUser: { indices: { resolveIndex, getDataStream } } },
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
        config: [{ name: 'index_patterns', value: ['logs-*'] }],
      },
    ],
  },
  ui_metadata: {},
};

describe('GET /internal/streams/unit/{id}/_resolve_indices', () => {
  it('keys resolved indices by destination write patterns', async () => {
    getUnitOrEmpty.mockResolvedValue({
      unit: {
        destinations: [
          {
            id: 'es-logs',
            name: 'Logs',
            type: 'elasticsearch',
            supported_telemetry: ['logs'],
            config: [{ name: 'index_patterns', value: ['logs-*-*'] }],
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
          failure_store: { enabled: true },
        },
        {
          name: 'metrics-host-default',
          next_generation_managed_by: 'Index Lifecycle Management',
          ilm_policy: 'metrics',
        },
      ],
    });

    const result = await callHandler({
      resolveIndex,
      getDataStream,
      readFailureStore: { 'logs-nginx-default': true },
    });

    expect(resolveIndex).toHaveBeenCalledWith({
      name: 'logs-*-*,metrics-host-default',
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
      is_data_stream: true,
      lifecycle: { dsl: { data_retention: '7d', downsample: undefined, frozen_after: undefined } },
      failure_store_enabled: true,
      privileges: { read_failure_store: true },
    });
    expect(result.destinations['es-metrics'].indices[0]).toMatchObject({
      failure_store_enabled: false,
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

    const result = await callHandler({ resolveIndex, getDataStream });

    expect(getDataStream).toHaveBeenCalledWith({ name: ['logs-nginx-default'] });
    expect(result.destinations['es-mixed'].indices).toEqual([
      {
        name: 'logs-nginx-default',
        is_data_stream: true,
        lifecycle: {
          dsl: { data_retention: '7d', downsample: undefined, frozen_after: undefined },
        },
        failure_store_enabled: false,
        privileges: { read_failure_store: false },
      },
      { name: 'logs-regular', is_data_stream: false },
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

    const result = await callHandler({ resolveIndex, getDataStream, logger });

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

    const result = await callHandler({ resolveIndex, getDataStream });

    expect(result.destinations['es-mixed'].indices[0]).toMatchObject({
      lifecycle: { error: { message: 'Data stream not found' } },
    });
  });
});
