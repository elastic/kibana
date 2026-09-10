/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { coreMock } from '@kbn/core/server/mocks';

import { createUnsecuredInboundSavedObjectsClient } from './create_unsecured_inbound_saved_objects_client';
import { buildInboundEventsClient } from './client';
import { createInboundEventsClient } from './factory';

jest.mock('./create_unsecured_inbound_saved_objects_client', () => ({
  createUnsecuredInboundSavedObjectsClient: jest.fn(),
}));

jest.mock('./client', () => ({
  buildInboundEventsClient: jest.fn((deps) => deps),
}));

const createUnsecuredInboundSavedObjectsClientMock =
  createUnsecuredInboundSavedObjectsClient as jest.MockedFunction<
    typeof createUnsecuredInboundSavedObjectsClient
  >;
const buildInboundEventsClientMock = buildInboundEventsClient as jest.MockedFunction<
  typeof buildInboundEventsClient
>;

describe('createInboundEventsClient (factory)', () => {
  it('resolves the unsecured SO client factory once and passes it to the client', async () => {
    const getStartServices = coreMock.createSetup().getStartServices;
    const emitConnectorEvents = jest.fn();
    const logger = loggingSystemMock.createLogger();

    createInboundEventsClient({
      logger,
      inboundEventsEnabled: true,
      isActionTypeEnabled: jest.fn().mockReturnValue(true),
      maxEmitted: 25,
      maxBodyBytes: 1024 * 1024,
      emitConnectorEvents,
      getStartServices,
      inMemoryConnectors: [],
    });

    expect(buildInboundEventsClientMock).toHaveBeenCalledWith(
      expect.objectContaining({
        logger,
        inboundEventsEnabled: true,
        isActionTypeEnabled: expect.any(Function),
        maxEmitted: 25,
        maxBodyBytes: 1024 * 1024,
        emitConnectorEvents,
        inMemoryConnectors: [],
        getUnsecuredSavedObjectsClient: expect.any(Function),
      })
    );

    const { getUnsecuredSavedObjectsClient } = buildInboundEventsClientMock.mock.calls[0][0];
    await getUnsecuredSavedObjectsClient('space-a');

    expect(createUnsecuredInboundSavedObjectsClientMock).toHaveBeenCalledWith({
      getStartServices,
      spaceId: 'space-a',
    });
  });
});
