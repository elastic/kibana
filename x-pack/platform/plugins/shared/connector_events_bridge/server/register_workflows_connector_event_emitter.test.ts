/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient, Logger } from '@kbn/core/server';
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

  const createEsClient = ({
    createApiKey,
    invalidateApiKey,
  }: {
    createApiKey?: jest.Mock;
    invalidateApiKey?: jest.Mock;
  } = {}) => {
    const resolvedCreateApiKey =
      createApiKey ??
      jest.fn().mockResolvedValue({ id: 'temp-key-id', api_key: 'temp-key-secret' });
    const resolvedInvalidateApiKey = invalidateApiKey ?? jest.fn().mockResolvedValue({});
    return {
      esClient: {
        security: {
          createApiKey: resolvedCreateApiKey,
          invalidateApiKey: resolvedInvalidateApiKey,
        },
      } as unknown as ElasticsearchClient,
      createApiKey: resolvedCreateApiKey,
      invalidateApiKey: resolvedInvalidateApiKey,
    };
  };

  const registerAndGetEmitter = ({
    getClient,
    getWorkflowsExtensionsStart,
    es,
    logger,
  }: {
    getClient?: jest.Mock;
    getWorkflowsExtensionsStart?: () => Promise<WorkflowsExtensionsServerPluginStart | undefined>;
    es?: ReturnType<typeof createEsClient>;
    logger?: Logger;
  } = {}): {
    emitter: ConnectorEventEmitter;
    emitEvent: jest.Mock;
    getClient: jest.Mock;
    actions: ReturnType<typeof actionsMock.createSetup>;
    createApiKey: jest.Mock;
    invalidateApiKey: jest.Mock;
    logger: Logger;
  } => {
    const actions = actionsMock.createSetup();
    const emitEvent = jest.fn().mockResolvedValue(undefined);
    const resolvedGetClient = getClient ?? jest.fn().mockResolvedValue({ emitEvent });
    const resolvedEs = es ?? createEsClient();
    const resolvedLogger = logger ?? ({ warn: jest.fn(), debug: jest.fn() } as unknown as Logger);

    registerWorkflowsConnectorEventEmitter({
      actions,
      logger: resolvedLogger,
      getInternalEsClient: async () => resolvedEs.esClient,
      getWorkflowsExtensionsStart:
        getWorkflowsExtensionsStart ??
        (async () =>
          ({ getClient: resolvedGetClient } as unknown as WorkflowsExtensionsServerPluginStart)),
    });

    expect(actions.registerConnectorEventEmitter).toHaveBeenCalledTimes(1);
    const emitter = actions.registerConnectorEventEmitter.mock.calls[0][0] as ConnectorEventEmitter;
    return {
      emitter,
      emitEvent,
      getClient: resolvedGetClient,
      actions,
      createApiKey: resolvedEs.createApiKey,
      invalidateApiKey: resolvedEs.invalidateApiKey,
      logger: resolvedLogger,
    };
  };

  it('registers an emitter that forwards to workflows emitEvent with a temporary API key', async () => {
    const { emitter, emitEvent, getClient, createApiKey, invalidateApiKey } =
      registerAndGetEmitter();

    await emitter.emit({
      eventId: 'inboundWebhook.received',
      payload: { body: { hello: 'world' } },
      spaceId: 'default',
      connectorId: 'c1',
      connectorTypeId: '.inboundWebhook',
      correlationKey: 'corr-1',
    });

    expect(createApiKey).toHaveBeenCalledWith(
      expect.objectContaining({
        expiration: '1h',
        metadata: { managed: true, purpose: 'workflows-connector-event-temp' },
        role_descriptors: {},
      })
    );
    expect(getClient).toHaveBeenCalledTimes(1);
    const requestArg = getClient.mock.calls[0][0];
    expect(requestArg.headers.authorization).toBe(
      `ApiKey ${Buffer.from('temp-key-id:temp-key-secret').toString('base64')}`
    );
    expect(emitEvent).toHaveBeenCalledWith('inboundWebhook.received', {
      body: { hello: 'world' },
      connectorId: 'c1',
      connectorTypeId: '.inboundWebhook',
      spaceId: 'default',
      correlationKey: 'corr-1',
    });
    expect(invalidateApiKey).toHaveBeenCalledWith({ ids: ['temp-key-id'] });
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
    const { emitter, emitEvent, getClient, createApiKey } = registerAndGetEmitter({
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
    expect(createApiKey).not.toHaveBeenCalled();
    expect(getConnectorEventEmitFailureCount()).toBe(1);
  });

  it('increments failure counter and rethrows when emitEvent fails', async () => {
    const emitEvent = jest.fn().mockRejectedValue(new Error('emit boom'));
    const getClient = jest.fn().mockResolvedValue({ emitEvent });
    const { emitter, invalidateApiKey } = registerAndGetEmitter({ getClient });

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
    expect(invalidateApiKey).toHaveBeenCalledWith({ ids: ['temp-key-id'] });
  });

  it('increments failure counter when getClient throws', async () => {
    const getClient = jest.fn().mockRejectedValue(new Error('client boom'));
    const { emitter, invalidateApiKey } = registerAndGetEmitter({ getClient });

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
    expect(invalidateApiKey).toHaveBeenCalledWith({ ids: ['temp-key-id'] });
  });

  it('does not emit when minting the temporary API key fails', async () => {
    const es = createEsClient({
      createApiKey: jest.fn().mockRejectedValue(new Error('cannot mint')),
    });
    const { emitter, emitEvent, getClient, invalidateApiKey, createApiKey } = registerAndGetEmitter(
      { es }
    );

    await expect(
      emitter.emit({
        eventId: 'inboundWebhook.received',
        payload: { body: {} },
        spaceId: 'default',
        connectorId: 'c1',
        connectorTypeId: '.inboundWebhook',
      })
    ).rejects.toThrow('cannot mint');

    expect(createApiKey).toHaveBeenCalled();
    expect(getClient).not.toHaveBeenCalled();
    expect(emitEvent).not.toHaveBeenCalled();
    expect(invalidateApiKey).not.toHaveBeenCalled();
    expect(getConnectorEventEmitFailureCount()).toBe(1);
  });

  it('still emits when invalidating the minted key fails', async () => {
    const es = createEsClient({
      invalidateApiKey: jest.fn().mockRejectedValue(new Error('invalidate failed')),
    });
    const logger = { warn: jest.fn(), debug: jest.fn() } as unknown as Logger;
    const { emitter, emitEvent } = registerAndGetEmitter({ es, logger });

    await emitter.emit({
      eventId: 'inboundWebhook.received',
      payload: { body: {} },
      spaceId: 'default',
      connectorId: 'c1',
      connectorTypeId: '.inboundWebhook',
    });

    expect(emitEvent).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledWith(
      'Failed to invalidate temporary connector-event API key temp-key-id: invalidate failed'
    );
  });
});
