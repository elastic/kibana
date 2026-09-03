/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import type { ConnectorEventEmitParams, ConnectorEventEmitter } from '@kbn/actions-plugin/server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';

import {
  getConnectorEventEmitFailureCount,
  registerWorkflowsConnectorEventEmitter,
  resetConnectorEventEmitFailureCountForTests,
} from './register_workflows_connector_event_emitter';

const createEmitParams = (
  overrides: Partial<ConnectorEventEmitParams> = {}
): ConnectorEventEmitParams => ({
  eventId: 'inboundWebhook.received',
  payload: { body: {} },
  spaceId: 'default',
  connectorId: 'c1',
  connectorTypeId: '.inboundWebhook',
  request: httpServerMock.createKibanaRequest({
    headers: { authorization: 'ApiKey encoded-key' },
  }),
  ...overrides,
});

describe('registerWorkflowsConnectorEventEmitter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetConnectorEventEmitFailureCountForTests();
  });

  const registerAndGetEmitter = ({
    getClient,
    getWorkflowsExtensionsStart,
  }: {
    getClient?: jest.Mock;
    getWorkflowsExtensionsStart?: () => Promise<WorkflowsExtensionsServerPluginStart | undefined>;
  } = {}): {
    emitter: ConnectorEventEmitter;
    emitEvent: jest.Mock;
    getClient: jest.Mock;
    actions: ReturnType<typeof actionsMock.createSetup>;
  } => {
    const actions = actionsMock.createSetup();
    const emitEvent = jest.fn().mockResolvedValue(undefined);
    const resolvedGetClient = getClient ?? jest.fn().mockResolvedValue({ emitEvent });

    registerWorkflowsConnectorEventEmitter({
      actions,
      getWorkflowsExtensionsStart:
        getWorkflowsExtensionsStart ??
        (async () =>
          ({ getClient: resolvedGetClient } as unknown as WorkflowsExtensionsServerPluginStart)),
    });

    expect(actions.registerConnectorEventEmitter).toHaveBeenCalledTimes(1);
    const emitter = actions.registerConnectorEventEmitter.mock.calls[0][0] as ConnectorEventEmitter;
    return { emitter, emitEvent, getClient: resolvedGetClient, actions };
  };

  it('registers an emitter that forwards to workflows emitEvent with enriched payload', async () => {
    const { emitter, emitEvent, getClient } = registerAndGetEmitter();

    const params = createEmitParams({
      payload: { body: { hello: 'world' } },
      correlationKey: 'corr-1',
    });
    await emitter.emit(params);

    expect(getClient).toHaveBeenCalledTimes(1);
    expect(getClient).toHaveBeenCalledWith(params.request);
    expect(params.request.headers.authorization).toBe('ApiKey encoded-key');
    expect(emitEvent).toHaveBeenCalledWith('inboundWebhook.received', {
      body: { hello: 'world' },
      connectorId: 'c1',
      connectorTypeId: '.inboundWebhook',
      spaceId: 'default',
      correlationKey: 'corr-1',
    });
  });

  it('enriches emit payload even when spoke payload omits connectorId', async () => {
    const { emitter, emitEvent } = registerAndGetEmitter();

    await emitter.emit(
      createEmitParams({
        eventId: 'myConnector.received',
        spaceId: 'space-a',
        connectorId: 'connector-99',
        connectorTypeId: '.myConnector',
      })
    );

    expect(emitEvent).toHaveBeenCalledWith('myConnector.received', {
      body: {},
      connectorId: 'connector-99',
      connectorTypeId: '.myConnector',
      spaceId: 'space-a',
    });
  });

  it('omits correlationKey from enriched payload when undefined', async () => {
    const { emitter, emitEvent } = registerAndGetEmitter();

    await emitter.emit(
      createEmitParams({
        eventId: 'myConnector.received',
        connectorTypeId: '.myConnector',
      })
    );

    expect(emitEvent.mock.calls[0][1]).not.toHaveProperty('correlationKey');
  });

  it('throws when workflowsExtensions is missing so the hub logs emit_partial', async () => {
    const { emitter, emitEvent, getClient } = registerAndGetEmitter({
      getWorkflowsExtensionsStart: async () => undefined,
    });

    await expect(emitter.emit(createEmitParams())).rejects.toThrow(
      'Workflows extensions unavailable'
    );

    expect(getClient).not.toHaveBeenCalled();
    expect(emitEvent).not.toHaveBeenCalled();
    expect(getConnectorEventEmitFailureCount()).toBe(1);
  });

  it('increments failure counter and rethrows when emitEvent fails', async () => {
    const emitEvent = jest.fn().mockRejectedValue(new Error('emit boom'));
    const getClient = jest.fn().mockResolvedValue({ emitEvent });
    const { emitter } = registerAndGetEmitter({ getClient });

    await expect(emitter.emit(createEmitParams())).rejects.toThrow('emit boom');

    expect(getConnectorEventEmitFailureCount()).toBe(1);
  });

  it('increments failure counter when getClient throws', async () => {
    const getClient = jest.fn().mockRejectedValue(new Error('client boom'));
    const { emitter } = registerAndGetEmitter({ getClient });

    await expect(emitter.emit(createEmitParams())).rejects.toThrow('client boom');

    expect(getConnectorEventEmitFailureCount()).toBe(1);
  });

  it('throws when the emit request has no Authorization header', async () => {
    const { emitter, getClient, emitEvent } = registerAndGetEmitter();

    await expect(
      emitter.emit(
        createEmitParams({
          request: httpServerMock.createKibanaRequest({ headers: {} }),
        })
      )
    ).rejects.toThrow('authenticated request');

    expect(getClient).not.toHaveBeenCalled();
    expect(emitEvent).not.toHaveBeenCalled();
    expect(getConnectorEventEmitFailureCount()).toBe(1);
  });
});
