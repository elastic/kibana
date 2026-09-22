/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';

import { dispatchConnectorEvents } from './dispatch_connector_events';
import type { ConnectorEventEmitter } from './types';

describe('dispatchConnectorEvents', () => {
  const params = {
    eventId: 'myConnector.received',
    payload: { body: {} },
    spaceId: 'default',
    connectorId: 'c1',
    connectorTypeId: '.myConnector',
    correlationKey: 'corr-1',
    request: httpServerMock.createKibanaRequest({
      headers: { authorization: 'ApiKey encoded-key' },
    }),
  };

  it('returns ok:false when no emitter is registered', async () => {
    const result = await dispatchConnectorEvents({ emitter: undefined, params });
    expect(result).toEqual({
      ok: false,
      reason: 'no_emitter',
      message: expect.stringContaining('No connector event emitter registered'),
    });
  });

  it('invokes the registered emitter and returns ok:true', async () => {
    const emitter: ConnectorEventEmitter = { emit: jest.fn() };
    await expect(dispatchConnectorEvents({ emitter, params })).resolves.toEqual({
      ok: true,
    });
    expect(emitter.emit).toHaveBeenCalledWith(params);
  });

  it('returns ok:false when the emitter throws (does not rethrow)', async () => {
    const emitter: ConnectorEventEmitter = {
      emit: jest.fn().mockRejectedValue(new Error('boom')),
    };
    await expect(dispatchConnectorEvents({ emitter, params })).resolves.toEqual({
      ok: false,
      reason: 'emit_threw',
      message: 'boom',
    });
  });
});
