/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { addBasePath } from '..';
import type { RequestMock } from '../../../test/helpers';
import { RouterMock, routeDependencies } from '../../../test/helpers';

import { registerPutDataLifecycle, registerPutDataStreamFailureStore } from './register_put_route';

describe('registerPutDataStreamFailureStore', () => {
  let router: RouterMock;
  let updateDataStreamOptions: jest.Mock;
  let deleteDataStreamOptions: jest.Mock;

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
    deleteDataStreamOptions = router.getMockESApiFn('indices.deleteDataStreamOptions');
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

  it('should re-apply the index template failure store when inheriting', async () => {
    const simulateIndexTemplate = router.getMockESApiFn('indices.simulateIndexTemplate');
    simulateIndexTemplate.mockResolvedValue({
      template: {
        data_stream_options: {
          failure_store: { enabled: true, lifecycle: { data_retention: '21d' } },
        },
      },
    });

    const mockRequest: RequestMock = {
      method: 'put',
      path: addBasePath('/data_streams/configure_failure_store'),
      body: { dataStreams: ['test-stream'], dsFailureStore: false, inheritFailureStore: true },
    };

    updateDataStreamOptions.mockResolvedValue({ success: true });

    const res = await router.runRequest(mockRequest);

    expect(simulateIndexTemplate).toHaveBeenCalledWith({ name: 'test-stream' });
    expect(updateDataStreamOptions).toHaveBeenCalledWith(
      {
        name: 'test-stream',
        failure_store: { enabled: true, lifecycle: { data_retention: '21d' } },
      },
      { meta: true }
    );

    expect(res).toEqual({
      body: { success: true },
    });
  });

  it('should delete the data stream options when inheriting from a template without failure store', async () => {
    const simulateIndexTemplate = router.getMockESApiFn('indices.simulateIndexTemplate');
    simulateIndexTemplate.mockResolvedValue({ template: {} });

    const mockRequest: RequestMock = {
      method: 'put',
      path: addBasePath('/data_streams/configure_failure_store'),
      body: { dataStreams: ['test-stream'], dsFailureStore: false, inheritFailureStore: true },
    };

    deleteDataStreamOptions.mockResolvedValue({ success: true });

    await router.runRequest(mockRequest);

    // The template leaves the failure store disabled, so inheriting removes the explicit override
    // instead of writing `{ enabled: false }`, keeping the data stream truly inherited.
    expect(deleteDataStreamOptions).toHaveBeenCalledWith({ name: 'test-stream' }, { meta: true });
    expect(updateDataStreamOptions).not.toHaveBeenCalled();
  });

  it('should delete the data stream options when inheriting from a template that disables the failure store', async () => {
    const simulateIndexTemplate = router.getMockESApiFn('indices.simulateIndexTemplate');
    simulateIndexTemplate.mockResolvedValue({
      template: {
        data_stream_options: {
          failure_store: { enabled: false },
        },
      },
    });

    const mockRequest: RequestMock = {
      method: 'put',
      path: addBasePath('/data_streams/configure_failure_store'),
      body: { dataStreams: ['test-stream'], dsFailureStore: false, inheritFailureStore: true },
    };

    deleteDataStreamOptions.mockResolvedValue({ success: true });

    await router.runRequest(mockRequest);

    expect(deleteDataStreamOptions).toHaveBeenCalledWith({ name: 'test-stream' }, { meta: true });
    expect(updateDataStreamOptions).not.toHaveBeenCalled();
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

describe('registerPutDataLifecycle', () => {
  let router: RouterMock;
  let putDataLifecycle: jest.Mock;
  let getDataStream: jest.Mock;

  const setupRouter = () => {
    router = new RouterMock();
    const mockDependencies = {
      ...routeDependencies,
      router,
    };

    registerPutDataLifecycle(mockDependencies);
    putDataLifecycle = router.getMockESApiFn('indices.putDataLifecycle');
    getDataStream = router.getMockESApiFn('indices.getDataStream');
  };

  beforeEach(() => {
    setupRouter();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('preserves downsampling when updating DSL lifecycle', async () => {
    const mockRequest: RequestMock = {
      method: 'put',
      path: addBasePath('/data_streams/data_lifecycle'),
      body: {
        dataStreams: ['test-stream'],
        enabled: true,
        dataRetention: '30d',
      },
    };

    getDataStream.mockResolvedValue({
      data_streams: [
        {
          name: 'test-stream',
          lifecycle: {
            downsampling: [{ after: '7d', fixed_interval: '1h' }],
          },
        },
      ],
    });
    putDataLifecycle.mockResolvedValue({ headers: {} });

    const res = await router.runRequest(mockRequest);

    expect(putDataLifecycle).toHaveBeenCalledWith(
      {
        name: ['test-stream'],
        enabled: true,
        data_retention: '30d',
        downsampling: [{ after: '7d', fixed_interval: '1h' }],
      },
      { meta: true }
    );
    expect(res).toEqual({ body: { success: true } });
  });

  it('does not include downsampling when none exists', async () => {
    const mockRequest: RequestMock = {
      method: 'put',
      path: addBasePath('/data_streams/data_lifecycle'),
      body: {
        dataStreams: ['test-stream'],
        enabled: true,
        dataRetention: '30d',
      },
    };

    getDataStream.mockResolvedValue({ data_streams: [{ name: 'test-stream', lifecycle: {} }] });
    putDataLifecycle.mockResolvedValue({ headers: {} });

    await router.runRequest(mockRequest);

    expect(putDataLifecycle).toHaveBeenCalledWith(
      {
        name: ['test-stream'],
        enabled: true,
        data_retention: '30d',
      },
      { meta: true }
    );
  });

  it('groups putDataLifecycle calls by existing downsampling', async () => {
    const mockRequest: RequestMock = {
      method: 'put',
      path: addBasePath('/data_streams/data_lifecycle'),
      body: {
        dataStreams: ['stream-a', 'stream-b'],
        enabled: true,
        frozenAfter: '5d',
      },
    };

    getDataStream.mockResolvedValue({
      data_streams: [
        { name: 'stream-a', lifecycle: { downsampling: [{ after: '7d', fixed_interval: '1h' }] } },
        { name: 'stream-b', lifecycle: { downsampling: [{ after: '30d', fixed_interval: '1d' }] } },
      ],
    });
    putDataLifecycle.mockResolvedValue({ headers: {} });

    await router.runRequest(mockRequest);

    expect(putDataLifecycle).toHaveBeenCalledTimes(2);
    expect(putDataLifecycle).toHaveBeenNthCalledWith(
      1,
      {
        name: ['stream-a'],
        enabled: true,
        frozen_after: '5d',
        downsampling: [{ after: '7d', fixed_interval: '1h' }],
      },
      { meta: true }
    );
    expect(putDataLifecycle).toHaveBeenNthCalledWith(
      2,
      {
        name: ['stream-b'],
        enabled: true,
        frozen_after: '5d',
        downsampling: [{ after: '30d', fixed_interval: '1d' }],
      },
      { meta: true }
    );
  });
});
