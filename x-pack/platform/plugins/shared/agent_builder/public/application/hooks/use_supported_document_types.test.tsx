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
import { useSupportedDocumentTypes } from './use_supported_document_types';

const mockGetSupportedDocumentMimeTypes = jest.fn();

jest.mock('./use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({
    attachmentsService: { getSupportedDocumentMimeTypes: mockGetSupportedDocumentMimeTypes },
  }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: PropsWithChildren<{}>) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe('useSupportedDocumentTypes', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is empty until the server answers', () => {
    mockGetSupportedDocumentMimeTypes.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useSupportedDocumentTypes(), { wrapper: createWrapper() });

    expect(result.current).toEqual([]);
  });

  it('returns the types the server says work', async () => {
    mockGetSupportedDocumentMimeTypes.mockResolvedValue(['text/markdown', 'text/plain']);

    const { result } = renderHook(() => useSupportedDocumentTypes(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current).toEqual(['text/markdown', 'text/plain']));
  });

  it('is empty when the server says no type works', async () => {
    mockGetSupportedDocumentMimeTypes.mockResolvedValue([]);

    const { result } = renderHook(() => useSupportedDocumentTypes(), { wrapper: createWrapper() });

    await waitFor(() => expect(mockGetSupportedDocumentMimeTypes).toHaveBeenCalled());
    expect(result.current).toEqual([]);
  });

  it('is empty when the check fails', async () => {
    mockGetSupportedDocumentMimeTypes.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useSupportedDocumentTypes(), { wrapper: createWrapper() });

    await waitFor(() => expect(mockGetSupportedDocumentMimeTypes).toHaveBeenCalled());
    expect(result.current).toEqual([]);
  });

  it('keeps the same empty list between renders', async () => {
    mockGetSupportedDocumentMimeTypes.mockRejectedValue(new Error('boom'));

    const { result, rerender } = renderHook(() => useSupportedDocumentTypes(), {
      wrapper: createWrapper(),
    });
    const before = result.current;
    await waitFor(() => expect(mockGetSupportedDocumentMimeTypes).toHaveBeenCalled());
    rerender();

    expect(result.current).toBe(before);
  });

  it('asks the server once for many hook users', async () => {
    mockGetSupportedDocumentMimeTypes.mockResolvedValue(['application/pdf']);
    const wrapper = createWrapper();

    const first = renderHook(() => useSupportedDocumentTypes(), { wrapper });
    await waitFor(() => expect(first.result.current).toEqual(['application/pdf']));
    const second = renderHook(() => useSupportedDocumentTypes(), { wrapper });

    expect(second.result.current).toEqual(['application/pdf']);
    expect(mockGetSupportedDocumentMimeTypes).toHaveBeenCalledTimes(1);
  });
});
