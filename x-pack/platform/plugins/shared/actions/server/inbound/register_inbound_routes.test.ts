/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { coreMock } from '@kbn/core/server/mocks';

import {
  INBOUND_EVENTS_API_PATH,
  INBOUND_EVENTS_API_VERSION,
  INBOUND_EVENTS_SECURITY,
} from './constants';
import { registerInboundRoutes } from './register_inbound_routes';

describe('registerInboundRoutes', () => {
  it('registers a public versioned POST route', () => {
    const router = httpServiceMock.createRouter();
    const addVersionMock = jest.fn();
    (router.versioned.post as jest.Mock).mockReturnValue({ addVersion: addVersionMock });

    registerInboundRoutes({
      router,
      inboundEventsEnabled: false,
      maxBodyBytes: 1024 * 1024,
      maxEmittedEvents: 25,
      logger: loggingSystemMock.createLogger(),
      emitConnectorEvents: jest.fn(),
      getStartServices: coreMock.createSetup().getStartServices,
      getSpaceId: jest.fn().mockReturnValue('default'),
      inMemoryConnectors: [],
    });

    expect(router.versioned.post).toHaveBeenCalledWith(
      expect.objectContaining({
        path: INBOUND_EVENTS_API_PATH,
        access: 'public',
        security: INBOUND_EVENTS_SECURITY,
        options: expect.objectContaining({
          xsrfRequired: false,
          body: expect.objectContaining({
            maxBytes: 1024 * 1024,
          }),
        }),
      })
    );

    expect(addVersionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        version: INBOUND_EVENTS_API_VERSION,
      }),
      expect.any(Function)
    );
  });
});
