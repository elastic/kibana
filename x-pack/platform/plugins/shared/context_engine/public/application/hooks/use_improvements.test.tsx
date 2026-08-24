/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { DEFAULT_IMPROVEMENTS_PAGE_SIZE } from '../../../common/constants';
import { listImprovements } from '../api/improvements';
import { useImprovements } from './use_improvements';

jest.mock('../api/improvements', () => ({ listImprovements: jest.fn() }));

const mockListImprovements = jest.mocked(listImprovements);

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const services = coreMock.createStart();

  return ({ children }: { children: React.ReactNode }) => (
    <KibanaContextProvider services={services}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </KibanaContextProvider>
  );
};

describe('useImprovements', () => {
  beforeEach(() => {
    mockListImprovements.mockResolvedValue({ improvements: [], total: 3 });
  });

  afterEach(() => jest.clearAllMocks());

  it('requests the default page and reports the total', async () => {
    const { result } = renderHook(() => useImprovements({ aiIndexId: 'my-index' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mockListImprovements).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        aiIndexId: 'my-index',
        from: 0,
        size: DEFAULT_IMPROVEMENTS_PAGE_SIZE,
      })
    );
    expect(result.current.total).toBe(3);
  });

  it('does not query before the AI index is known', () => {
    renderHook(() => useImprovements({ aiIndexId: undefined }), { wrapper: createWrapper() });

    expect(mockListImprovements).not.toHaveBeenCalled();
  });

  it('does not query while the feature is switched off', () => {
    renderHook(() => useImprovements({ aiIndexId: 'my-index', enabled: false }), {
      wrapper: createWrapper(),
    });

    expect(mockListImprovements).not.toHaveBeenCalled();
  });

  it('refetches when the status filter changes', async () => {
    const wrapper = createWrapper();
    const { rerender } = renderHook(
      ({ status }: { status?: readonly ['applied'] }) =>
        useImprovements({ aiIndexId: 'my-index', status }),
      { wrapper, initialProps: {} }
    );

    await waitFor(() => expect(mockListImprovements).toHaveBeenCalledTimes(1));

    rerender({ status: ['applied'] });

    await waitFor(() => expect(mockListImprovements).toHaveBeenCalledTimes(2));
    expect(mockListImprovements).toHaveBeenLastCalledWith(
      expect.anything(),
      expect.objectContaining({ status: ['applied'] })
    );
  });

  it('surfaces the failure', async () => {
    mockListImprovements.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useImprovements({ aiIndexId: 'my-index' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.error).toBeDefined());
    expect(result.current.improvements).toEqual([]);
  });
});
