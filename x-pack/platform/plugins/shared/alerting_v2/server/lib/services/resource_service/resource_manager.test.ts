/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';

import type { IRetryService } from '../retry_service/alerting_retry_service';
import { LoggerService } from '../logger_service/logger_service';
import { ResourceManager } from './resource_manager';
import type { IResourceInitializer } from './resource_manager';

describe('ResourceManager', () => {
  let mockLogger: jest.Mocked<Logger>;
  let loggerService: LoggerService;

  function createManager() {
    mockLogger = loggerMock.create();
    loggerService = new LoggerService(mockLogger);

    const retryService: IRetryService = {
      retry: async (cb) => await cb(),
    };

    return new ResourceManager(loggerService, retryService);
  }

  function createInitializer(initializeFn: () => Promise<void>): IResourceInitializer & {
    initialize: jest.Mock;
  } {
    return { initialize: jest.fn(initializeFn) };
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('starts all registered resources and waitUntilReady resolves', async () => {
    const manager = createManager();

    const initA = createInitializer(async () => {});
    const initB = createInitializer(async () => {});

    manager.registerResource('r1', initA);
    manager.registerResource('r2', initB);

    manager.startInitialization();
    await expect(manager.waitUntilReady()).resolves.toBeUndefined();

    expect(initA.initialize).toHaveBeenCalledTimes(1);
    expect(initB.initialize).toHaveBeenCalledTimes(1);

    expect(manager.isReady('r1')).toBe(true);
    expect(manager.isReady('r2')).toBe(true);
  });

  it('fails fast for consumers when a resource permanently fails (and does not retry on subsequent waits)', async () => {
    const manager = createManager();

    const error = new Error('Error initializing resource');
    const init = createInitializer(async () => {
      throw error;
    });

    manager.registerResource('r1', init);
    manager.startInitialization();

    await expect(manager.waitUntilReady()).rejects.toThrow('Error initializing resource');

    expect(init.initialize).toHaveBeenCalledTimes(1);
  });

  it('does not produce unhandledRejection for initialization failures', async () => {
    const manager = createManager();

    const init = createInitializer(async () => {
      throw new Error('Error initializing resource');
    });

    manager.registerResource('r1', init);

    const unhandled = jest.fn();
    process.on('unhandledRejection', unhandled);

    try {
      manager.startInitialization();
      await new Promise((resolve) => setImmediate(resolve));
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });

  it('throws if ensureResourceReady is called for an unregistered resource', async () => {
    const manager = createManager();
    await expect(manager.ensureResourceReady('missing')).rejects.toThrow(
      'ResourceManager: resource [missing] is not registered'
    );
  });

  describe('optional', () => {
    it('waitUntilReady resolves even when an optional resource fails', async () => {
      const manager = createManager();

      const initHard = createInitializer(async () => {});
      const initSoft = createInitializer(async () => {
        throw new Error('view creation failed');
      });

      manager.registerResource('hard', initHard);
      manager.registerResource('soft', initSoft, { optional: true });

      manager.startInitialization();
      await expect(manager.waitUntilReady()).resolves.toBeUndefined();

      expect(manager.isReady('hard')).toBe(true);
      expect(manager.isReady('soft')).toBe(false);
    });

    it('waitUntilReady rejects when a required resource fails alongside an optional one', async () => {
      const manager = createManager();

      const initHard = createInitializer(async () => {
        throw new Error('hard failure');
      });
      const initSoft = createInitializer(async () => {
        throw new Error('soft failure');
      });

      manager.registerResource('hard', initHard);
      manager.registerResource('soft', initSoft, { optional: true });

      manager.startInitialization();
      await expect(manager.waitUntilReady()).rejects.toThrow('hard failure');
    });

    it('ensureResourceReady still rejects for a failed optional resource', async () => {
      const manager = createManager();

      const initSoft = createInitializer(async () => {
        throw new Error('view creation failed');
      });

      manager.registerResource('soft', initSoft, { optional: true });
      manager.startInitialization();

      await manager.waitUntilReady();

      await expect(manager.ensureResourceReady('soft')).rejects.toThrow('view creation failed');
    });
  });
});
