/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { useUpdateIndex } from './use_update_index';

class MockApiService {
  updateIndex = jest.fn();
  deleteIndex = jest.fn();
}

describe('useUpdateIndex', () => {
  let mockApi: MockApiService;

  beforeEach(() => {
    mockApi = new MockApiService();
    jest.clearAllMocks();
  });

  it('should initialize with incomplete status', () => {
    const { result } = renderHook(() =>
      useUpdateIndex({ indexName: 'test-index', api: mockApi as any })
    );
    expect(result.current.updateIndexState.status).toBe('incomplete');
    expect(result.current.updateIndexState.failedBefore).toBe(false);
  });

  it('should call updateIndex and set status to complete on success', async () => {
    mockApi.updateIndex.mockResolvedValueOnce({});
    const { result } = renderHook(() =>
      useUpdateIndex({ indexName: 'test-index', api: mockApi as any })
    );
    await act(async () => {
      await result.current.updateIndex('unfreeze');
    });
    expect(mockApi.updateIndex).toHaveBeenCalledWith('test-index', ['unfreeze']);
    expect(result.current.updateIndexState.status).toBe('complete');
    expect(result.current.updateIndexState.failedBefore).toBe(false);
  });

  it('should call deleteIndex and set status to complete on success', async () => {
    mockApi.deleteIndex.mockResolvedValueOnce({});
    const { result } = renderHook(() =>
      useUpdateIndex({ indexName: 'test-index', api: mockApi as any })
    );
    await act(async () => {
      await result.current.updateIndex('delete');
    });
    expect(mockApi.deleteIndex).toHaveBeenCalledWith('test-index');
    expect(result.current.updateIndexState.status).toBe('complete');
    expect(result.current.updateIndexState.failedBefore).toBe(false);
  });

  it('should set status to failed and failedBefore to true on error', async () => {
    mockApi.updateIndex.mockResolvedValueOnce({ error: { message: 'fail' } });
    const { result } = renderHook(() =>
      useUpdateIndex({ indexName: 'test-index', api: mockApi as any })
    );
    await act(async () => {
      await result.current.updateIndex('unfreeze');
    });
    expect(result.current.updateIndexState.status).toBe('failed');
    expect(result.current.updateIndexState.failedBefore).toBe(true);
    expect(result.current.updateIndexState.reason).toBe('fail');
  });
});
