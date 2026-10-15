/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type {
  WorkflowsExtensionsServerPluginSetup,
  WorkflowsExtensionsServerPluginStart,
} from '@kbn/workflows-extensions/server';

import { registerWorkflowAssetsOwner, startManagedWorkflowsClient } from './managed_client';

describe('managed workflows client', () => {
  describe('registerWorkflowAssetsOwner', () => {
    const createSetup = () =>
      ({
        registerManagedWorkflowOwner: jest.fn(),
      } as unknown as jest.Mocked<WorkflowsExtensionsServerPluginSetup>);

    it('registers fleet as a managed workflow owner when the feature is enabled', () => {
      const workflowsExtensions = createSetup();

      registerWorkflowAssetsOwner({ enabled: true, workflowsExtensions });

      expect(workflowsExtensions.registerManagedWorkflowOwner).toHaveBeenCalledWith('fleet');
    });

    it('does not register anything when the feature is disabled', () => {
      const workflowsExtensions = createSetup();

      registerWorkflowAssetsOwner({ enabled: false, workflowsExtensions });

      expect(workflowsExtensions.registerManagedWorkflowOwner).not.toHaveBeenCalled();
    });

    it('does nothing when the workflows extensions plugin is not available', () => {
      expect(() => registerWorkflowAssetsOwner({ enabled: true })).not.toThrow();
    });
  });

  describe('startManagedWorkflowsClient', () => {
    const logger = loggingSystemMock.createLogger();
    const createStart = (initManagedWorkflowsClient: jest.Mock) =>
      ({ initManagedWorkflowsClient } as unknown as WorkflowsExtensionsServerPluginStart);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('hands the client over before it is ready and resolves with it once ready', async () => {
      let markReady: () => void = () => {};
      const ready = jest
        .fn()
        .mockReturnValue(new Promise<void>((resolve) => (markReady = resolve)));
      const client = { ready };
      const setClient = jest.fn();

      const started = startManagedWorkflowsClient({
        workflowsExtensions: createStart(jest.fn().mockResolvedValue(client)),
        setClient,
        logger,
      });

      await new Promise((resolve) => setImmediate(resolve));
      expect(setClient).toHaveBeenCalledWith(client);
      markReady();
      await expect(started).resolves.toBe(client);
    });

    it('initializes the client for the fleet plugin', async () => {
      const init = jest.fn().mockResolvedValue({ ready: jest.fn() });

      await startManagedWorkflowsClient({
        workflowsExtensions: createStart(init),
        setClient: jest.fn(),
        logger,
      });

      expect(init).toHaveBeenCalledWith('fleet');
    });

    it('resolves to undefined without setting a client when the plugin is not available', async () => {
      const setClient = jest.fn();

      await expect(startManagedWorkflowsClient({ setClient, logger })).resolves.toBeUndefined();
      expect(setClient).not.toHaveBeenCalled();
    });

    it('resolves to undefined without setting a client when none is returned', async () => {
      const setClient = jest.fn();

      await expect(
        startManagedWorkflowsClient({
          workflowsExtensions: createStart(jest.fn().mockResolvedValue(undefined)),
          setClient,
          logger,
        })
      ).resolves.toBeUndefined();
      expect(setClient).not.toHaveBeenCalled();
    });

    it('logs and resolves to undefined when the initialization fails', async () => {
      const setClient = jest.fn();

      await expect(
        startManagedWorkflowsClient({
          workflowsExtensions: createStart(jest.fn().mockRejectedValue(new Error('boom'))),
          setClient,
          logger,
        })
      ).resolves.toBeUndefined();

      expect(setClient).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to initialize the managed workflows client: boom'
      );
    });

    it('logs and resolves to undefined when the client never becomes ready', async () => {
      const setClient = jest.fn();
      const client = { ready: jest.fn().mockRejectedValue(new Error('not ready')) };

      await expect(
        startManagedWorkflowsClient({
          workflowsExtensions: createStart(jest.fn().mockResolvedValue(client)),
          setClient,
          logger,
        })
      ).resolves.toBeUndefined();

      expect(setClient).toHaveBeenCalledWith(client);
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to initialize the managed workflows client: not ready'
      );
    });
  });
});
