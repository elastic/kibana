/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { stripNullishRequestParameters } from '@kbn/server-route-repository/src/strip_nullish_request_parameters';
import { StatusError } from '../../../lib/streams/errors/status_error';
import { getStreamsUnitStatsRoute } from './stats_route';

const mockGetUnit = jest.fn();

jest.mock('../../../lib/saved_objects/streams_unit_service', () => ({
  StreamsUnitService: jest.fn().mockImplementation(() => ({ getUnit: mockGetUnit })),
}));

const unitResponse = {
  unit: {
    sources: [],
    destinations: [{ id: 'es-prod', type: 'debug', supported_telemetry: ['logs'] }],
    processors: [],
    pipelines: [],
  },
  ui_metadata: {},
};

const route = getStreamsUnitStatsRoute['POST /internal/streams/unit/{id}/_stats'];

const callHandler = ({
  params = { path: { id: 'default' } },
  canvasEnabled = true,
}: {
  params?: Record<string, unknown>;
  canvasEnabled?: boolean;
} = {}) =>
  route.handler({
    params,
    request: {},
    logger: loggingSystemMock.createLogger(),
    telemetry: {
      startTrackingEndpointLatency: () => () => {},
      reportStreamsStateError: jest.fn(),
    },
    getScopedClients: async () => ({
      uiSettingsClient: { get: async () => canvasEnabled },
      soClient: {},
      scopedClusterClient: { asCurrentUser: { search: jest.fn() } },
    }),
  } as never);

describe('POST /internal/streams/unit/{id}/_stats handler', () => {
  beforeEach(() => {
    mockGetUnit.mockReset().mockResolvedValue(unitResponse);
  });

  it('route repository drops an empty body, so the handler sees no body for {}', () => {
    const params = stripNullishRequestParameters({
      params: { id: 'default' },
      body: {},
      query: {},
    });

    expect(params).toEqual({ path: { id: 'default' } });
  });

  it('treats a missing body as the empty request and answers for every component', async () => {
    const response = await callHandler();

    // The debug destination emits no stats, so it answers without a search.
    expect(Object.keys(response.components.destinations)).toEqual(['es-prod']);
    expect(response.components.destinations['es-prod'].error?.code).toBe('unsupported');
  });

  it('answers a request with components', async () => {
    const response = await callHandler({
      params: {
        path: { id: 'default' },
        body: { components: [{ kind: 'destination', id: 'es-prod' }] },
      },
    });

    expect(Object.keys(response.components.destinations)).toEqual(['es-prod']);
  });

  it('is a 404 when the canvas setting is off', async () => {
    await expect(callHandler({ canvasEnabled: false })).rejects.toMatchObject({
      output: { statusCode: 404 },
    });
    expect(mockGetUnit).not.toHaveBeenCalled();
  });

  it('is a 404 when the unit does not exist', async () => {
    mockGetUnit.mockRejectedValue(new StatusError('Streams unit [default] not found.', 404));

    await expect(callHandler()).rejects.toMatchObject({ output: { statusCode: 404 } });
  });
});
