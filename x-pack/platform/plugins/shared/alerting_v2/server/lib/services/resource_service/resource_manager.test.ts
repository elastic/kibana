/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';

import type { IRetryService, RetryOptions } from '../retry_service/types';
import { LoggerService } from '../logger_service/logger_service';
import { ResourceManager } from './resource_manager';
import type { IResourceInitializer } from './resource_manager';

class RetryServiceMock implements IRetryService {
  public readonly calls: RetryOptions[] = [];

  public async retry<T>(callback: () => Promise<T>, options: RetryOptions): Promise<T> {
    this.calls.push(options);
    return callback();
  }
}

describe('ResourceManager', () => {
  let mockLogger: jest.Mocked<Logger>;
  let loggerService: LoggerService;
  let retryService: RetryServiceMock;

  function createManager() {
    mockLogger = loggerMock.create();
    loggerService = new LoggerService(mockLogger);
    retryService = new RetryServiceMock();

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

  it('starts all registered resources', async () => {
    const manager = createManager();

    const initA = createInitializer(async () => {});
    const initB = createInitializer(async () => {});

    manager.registerResource('r1', initA);
    manager.registerResource('r2', initB);

    manager.startInitialization();

    expect(initA.initialize).toHaveBeenCalledTimes(1);
    expect(initB.initialize).toHaveBeenCalledTimes(1);

    await expect(manager.waitForResources(['r1', 'r2'])).resolves.toBeUndefined();

    expect(initA.initialize).toHaveBeenCalledTimes(1);
    expect(initB.initialize).toHaveBeenCalledTimes(1);

    expect(manager.isReady('r1')).toBe(true);
    expect(manager.isReady('r2')).toBe(true);
  });

  it('retries each initializer through the resources logger labelled with the resource', async () => {
    const manager = createManager();

    manager.registerResource(
      'r1',
      createInitializer(async () => {})
    );
    manager.startInitialization();
    await manager.waitForResources(['r1']);

    expect(retryService.calls).toHaveLength(1);
    const [{ logger }] = retryService.calls;

    logger.info({ message: 'probe' });

    expect(mockLogger.get).toHaveBeenCalledWith('resources');
    expect(mockLogger.info).toHaveBeenCalledWith('probe', { labels: { resource: 'r1' } });
  });

  it('fails fast for consumers when a resource permanently fails (and does not retry on subsequent waits)', async () => {
    const manager = createManager();

    const error = new Error('Error initializing resource');
    const init = createInitializer(async () => {
      throw error;
    });

    manager.registerResource('r1', init);
    manager.startInitialization();

    await expect(manager.waitForResources(['r1'])).rejects.toThrow('Error initializing resource');
    // A second wait must reuse the stored failure instead of re-running the initializer.
    await expect(manager.waitForResources(['r1'])).rejects.toThrow('Error initializing resource');

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

  describe('waitForResources', () => {
    it('resolves once the requested resources are ready', async () => {
      const manager = createManager();

      manager.registerResource(
        'r1',
        createInitializer(async () => {})
      );
      manager.registerResource(
        'r2',
        createInitializer(async () => {})
      );
      manager.startInitialization();

      await expect(manager.waitForResources(['r1', 'r2'])).resolves.toBeUndefined();

      expect(manager.isReady('r1')).toBe(true);
      expect(manager.isReady('r2')).toBe(true);
    });

    it('does not wait for a pending resource that was not requested', async () => {
      const manager = createManager();

      manager.registerResource(
        'needed',
        createInitializer(async () => {})
      );
      manager.registerResource(
        'never-ready',
        // Never settles, so this resource cannot become ready during the test.
        createInitializer(() => new Promise<void>(() => {}))
      );
      manager.startInitialization();

      await expect(manager.waitForResources(['needed'])).resolves.toBeUndefined();

      expect(manager.isReady('never-ready')).toBe(false);
    });

    it('resolves when a resource that was not requested failed', async () => {
      const manager = createManager();

      manager.registerResource(
        'needed',
        createInitializer(async () => {})
      );
      manager.registerResource(
        'broken',
        createInitializer(async () => {
          throw new Error('broken failure');
        })
      );
      manager.startInitialization();

      await expect(manager.waitForResources(['broken'])).rejects.toThrow('broken failure');
      await expect(manager.waitForResources(['needed'])).resolves.toBeUndefined();
    });

    it('rejects when a requested resource failed', async () => {
      const manager = createManager();

      manager.registerResource(
        'needed',
        createInitializer(async () => {})
      );
      manager.registerResource(
        'broken',
        createInitializer(async () => {
          throw new Error('broken failure');
        })
      );
      manager.startInitialization();

      await expect(manager.waitForResources(['needed', 'broken'])).rejects.toThrow(
        'broken failure'
      );
    });
  });
});
