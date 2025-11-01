/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Plugin } from './plugin';
import { coreMock } from '@kbn/core/public/mocks';
import type { StreamsRepositoryClient } from './api';

describe('Streams Plugin', () => {
  let plugin: Plugin;
  let mockRepositoryClient: jest.Mocked<StreamsRepositoryClient>;

  beforeEach(() => {
    plugin = new Plugin({
      env: {
        packageInfo: {
          buildFlavor: 'traditional',
        },
      },
      config: {
        get: () => ({}),
      },
      logger: {
        get: () => ({
          error: jest.fn(),
        }),
      },
    } as any);

    mockRepositoryClient = {
      fetch: jest.fn(),
    } as any;

    // @ts-expect-error accessing private property for testing
    plugin.repositoryClient = mockRepositoryClient;
  });

  afterEach(() => {
    plugin.stop();
    jest.clearAllMocks();
  });

  describe('setup', () => {
    it('should initialize repository client', () => {
      const coreSetup = coreMock.createSetup();
      const result = plugin.setup(coreSetup, {});

      expect(result).toEqual({});
    });
  });

  describe('start', () => {
    it('should return plugin API with required methods', () => {
      const coreStart = coreMock.createStart();
      const start = plugin.start(coreStart, {});

      expect(start).toHaveProperty('streamsRepositoryClient');
      expect(start).toHaveProperty('navigationStatus$');
      expect(start).toHaveProperty('getWiredStatus');
      expect(start).toHaveProperty('enableWiredMode');
      expect(start).toHaveProperty('disableWiredMode');
      expect(start).toHaveProperty('config$');

      expect(typeof start.getWiredStatus).toBe('function');
      expect(typeof start.enableWiredMode).toBe('function');
      expect(typeof start.disableWiredMode).toBe('function');
    });
  });

  describe('getWiredStatus', () => {
    let getWiredStatus: () => Promise<any>;

    beforeEach(() => {
      const coreStart = coreMock.createStart();
      const start = plugin.start(coreStart, {});
      getWiredStatus = start.getWiredStatus;
    });

    it('should fetch wired status from API successfully', async () => {
      const mockStatus = {
        enabled: true,
        can_manage: true,
      };

      mockRepositoryClient.fetch.mockResolvedValue(mockStatus);

      const result = await getWiredStatus();

      expect(mockRepositoryClient.fetch).toHaveBeenCalledWith(
        'GET /api/streams/_status',
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
      expect(result).toEqual(mockStatus);
    });

    it('should return disabled status when API returns enabled: false', async () => {
      const mockStatus = {
        enabled: false,
        can_manage: true,
      };

      mockRepositoryClient.fetch.mockResolvedValue(mockStatus);

      const result = await getWiredStatus();

      expect(result).toEqual({
        enabled: false,
        can_manage: true,
      });
    });

    it('should return UNKNOWN_STATUS on network error', async () => {
      mockRepositoryClient.fetch.mockRejectedValue(new Error('Network error'));

      const result = await getWiredStatus();

      expect(result).toEqual({
        enabled: 'unknown',
        can_manage: false,
      });
    });

    it('should return UNKNOWN_STATUS on 404 error', async () => {
      mockRepositoryClient.fetch.mockRejectedValue({
        response: { status: 404 },
        message: 'Not found',
      });

      const result = await getWiredStatus();

      expect(result).toEqual({
        enabled: 'unknown',
        can_manage: false,
      });
    });

    it('should return UNKNOWN_STATUS on 500 error', async () => {
      mockRepositoryClient.fetch.mockRejectedValue({
        response: { status: 500 },
        message: 'Internal server error',
      });

      const result = await getWiredStatus();

      expect(result).toEqual({
        enabled: 'unknown',
        can_manage: false,
      });
    });

    it('should log errors when fetch fails', async () => {
      const mockError = new Error('Network failure');
      const mockLogger = {
        error: jest.fn(),
      };
      plugin.logger = mockLogger as any;

      mockRepositoryClient.fetch.mockRejectedValue(mockError);

      await getWiredStatus();

      expect(mockLogger.error).toHaveBeenCalledWith(mockError);
    });

    it('should create new AbortController for each call', async () => {
      mockRepositoryClient.fetch.mockResolvedValue({
        enabled: true,
        can_manage: true,
      });

      await getWiredStatus();
      await getWiredStatus();

      expect(mockRepositoryClient.fetch).toHaveBeenCalledTimes(2);
      const firstCallSignal = mockRepositoryClient.fetch.mock.calls[0][1].signal;
      const secondCallSignal = mockRepositoryClient.fetch.mock.calls[1][1].signal;

      // Each call should have its own signal
      expect(firstCallSignal).toBeInstanceOf(AbortSignal);
      expect(secondCallSignal).toBeInstanceOf(AbortSignal);
    });
  });

  describe('enableWiredMode', () => {
    let enableWiredMode: (signal: AbortSignal) => Promise<any>;

    beforeEach(() => {
      const coreStart = coreMock.createStart();
      const start = plugin.start(coreStart, {});
      enableWiredMode = start.enableWiredMode;
    });

    it('should call enable API endpoint', async () => {
      const mockResponse = { acknowledged: true };
      mockRepositoryClient.fetch.mockResolvedValue(mockResponse);

      const signal = new AbortController().signal;
      const result = await enableWiredMode(signal);

      expect(mockRepositoryClient.fetch).toHaveBeenCalledWith(
        'POST /api/streams/_enable 2023-10-31',
        { signal }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should propagate errors from API', async () => {
      const mockError = new Error('Enable failed');
      mockRepositoryClient.fetch.mockRejectedValue(mockError);

      const signal = new AbortController().signal;

      await expect(enableWiredMode(signal)).rejects.toThrow('Enable failed');
    });

    it('should respect abort signal', async () => {
      const abortController = new AbortController();
      mockRepositoryClient.fetch.mockImplementation(() => {
        abortController.abort();
        return Promise.reject(new Error('Aborted'));
      });

      await expect(enableWiredMode(abortController.signal)).rejects.toThrow();
    });
  });

  describe('disableWiredMode', () => {
    let disableWiredMode: (signal: AbortSignal) => Promise<any>;

    beforeEach(() => {
      const coreStart = coreMock.createStart();
      const start = plugin.start(coreStart, {});
      disableWiredMode = start.disableWiredMode;
    });

    it('should call disable API endpoint', async () => {
      const mockResponse = { acknowledged: true };
      mockRepositoryClient.fetch.mockResolvedValue(mockResponse);

      const signal = new AbortController().signal;
      const result = await disableWiredMode(signal);

      expect(mockRepositoryClient.fetch).toHaveBeenCalledWith(
        'POST /api/streams/_disable 2023-10-31',
        { signal }
      );
      expect(result).toEqual(mockResponse);
    });

    it('should propagate errors from API', async () => {
      const mockError = new Error('Disable failed');
      mockRepositoryClient.fetch.mockRejectedValue(mockError);

      const signal = new AbortController().signal;

      await expect(disableWiredMode(signal)).rejects.toThrow('Disable failed');
    });

    it('should respect abort signal', async () => {
      const abortController = new AbortController();
      mockRepositoryClient.fetch.mockImplementation(() => {
        abortController.abort();
        return Promise.reject(new Error('Aborted'));
      });

      await expect(disableWiredMode(abortController.signal)).rejects.toThrow();
    });
  });
});
