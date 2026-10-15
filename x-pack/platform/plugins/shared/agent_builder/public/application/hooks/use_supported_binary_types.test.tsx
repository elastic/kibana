/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useSupportedBinaryTypes } from './use_supported_binary_types';

const mockGetSupportedBinaryMimeTypes = jest.fn();

jest.mock('./use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({
    attachmentsService: { getSupportedBinaryMimeTypes: mockGetSupportedBinaryMimeTypes },
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: PropsWithChildren<{}>) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe('useSupportedBinaryTypes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is empty until the server answers', () => {
    mockGetSupportedBinaryMimeTypes.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useSupportedBinaryTypes(), { wrapper: createWrapper() });

    expect(result.current).toEqual([]);
  });

  it('returns the types the server says work', async () => {
    mockGetSupportedBinaryMimeTypes.mockResolvedValue(['text/markdown', 'text/plain']);

    const { result } = renderHook(() => useSupportedBinaryTypes(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current).toEqual(['text/markdown', 'text/plain']));
  });

  it('is empty when the server says no type works', async () => {
    mockGetSupportedBinaryMimeTypes.mockResolvedValue([]);

    const { result } = renderHook(() => useSupportedBinaryTypes(), { wrapper: createWrapper() });

    await waitFor(() => expect(mockGetSupportedBinaryMimeTypes).toHaveBeenCalled());
    expect(result.current).toEqual([]);
  });

  it('is empty when the check fails', async () => {
    mockGetSupportedBinaryMimeTypes.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useSupportedBinaryTypes(), { wrapper: createWrapper() });

    await waitFor(() => expect(mockGetSupportedBinaryMimeTypes).toHaveBeenCalled());
    expect(result.current).toEqual([]);
  });

  it('keeps the same empty list between renders', async () => {
    mockGetSupportedBinaryMimeTypes.mockRejectedValue(new Error('boom'));

    const { result, rerender } = renderHook(() => useSupportedBinaryTypes(), {
      wrapper: createWrapper(),
    });
    const before = result.current;
    await waitFor(() => expect(mockGetSupportedBinaryMimeTypes).toHaveBeenCalled());
    rerender();

    expect(result.current).toBe(before);
  });

  it('asks the server once for many hook users', async () => {
    mockGetSupportedBinaryMimeTypes.mockResolvedValue(['application/pdf']);
    const wrapper = createWrapper();

    const first = renderHook(() => useSupportedBinaryTypes(), { wrapper });
    await waitFor(() => expect(first.result.current).toEqual(['application/pdf']));
    const second = renderHook(() => useSupportedBinaryTypes(), { wrapper });

    expect(second.result.current).toEqual(['application/pdf']);
    expect(mockGetSupportedBinaryMimeTypes).toHaveBeenCalledTimes(1);
  });
});
