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
import { useIsPdfUploadAvailable } from './use_is_pdf_upload_available';

const mockIsPdfAvailable = jest.fn();

jest.mock('./use_agent_builder_service', () => ({
  useAgentBuilderServices: () => ({ attachmentsService: { isPdfAvailable: mockIsPdfAvailable } }),
}));

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const Wrapper = ({ children }: PropsWithChildren<{}>) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return Wrapper;
};

describe('useIsPdfUploadAvailable', () => {
  beforeEach(() => jest.clearAllMocks());

  it('is false until the server answers', () => {
    mockIsPdfAvailable.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useIsPdfUploadAvailable(), { wrapper: createWrapper() });

    expect(result.current).toBe(false);
  });

  it('is true when the server says PDFs are available', async () => {
    mockIsPdfAvailable.mockResolvedValue(true);

    const { result } = renderHook(() => useIsPdfUploadAvailable(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('is false when the server says PDFs are not available', async () => {
    mockIsPdfAvailable.mockResolvedValue(false);

    const { result } = renderHook(() => useIsPdfUploadAvailable(), { wrapper: createWrapper() });

    await waitFor(() => expect(mockIsPdfAvailable).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it('is false when the check fails', async () => {
    mockIsPdfAvailable.mockRejectedValue(new Error('boom'));

    const { result } = renderHook(() => useIsPdfUploadAvailable(), { wrapper: createWrapper() });

    await waitFor(() => expect(mockIsPdfAvailable).toHaveBeenCalled());
    expect(result.current).toBe(false);
  });

  it('asks the server once for many hook users', async () => {
    mockIsPdfAvailable.mockResolvedValue(true);
    const wrapper = createWrapper();

    const first = renderHook(() => useIsPdfUploadAvailable(), { wrapper });
    await waitFor(() => expect(first.result.current).toBe(true));
    const second = renderHook(() => useIsPdfUploadAvailable(), { wrapper });

    expect(second.result.current).toBe(true);
    expect(mockIsPdfAvailable).toHaveBeenCalledTimes(1);
  });
});
