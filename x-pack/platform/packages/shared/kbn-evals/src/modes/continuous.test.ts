/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SomeDevLog } from '@kbn/some-dev-log';
import {
  createContinuousMode,
  createGitHookTriggerMode,
  touchTriggerFile,
  type FileChangeEvent,
} from './continuous';

// Mock chokidar
const mockWatcher = {
  on: jest.fn().mockReturnThis(),
  add: jest.fn(),
  unwatch: jest.fn(),
  close: jest.fn().mockResolvedValue(undefined),
  getWatched: jest.fn().mockReturnValue({
    '/test': ['file1.ts', 'file2.ts'],
    '/test/subdir': ['file3.ts'],
  }),
};

jest.mock('chokidar', () => ({
  watch: jest.fn(() => mockWatcher),
}));

// Mock fs
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn().mockResolvedValue('#!/bin/sh\n'),
    writeFile: jest.fn().mockResolvedValue(undefined),
    utimes: jest.fn().mockResolvedValue(undefined),
  },
}));

const createMockLog = (): jest.Mocked<SomeDevLog> => ({
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  write: jest.fn(),
  verbose: jest.fn(),
  success: jest.fn(),
});

describe('createContinuousMode', () => {
  let mockLog: jest.Mocked<SomeDevLog>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLog = createMockLog();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('initialization', () => {
    it('should create a controller with all required methods', () => {
      const controller = createContinuousMode({
        log: mockLog,
        watchPaths: ['./src/**/*.ts'],
      });

      expect(controller.start).toBeDefined();
      expect(controller.stop).toBeDefined();
      expect(controller.getStatus).toBeDefined();
      expect(controller.getStats).toBeDefined();
      expect(controller.addPaths).toBeDefined();
      expect(controller.removePaths).toBeDefined();
      expect(controller.flush).toBeDefined();
      expect(controller.isActive).toBeDefined();
    });

    it('should start with idle status', () => {
      const controller = createContinuousMode({
        log: mockLog,
        watchPaths: ['./src/**/*.ts'],
      });

      expect(controller.getStatus()).toBe('idle');
      expect(controller.isActive()).toBe(false);
    });
  });

  /**
   * Helper to start the watcher and trigger the ready event.
   * Handles the async import timing by running all pending microtasks.
   */
  async function startWatcherAndReady(
    controller: ReturnType<typeof createContinuousMode>
  ): Promise<void> {
    const startPromise = controller.start();
    // Run all pending timers and microtasks to allow the async import to complete
    await jest.runAllTimersAsync();
    // Find and trigger the ready callback
    const readyCallback = mockWatcher.on.mock.calls.find(([event]) => event === 'ready')?.[1];
    if (readyCallback) {
      readyCallback();
    }
    await startPromise;
  }

  describe('start', () => {
    it('should start watching and call onReady callback', async () => {
      const onReady = jest.fn();
      const controller = createContinuousMode({
        log: mockLog,
        watchPaths: ['./src/**/*.ts'],
        onReady,
      });

      await startWatcherAndReady(controller);

      expect(controller.getStatus()).toBe('watching');
      expect(controller.isActive()).toBe(true);
      expect(onReady).toHaveBeenCalled();
      expect(mockLog.info).toHaveBeenCalledWith(expect.stringContaining('ready'));
    });

    it('should warn if already watching', async () => {
      const controller = createContinuousMode({
        log: mockLog,
        watchPaths: ['./src/**/*.ts'],
      });

      await startWatcherAndReady(controller);
      await controller.start();

      expect(mockLog.warn).toHaveBeenCalledWith(expect.stringContaining('already active'));
    });
  });

  describe('file change handling', () => {
    it('should debounce file changes and call onFileChange', async () => {
      const onFileChange = jest.fn();
      const controller = createContinuousMode({
        log: mockLog,
        watchPaths: ['./src/**/*.ts'],
        debounceMs: 100,
        onFileChange,
      });

      const startPromise = controller.start();
      const readyCallback = mockWatcher.on.mock.calls.find(([event]) => event === 'ready')?.[1];
      readyCallback?.();
      await startPromise;

      // Simulate file changes
      const changeCallback = mockWatcher.on.mock.calls.find(([event]) => event === 'change')?.[1];
      changeCallback?.('/test/file1.ts', { size: 100, mtime: new Date() });
      changeCallback?.('/test/file2.ts', { size: 200, mtime: new Date() });

      // Not called yet due to debounce
      expect(onFileChange).not.toHaveBeenCalled();

      // Fast-forward debounce timer
      await jest.advanceTimersByTimeAsync(100);

      // Now should be called with accumulated events
      expect(onFileChange).toHaveBeenCalledTimes(1);
      expect(onFileChange).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ type: 'change', path: '/test/file1.ts' }),
          expect.objectContaining({ type: 'change', path: '/test/file2.ts' }),
        ])
      );
    });

    it('should accumulate events for the same file', async () => {
      const onFileChange = jest.fn();
      const controller = createContinuousMode({
        log: mockLog,
        watchPaths: ['./src/**/*.ts'],
        debounceMs: 100,
        onFileChange,
        accumulateEvents: true,
      });

      const startPromise = controller.start();
      const readyCallback = mockWatcher.on.mock.calls.find(([event]) => event === 'ready')?.[1];
      readyCallback?.();
      await startPromise;

      // Simulate multiple changes to same file
      const changeCallback = mockWatcher.on.mock.calls.find(([event]) => event === 'change')?.[1];
      changeCallback?.('/test/file1.ts', { size: 100, mtime: new Date() });
      changeCallback?.('/test/file1.ts', { size: 150, mtime: new Date() });

      await jest.advanceTimersByTimeAsync(100);

      // Should only have one event for the file (latest wins)
      expect(onFileChange).toHaveBeenCalledTimes(1);
      const events: FileChangeEvent[] = onFileChange.mock.calls[0][0];
      expect(events.filter((e) => e.path === '/test/file1.ts')).toHaveLength(1);
    });
  });

  describe('stop', () => {
    it('should stop watching and close watcher', async () => {
      const controller = createContinuousMode({
        log: mockLog,
        watchPaths: ['./src/**/*.ts'],
      });

      const startPromise = controller.start();
      const readyCallback = mockWatcher.on.mock.calls.find(([event]) => event === 'ready')?.[1];
      readyCallback?.();
      await startPromise;

      await controller.stop();

      expect(controller.getStatus()).toBe('stopped');
      expect(mockWatcher.close).toHaveBeenCalled();
      expect(mockLog.info).toHaveBeenCalledWith(expect.stringContaining('stopped'));
    });

    it('should flush pending events before stopping', async () => {
      const onFileChange = jest.fn();
      const controller = createContinuousMode({
        log: mockLog,
        watchPaths: ['./src/**/*.ts'],
        debounceMs: 1000,
        onFileChange,
      });

      const startPromise = controller.start();
      const readyCallback = mockWatcher.on.mock.calls.find(([event]) => event === 'ready')?.[1];
      readyCallback?.();
      await startPromise;

      // Simulate file change
      const changeCallback = mockWatcher.on.mock.calls.find(([event]) => event === 'change')?.[1];
      changeCallback?.('/test/file1.ts', { size: 100, mtime: new Date() });

      // Stop before debounce completes
      await controller.stop();

      // Should have flushed pending events
      expect(onFileChange).toHaveBeenCalled();
    });
  });

  describe('getStats', () => {
    it('should return accurate statistics', async () => {
      const controller = createContinuousMode({
        log: mockLog,
        watchPaths: ['./src/**/*.ts'],
        debounceMs: 50,
      });

      await startWatcherAndReady(controller);

      // Simulate some events
      const changeCallback = mockWatcher.on.mock.calls.find(([event]) => event === 'change')?.[1];
      changeCallback?.('/test/file1.ts');
      changeCallback?.('/test/file2.ts');

      await jest.advanceTimersByTimeAsync(50);

      const stats = controller.getStats();

      expect(stats.watchedFilesCount).toBe(3); // From mockWatcher.getWatched
      expect(stats.eventsProcessed).toBe(2);
      expect(stats.callbacksTriggered).toBe(1);
      expect(stats.startedAt).toBeDefined();
      expect(stats.lastEventAt).toBeDefined();
    });
  });

  describe('path management', () => {
    it('should add new paths to watch', async () => {
      const controller = createContinuousMode({
        log: mockLog,
        watchPaths: ['./src/**/*.ts'],
      });

      const startPromise = controller.start();
      const readyCallback = mockWatcher.on.mock.calls.find(([event]) => event === 'ready')?.[1];
      readyCallback?.();
      await startPromise;

      controller.addPaths(['./test/**/*.ts']);

      expect(mockWatcher.add).toHaveBeenCalledWith(['./test/**/*.ts']);
    });

    it('should remove paths from watch', async () => {
      const controller = createContinuousMode({
        log: mockLog,
        watchPaths: ['./src/**/*.ts', './test/**/*.ts'],
      });

      const startPromise = controller.start();
      const readyCallback = mockWatcher.on.mock.calls.find(([event]) => event === 'ready')?.[1];
      readyCallback?.();
      await startPromise;

      controller.removePaths(['./test/**/*.ts']);

      expect(mockWatcher.unwatch).toHaveBeenCalledWith(['./test/**/*.ts']);
    });
  });

  describe('flush', () => {
    it('should immediately dispatch pending events', async () => {
      const onFileChange = jest.fn();
      const controller = createContinuousMode({
        log: mockLog,
        watchPaths: ['./src/**/*.ts'],
        debounceMs: 10000, // Long debounce
        onFileChange,
      });

      const startPromise = controller.start();
      const readyCallback = mockWatcher.on.mock.calls.find(([event]) => event === 'ready')?.[1];
      readyCallback?.();
      await startPromise;

      // Simulate file change
      const changeCallback = mockWatcher.on.mock.calls.find(([event]) => event === 'change')?.[1];
      changeCallback?.('/test/file1.ts');

      // Flush immediately
      await controller.flush();

      expect(onFileChange).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should call onError callback on watcher error', async () => {
      const onError = jest.fn();
      const controller = createContinuousMode({
        log: mockLog,
        watchPaths: ['./src/**/*.ts'],
        onError,
      });

      const startPromise = controller.start();
      const readyCallback = mockWatcher.on.mock.calls.find(([event]) => event === 'ready')?.[1];
      readyCallback?.();
      await startPromise;

      // Simulate error
      const errorCallback = mockWatcher.on.mock.calls.find(([event]) => event === 'error')?.[1];
      const testError = new Error('Test error');
      errorCallback?.(testError);

      expect(onError).toHaveBeenCalledWith(testError);
      expect(controller.getStatus()).toBe('error');
    });

    it('should handle callback errors gracefully', async () => {
      const onError = jest.fn();
      const onFileChange = jest.fn().mockRejectedValue(new Error('Callback error'));
      const controller = createContinuousMode({
        log: mockLog,
        watchPaths: ['./src/**/*.ts'],
        debounceMs: 50,
        onFileChange,
        onError,
      });

      const startPromise = controller.start();
      const readyCallback = mockWatcher.on.mock.calls.find(([event]) => event === 'ready')?.[1];
      readyCallback?.();
      await startPromise;

      // Simulate file change
      const changeCallback = mockWatcher.on.mock.calls.find(([event]) => event === 'change')?.[1];
      changeCallback?.('/test/file1.ts');

      await jest.advanceTimersByTimeAsync(50);

      expect(onError).toHaveBeenCalled();
      expect(mockLog.error).toHaveBeenCalledWith(expect.stringContaining('Callback error'));
    });
  });
});

describe('createGitHookTriggerMode', () => {
  let mockLog: jest.Mocked<SomeDevLog>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockLog = createMockLog();
  });

  it('should create a continuous mode configured for trigger file', () => {
    const controller = createGitHookTriggerMode({
      log: mockLog,
      triggerDirectory: '/test/project',
      triggerFileName: '.my-trigger',
    });

    expect(controller.start).toBeDefined();
    expect(controller.getStatus()).toBe('idle');
  });
});

// Access the mocked fs module
const mockFs = jest.requireMock('fs') as {
  promises: {
    readFile: jest.Mock;
    writeFile: jest.Mock;
    utimes: jest.Mock;
  };
};

describe('touchTriggerFile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should touch the trigger file', async () => {
    await touchTriggerFile('/test', '.trigger');

    expect(mockFs.promises.utimes).toHaveBeenCalled();
  });

  it('should create the trigger file if it does not exist', async () => {
    mockFs.promises.utimes.mockRejectedValueOnce(new Error('ENOENT'));

    await touchTriggerFile('/test', '.trigger');

    expect(mockFs.promises.writeFile).toHaveBeenCalled();
  });
});
