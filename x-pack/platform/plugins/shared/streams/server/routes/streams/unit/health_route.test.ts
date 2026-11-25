/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { StatusError } from '../../../lib/streams/errors/status_error';
import { getStreamsUnitHealthRoute } from './health_route';

const mockGetUnit = jest.fn();
const mockGetUnitLiveness = jest.fn();

jest.mock('../../../lib/saved_objects/streams_unit_service', () => ({
  StreamsUnitService: jest.fn().mockImplementation(() => ({ getUnit: mockGetUnit })),
}));

const liveness = { state: 'up', last_seen: '2026-11-25T18:37:31.248Z' };

const route = getStreamsUnitHealthRoute['GET /internal/streams/unit/{id}/_health'];

const callHandler = ({ canvasEnabled = true }: { canvasEnabled?: boolean } = {}) =>
  route.handler({
    params: { path: { id: 'default' } },
    request: {},
    logger: loggingSystemMock.createLogger(),
    telemetry: {
      startTrackingEndpointLatency: () => () => {},
      reportStreamsStateError: jest.fn(),
    },
    getScopedClients: async () => ({
      uiSettingsClient: { get: async () => canvasEnabled },
      unitSoClient: {},
      unitStatsClient: { getUnitLiveness: mockGetUnitLiveness },
    }),
  } as never);

describe('GET /internal/streams/unit/{id}/_health handler', () => {
  beforeEach(() => {
    mockGetUnit.mockReset().mockResolvedValue({ unit: {}, ui_metadata: {} });
    mockGetUnitLiveness.mockReset().mockResolvedValue(liveness);
  });

  it('returns the liveness of the unit', async () => {
    const response = await callHandler();

    expect(mockGetUnitLiveness).toHaveBeenCalledWith({ unitId: 'default' });
    expect(response).toEqual({ liveness });
  });

  it('is a 404 when the canvas setting is off', async () => {
    await expect(callHandler({ canvasEnabled: false })).rejects.toMatchObject({
      output: { statusCode: 404 },
    });
    expect(mockGetUnit).not.toHaveBeenCalled();
    expect(mockGetUnitLiveness).not.toHaveBeenCalled();
  });

  it('is a 404 when the unit does not exist', async () => {
    mockGetUnit.mockRejectedValue(new StatusError('Streams unit [default] not found.', 404));

    await expect(callHandler()).rejects.toMatchObject({ output: { statusCode: 404 } });
    expect(mockGetUnitLiveness).not.toHaveBeenCalled();
  });
});
