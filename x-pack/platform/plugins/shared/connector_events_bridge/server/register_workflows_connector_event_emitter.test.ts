/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import type { ConnectorEventEmitter } from '@kbn/actions-plugin/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';

import {
  getConnectorEventEmitFailureCount,
  registerWorkflowsConnectorEventEmitter,
  resetConnectorEventEmitFailureCountForTests,
} from './register_workflows_connector_event_emitter';

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

    await emitter.emit({
      eventId: 'inboundWebhook.received',
      payload: { body: { hello: 'world' } },
      spaceId: 'default',
      connectorId: 'c1',
      connectorTypeId: '.inboundWebhook',
      correlationKey: 'corr-1',
    });

    expect(getClient).toHaveBeenCalledTimes(1);
    const requestArg = getClient.mock.calls[0][0];
    expect(requestArg.headers.authorization).toBeUndefined();
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

    await emitter.emit({
      eventId: 'myConnector.received',
      payload: { body: {} },
      spaceId: 'space-a',
      connectorId: 'connector-99',
      connectorTypeId: '.myConnector',
    });

    expect(emitEvent).toHaveBeenCalledWith('myConnector.received', {
      body: {},
      connectorId: 'connector-99',
      connectorTypeId: '.myConnector',
      spaceId: 'space-a',
    });
  });

  it('omits correlationKey from enriched payload when undefined', async () => {
    const { emitter, emitEvent } = registerAndGetEmitter();

    await emitter.emit({
      eventId: 'myConnector.received',
      payload: { body: {} },
      spaceId: 'default',
      connectorId: 'c1',
      connectorTypeId: '.myConnector',
    });

    expect(emitEvent.mock.calls[0][1]).not.toHaveProperty('correlationKey');
  });

  it('throws when workflowsExtensions is missing so the hub logs emit_partial', async () => {
    const { emitter, emitEvent, getClient } = registerAndGetEmitter({
      getWorkflowsExtensionsStart: async () => undefined,
    });

    await expect(
      emitter.emit({
        eventId: 'inboundWebhook.received',
        payload: { body: {} },
        spaceId: 'default',
        connectorId: 'c1',
        connectorTypeId: '.inboundWebhook',
      })
    ).rejects.toThrow('Workflows extensions unavailable');

    expect(getClient).not.toHaveBeenCalled();
    expect(emitEvent).not.toHaveBeenCalled();
    expect(getConnectorEventEmitFailureCount()).toBe(1);
  });

  it('increments failure counter and rethrows when emitEvent fails', async () => {
    const emitEvent = jest.fn().mockRejectedValue(new Error('emit boom'));
    const getClient = jest.fn().mockResolvedValue({ emitEvent });
    const { emitter } = registerAndGetEmitter({ getClient });

    await expect(
      emitter.emit({
        eventId: 'inboundWebhook.received',
        payload: { body: {} },
        spaceId: 'default',
        connectorId: 'c1',
        connectorTypeId: '.inboundWebhook',
      })
    ).rejects.toThrow('emit boom');

    expect(getConnectorEventEmitFailureCount()).toBe(1);
  });

  it('increments failure counter when getClient throws', async () => {
    const getClient = jest.fn().mockRejectedValue(new Error('client boom'));
    const { emitter } = registerAndGetEmitter({ getClient });

    await expect(
      emitter.emit({
        eventId: 'inboundWebhook.received',
        payload: { body: {} },
        spaceId: 'default',
        connectorId: 'c1',
        connectorTypeId: '.inboundWebhook',
      })
    ).rejects.toThrow('client boom');

    expect(getConnectorEventEmitFailureCount()).toBe(1);
  });
});
