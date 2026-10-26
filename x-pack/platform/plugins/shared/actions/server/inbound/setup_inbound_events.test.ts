/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';

import { actionsConfigMock } from '../actions_config.mock';
import { createInboundEventsClient } from './factory';
import { setupInboundEvents } from './setup_inbound_events';
import type { ConnectorEventEmitter, ConnectorEventEmitParams } from './types';

jest.mock('./factory', () => ({
  createInboundEventsClient: jest.fn(() => ({ ingest: jest.fn() })),
}));

const createInboundEventsClientMock = createInboundEventsClient as jest.MockedFunction<
  typeof createInboundEventsClient
>;

const emitParams = (): ConnectorEventEmitParams => ({
  eventId: 'evt-1',
  payload: { hello: 'world' },
  spaceId: DEFAULT_SPACE_ID,
  connectorId: 'c1',
  connectorTypeId: '.inboundWebhook',
  request: httpServerMock.createKibanaRequest(),
});

describe('setupInboundEvents', () => {
  const logger = loggingSystemMock.createLogger();
  const http = coreMock.createSetup().http;
  const getStartServices = coreMock.createSetup().getStartServices;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns nothing and skips admission when inbound events are disabled', () => {
    const actionsConfigUtils = actionsConfigMock.create();

    const inboundEvents = setupInboundEvents({
      actionsConfigUtils,
      http,
      getStartServices,
      logger,
      inMemoryConnectors: [],
      getConnectorEventEmitter: () => undefined,
    });

    expect(inboundEvents).toBeUndefined();
    expect(http.registerOnPreAuth).not.toHaveBeenCalled();
    expect(http.registerOnPreResponse).not.toHaveBeenCalled();
    expect(createInboundEventsClientMock).not.toHaveBeenCalled();
  });

  it('returns route deps and skips admission when the in-flight cap is off', () => {
    const actionsConfigUtils = actionsConfigMock.create();
    actionsConfigUtils.isInboundEventsEnabled.mockReturnValue(true);
    const request = httpServerMock.createKibanaRequest();

    const inboundEvents = setupInboundEvents({
      actionsConfigUtils,
      http,
      getStartServices,
      logger,
      inMemoryConnectors: [],
      getConnectorEventEmitter: () => undefined,
    });

    expect(http.registerOnPreAuth).not.toHaveBeenCalled();
    expect(http.registerOnPreResponse).toHaveBeenCalledTimes(1);
    expect(inboundEvents?.maxBodyBytes).toBe(1024 * 1024);
    expect(inboundEvents?.getSpaceId(request)).toBe('default');
    expect(createInboundEventsClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        inboundEventsEnabled: true,
        maxEmitted: 25,
        maxBodyBytes: 1024 * 1024,
        inMemoryConnectors: [],
        rateLimiter: expect.any(Object),
      })
    );
  });

  it('registers admission and reads the space id from spaces when the cap is on', () => {
    const actionsConfigUtils = actionsConfigMock.create();
    actionsConfigUtils.isInboundEventsEnabled.mockReturnValue(true);
    actionsConfigUtils.getInboundEventsAdmission.mockReturnValue({
      enabled: true,
      maxInFlight: 50,
      maxInFlightPerConnector: 10,
    });
    const request = httpServerMock.createKibanaRequest();
    const getSpaceId = jest.fn().mockReturnValue('space-a');

    const inboundEvents = setupInboundEvents({
      actionsConfigUtils,
      http,
      getStartServices,
      logger,
      spaces: { spacesService: { getSpaceId } },
      inMemoryConnectors: [],
      getConnectorEventEmitter: () => undefined,
    });

    expect(http.registerOnPreAuth).toHaveBeenCalledTimes(1);
    expect(http.registerOnPreResponse).toHaveBeenCalledTimes(1);
    expect(getSpaceId).not.toHaveBeenCalled();
    expect(inboundEvents?.getSpaceId(request)).toBe('space-a');
    expect(getSpaceId).toHaveBeenCalledWith(request);
  });

  it('reads the connector event emitter when an event is emitted', async () => {
    const actionsConfigUtils = actionsConfigMock.create();
    actionsConfigUtils.isInboundEventsEnabled.mockReturnValue(true);
    const emitter: { current?: ConnectorEventEmitter } = {};

    setupInboundEvents({
      actionsConfigUtils,
      http,
      getStartServices,
      logger,
      inMemoryConnectors: [],
      getConnectorEventEmitter: () => emitter.current,
    });

    const { emitConnectorEvents } = createInboundEventsClientMock.mock.calls[0][0];
    const params = emitParams();

    await expect(emitConnectorEvents(params)).resolves.toEqual(
      expect.objectContaining({ ok: false, reason: 'no_emitter' })
    );

    emitter.current = { emit: jest.fn().mockResolvedValue(undefined) };
    await expect(emitConnectorEvents(params)).resolves.toEqual({ ok: true });
    expect(emitter.current.emit).toHaveBeenCalledWith(params);
  });
});
