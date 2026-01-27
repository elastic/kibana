/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addBasePath } from '..';
import type { RequestMock } from '../../../test/helpers';
import { RouterMock, routeDependencies } from '../../../test/helpers';

import { registerPutDataStreamFailureStore } from './register_put_route';

describe('registerPutDataStreamFailureStore', () => {
  let router: RouterMock;
  let updateDataStreamOptions: jest.Mock;

  const setupRouter = (configOverrides = {}) => {
    router = new RouterMock();
    const mockDependencies = {
      ...routeDependencies,
      router,
      config: {
        ...routeDependencies.config,
        ...configOverrides,
      },
    };

    registerPutDataStreamFailureStore(mockDependencies);
    updateDataStreamOptions = router.getMockESApiFn('indices.putDataStreamOptions');
  };

  beforeEach(() => {
    setupRouter();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('should enable failure store with custom retention period', async () => {
    const mockRequest: RequestMock = {
      method: 'put',
      path: addBasePath('/data_streams/configure_failure_store'),
      body: { dataStreams: ['test-stream'], dsFailureStore: true, customRetentionPeriod: '7d' },
    };

    updateDataStreamOptions.mockResolvedValue({ success: true });

    const res = await router.runRequest(mockRequest);

    expect(updateDataStreamOptions).toHaveBeenCalledWith(
      {
        name: 'test-stream',
        failure_store: {
          enabled: true,
          lifecycle: {
            data_retention: '7d',
            enabled: true,
          },
        },
      },
      { meta: true }
    );

    expect(res).toEqual({
      body: { success: true },
    });
  });

  it('should disable failure store', async () => {
    const mockRequest: RequestMock = {
      method: 'put',
      path: addBasePath('/data_streams/configure_failure_store'),
      body: { dataStreams: ['test-stream'], dsFailureStore: false },
    };

    updateDataStreamOptions.mockResolvedValue({ success: true });

    const res = await router.runRequest(mockRequest);

    expect(updateDataStreamOptions).toHaveBeenCalledWith(
      {
        name: 'test-stream',
        failure_store: {
          enabled: false,
        },
      },
      { meta: true }
    );

    expect(res).toEqual({
      body: { success: true },
    });
  });

  it('should handle requests without custom retention period', async () => {
    const mockRequest: RequestMock = {
      method: 'put',
      path: addBasePath('/data_streams/configure_failure_store'),
      body: { dataStreams: ['test-stream'], dsFailureStore: true },
    };

    updateDataStreamOptions.mockResolvedValue({ success: true });

    const res = await router.runRequest(mockRequest);

    expect(updateDataStreamOptions).toHaveBeenCalledWith(
      {
        name: 'test-stream',
        failure_store: {
          enabled: true,
        },
      },
      { meta: true }
    );

    expect(res).toEqual({
      body: { success: true },
    });
  });

  it('should handle multiple data streams', async () => {
    const mockRequest: RequestMock = {
      method: 'put',
      path: addBasePath('/data_streams/configure_failure_store'),
      body: {
        dataStreams: ['stream-1', 'stream-2'],
        dsFailureStore: true,
        customRetentionPeriod: '14d',
      },
    };

    updateDataStreamOptions.mockResolvedValue({ success: true });

    const res = await router.runRequest(mockRequest);

    expect(updateDataStreamOptions).toHaveBeenCalledTimes(2);
    expect(updateDataStreamOptions).toHaveBeenNthCalledWith(
      1,
      {
        name: 'stream-1',
        failure_store: {
          enabled: true,
          lifecycle: {
            data_retention: '14d',
            enabled: true,
          },
        },
      },
      { meta: true }
    );
    expect(updateDataStreamOptions).toHaveBeenNthCalledWith(
      2,
      {
        name: 'stream-2',
        failure_store: {
          enabled: true,
          lifecycle: {
            data_retention: '14d',
            enabled: true,
          },
        },
      },
      { meta: true }
    );

    expect(res).toEqual({
      body: { success: true },
    });
  });

  it('should handle ES warning headers in response', async () => {
    const mockRequest: RequestMock = {
      method: 'put',
      path: addBasePath('/data_streams/configure_failure_store'),
      body: { dataStreams: ['test-stream'], dsFailureStore: true, customRetentionPeriod: '7d' },
    };

    const mockHeaders = {
      warning: '299 Elasticsearch-123456 "This is a warning message"',
    };
    updateDataStreamOptions.mockResolvedValue({ headers: mockHeaders });

    const res = await router.runRequest(mockRequest);

    expect(res).toEqual({
      body: { success: true, warning: 'This is a warning message' },
    });
  });

  it('should handle multiple warnings from multiple data streams', async () => {
    const mockRequest: RequestMock = {
      method: 'put',
      path: addBasePath('/data_streams/configure_failure_store'),
      body: {
        dataStreams: ['stream-1', 'stream-2'],
        dsFailureStore: true,
        customRetentionPeriod: '7d',
      },
    };

    const mockHeaders1 = {
      warning: '299 Elasticsearch-123456 "Warning for stream 1"',
    };
    const mockHeaders2 = {
      warning: '299 Elasticsearch-789012 "Warning for stream 2"',
    };

    updateDataStreamOptions
      .mockResolvedValueOnce({ headers: mockHeaders1 })
      .mockResolvedValueOnce({ headers: mockHeaders2 });

    const res = await router.runRequest(mockRequest);

    expect(res).toEqual({
      body: { success: true, warning: 'Warning for stream 1; Warning for stream 2' },
    });
  });

  it('should return an error if ES client fails', async () => {
    const mockRequest: RequestMock = {
      method: 'put',
      path: addBasePath('/data_streams/configure_failure_store'),
      body: { dataStreams: ['test-stream'], dsFailureStore: true, customRetentionPeriod: '7d' },
    };

    const error = new Error('Elasticsearch error');
    updateDataStreamOptions.mockRejectedValue(error);

    await expect(router.runRequest(mockRequest)).rejects.toThrowError(error);
  });

  it('should disable failure store retention', async () => {
    const mockRequest: RequestMock = {
      method: 'put',
      path: addBasePath('/data_streams/configure_failure_store'),
      body: { dataStreams: ['test-stream'], dsFailureStore: true, retentionDisabled: true },
    };

    updateDataStreamOptions.mockResolvedValue({ success: true });

    const res = await router.runRequest(mockRequest);

    expect(updateDataStreamOptions).toHaveBeenCalledWith(
      { name: 'test-stream', failure_store: { enabled: true, lifecycle: { enabled: false } } },
      { meta: true }
    );
    expect(res).toEqual({ body: { success: true } });
  });

  it('should not disable failure store retention if enableFailureStoreRetentionDisabling is false', async () => {
    setupRouter({ enableFailureStoreRetentionDisabling: false });

    const mockRequest: RequestMock = {
      method: 'put',
      path: addBasePath('/data_streams/configure_failure_store'),
      body: { dataStreams: ['test-stream'], dsFailureStore: true, retentionDisabled: true },
    };

    updateDataStreamOptions.mockResolvedValue({ success: true });

    const res = await router.runRequest(mockRequest);

    expect(updateDataStreamOptions).toHaveBeenCalledWith(
      { name: 'test-stream', failure_store: { enabled: true } },
      { meta: true }
    );
    expect(res).toEqual({ body: { success: true } });
  });
});
