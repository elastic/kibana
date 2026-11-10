/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { WorkflowsServerPluginStart } from '@kbn/workflows-management-plugin/server';
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

    it('registers fleet as a managed workflow owner', () => {
      const workflowsExtensions = createSetup();

      registerWorkflowAssetsOwner({ workflowsExtensions });

      expect(workflowsExtensions.registerManagedWorkflowOwner).toHaveBeenCalledWith('fleet');
    });

    it('does nothing when the workflows extensions plugin is not available', () => {
      expect(() => registerWorkflowAssetsOwner({})).not.toThrow();
    });
  });

  describe('startManagedWorkflowsClient', () => {
    const workflowsManagement = {} as WorkflowsServerPluginStart;
    const logger = loggingSystemMock.createLogger();
    const createStart = (initManagedWorkflowsClient: jest.Mock) =>
      ({ initManagedWorkflowsClient } as unknown as WorkflowsExtensionsServerPluginStart);

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('resolves with the client once it is ready', async () => {
      let markReady: () => void = () => {};
      const ready = jest
        .fn()
        .mockReturnValue(new Promise<void>((resolve) => (markReady = resolve)));
      const client = { isWorkflowsAvailable: true, ready };

      const started = startManagedWorkflowsClient({
        workflowsExtensions: createStart(jest.fn().mockResolvedValue(client)),
        workflowsManagement,
        logger,
      });

      markReady();
      await expect(started).resolves.toBe(client);
    });

    it('initializes the client for the fleet plugin', async () => {
      const init = jest.fn().mockResolvedValue({ isWorkflowsAvailable: true, ready: jest.fn() });

      await startManagedWorkflowsClient({
        workflowsExtensions: createStart(init),
        workflowsManagement,
        logger,
      });

      expect(init).toHaveBeenCalledWith('fleet');
    });

    it('resolves to undefined when the plugin is not available', async () => {
      await expect(startManagedWorkflowsClient({ logger })).resolves.toBeUndefined();
    });

    it('does not create a client when the workflows management plugin is not available', async () => {
      const init = jest.fn();

      await expect(
        startManagedWorkflowsClient({
          workflowsExtensions: createStart(init),
          logger,
        })
      ).resolves.toBeUndefined();
      expect(init).not.toHaveBeenCalled();
    });

    it('keeps the client when Workflows is not available, since availability can change', async () => {
      const client = { isWorkflowsAvailable: false, ready: jest.fn().mockResolvedValue(undefined) };

      await expect(
        startManagedWorkflowsClient({
          workflowsExtensions: createStart(jest.fn().mockResolvedValue(client)),
          workflowsManagement,
          logger,
        })
      ).resolves.toBe(client);
    });

    it('resolves to undefined when none is returned', async () => {
      await expect(
        startManagedWorkflowsClient({
          workflowsExtensions: createStart(jest.fn().mockResolvedValue(undefined)),
          workflowsManagement,
          logger,
        })
      ).resolves.toBeUndefined();
    });

    it('logs and resolves to undefined when the initialization fails', async () => {
      await expect(
        startManagedWorkflowsClient({
          workflowsExtensions: createStart(jest.fn().mockRejectedValue(new Error('boom'))),
          workflowsManagement,
          logger,
        })
      ).resolves.toBeUndefined();

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to initialize the managed workflows client: boom'
      );
    });

    it('logs and resolves to undefined when the client never becomes ready', async () => {
      const client = {
        isWorkflowsAvailable: true,
        ready: jest.fn().mockRejectedValue(new Error('not ready')),
      };

      await expect(
        startManagedWorkflowsClient({
          workflowsExtensions: createStart(jest.fn().mockResolvedValue(client)),
          workflowsManagement,
          logger,
        })
      ).resolves.toBeUndefined();

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to initialize the managed workflows client: not ready'
      );
    });
  });
});
