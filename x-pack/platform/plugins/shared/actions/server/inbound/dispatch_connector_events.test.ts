/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';

import { dispatchConnectorEvents } from './dispatch_connector_events';
import type { ConnectorEventEmitter } from './types';

describe('dispatchConnectorEvents', () => {
  const logger = loggingSystemMock.createLogger();
  const params = {
    eventId: 'myConnector.received',
    payload: { body: {} },
    spaceId: 'default',
    connectorId: 'c1',
    connectorTypeId: '.myConnector',
    correlationKey: 'corr-1',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('warns and returns when no emitter is registered', async () => {
    await dispatchConnectorEvents({ emitter: undefined, params, logger });
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('No connector event emitter registered')
    );
  });

  it('invokes the registered emitter', async () => {
    const emitter: ConnectorEventEmitter = { emit: jest.fn() };
    await dispatchConnectorEvents({ emitter, params, logger });
    expect(emitter.emit).toHaveBeenCalledWith(params);
  });

  it('logs emitter failures without throwing', async () => {
    const emitter: ConnectorEventEmitter = {
      emit: jest.fn().mockRejectedValue(new Error('boom')),
    };
    await expect(dispatchConnectorEvents({ emitter, params, logger })).resolves.toBeUndefined();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('boom'));
  });
});
