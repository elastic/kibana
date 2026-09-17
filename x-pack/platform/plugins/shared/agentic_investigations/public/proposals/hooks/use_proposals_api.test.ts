/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import {
  retryOnTransientError,
  usePendingProposals,
  useProposal,
  useApproveProposal,
  useDismissProposal,
} from './use_proposals_api';
import { PROPOSALS_INTERNAL_URL, AGENTIC_INVESTIGATIONS_API_VERSION } from '../../../common';

jest.mock('@kbn/kibana-react-plugin/public', () => ({
  useKibana: jest.fn(),
}));

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    logger: { log: () => null, warn: () => null, error: () => null },
  });
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
  return { Wrapper, queryClient };
};

const makeHttp = () => ({
  get: jest.fn(),
  post: jest.fn(),
});

const makeHttpFetchError = (status: number): IHttpFetchError => {
  const err = Object.assign(new Error(`HTTP ${status}`), {
    request: {} as Request,
    response: { status } as Response,
  });
  return err as unknown as IHttpFetchError;
};

describe('retryOnTransientError', () => {
  it('retries non-HTTP errors (e.g. network failure)', () => {
    expect(retryOnTransientError(0, new Error('Network error'))).toBe(true);
  });

  it('retries 5xx responses', () => {
    expect(retryOnTransientError(0, makeHttpFetchError(500))).toBe(true);
    expect(retryOnTransientError(0, makeHttpFetchError(503))).toBe(true);
  });

  it('does not retry 4xx responses', () => {
    expect(retryOnTransientError(0, makeHttpFetchError(400))).toBe(false);
    expect(retryOnTransientError(0, makeHttpFetchError(404))).toBe(false);
    expect(retryOnTransientError(0, makeHttpFetchError(409))).toBe(false);
  });

  it('does not retry 501 (feature unavailable on this deployment)', () => {
    expect(retryOnTransientError(0, makeHttpFetchError(501))).toBe(false);
  });

  it('stops retrying after 3 failures', () => {
    expect(retryOnTransientError(3, new Error('Network error'))).toBe(false);
    expect(retryOnTransientError(3, makeHttpFetchError(500))).toBe(false);
  });

  it('still retries on the third attempt (failureCount === 2)', () => {
    expect(retryOnTransientError(2, new Error('Network error'))).toBe(true);
  });
});

describe('usePendingProposals', () => {
  it('calls GET on the proposals URL with status=pending and excludeExpired=true', async () => {
    const http = makeHttp();
    http.get.mockResolvedValue({ proposals: [], total: 0 });
    useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<
      typeof useKibana
    >);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePendingProposals(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(http.get).toHaveBeenCalledWith(PROPOSALS_INTERNAL_URL, {
      version: AGENTIC_INVESTIGATIONS_API_VERSION,
      query: { status: 'pending', excludeExpired: true },
    });
  });

  it('includes conversationId in the query when provided', async () => {
    const http = makeHttp();
    http.get.mockResolvedValue({ proposals: [], total: 0 });
    useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<
      typeof useKibana
    >);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePendingProposals('conv-42'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(http.get).toHaveBeenCalledWith(PROPOSALS_INTERNAL_URL, {
      version: AGENTIC_INVESTIGATIONS_API_VERSION,
      query: { status: 'pending', excludeExpired: true, conversationId: 'conv-42' },
    });
  });

  it('returns the data from the API', async () => {
    const http = makeHttp();
    const mockResponse = {
      proposals: [{ id: 'p-1', status: 'pending' }],
      total: 1,
    };
    http.get.mockResolvedValue(mockResponse);
    useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<
      typeof useKibana
    >);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePendingProposals(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockResponse);
  });
});

describe('useProposal', () => {
  it('fetches the proposal by id', async () => {
    const http = makeHttp();
    const mockProposal = { id: 'p-1', status: 'pending' };
    http.get.mockResolvedValue(mockProposal);
    useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<
      typeof useKibana
    >);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useProposal('p-1'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(http.get).toHaveBeenCalledWith(`${PROPOSALS_INTERNAL_URL}/p-1`, {
      version: AGENTIC_INVESTIGATIONS_API_VERSION,
    });
    expect(result.current.data).toEqual(mockProposal);
  });

  it('percent-encodes special characters in id when fetching', async () => {
    const http = makeHttp();
    http.get.mockResolvedValue({ id: 'org/repo#42', status: 'pending' });
    useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<
      typeof useKibana
    >);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useProposal('org/repo#42'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(http.get).toHaveBeenCalledWith(
      `${PROPOSALS_INTERNAL_URL}/org%2Frepo%2342`,
      expect.any(Object)
    );
  });

  it('does not fetch when id is undefined', () => {
    const http = makeHttp();
    useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<
      typeof useKibana
    >);

    const { Wrapper } = createWrapper();
    renderHook(() => useProposal(undefined), { wrapper: Wrapper });

    expect(http.get).not.toHaveBeenCalled();
  });

  it('enters error state when the API call rejects with a 404', async () => {
    const http = makeHttp();
    // Use a 404 so retryOnTransientError returns false immediately (no retries).
    http.get.mockRejectedValue(makeHttpFetchError(404));
    useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<
      typeof useKibana
    >);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useProposal('missing'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
  });
});

describe('useApproveProposal', () => {
  it('posts to the approve endpoint with the given body', async () => {
    const http = makeHttp();
    http.post.mockResolvedValue({ id: 'p-1', status: 'approved' });
    useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<
      typeof useKibana
    >);

    const { Wrapper, queryClient } = createWrapper();
    jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useApproveProposal(), { wrapper: Wrapper });

    await result.current.mutateAsync({ id: 'p-1', body: { actionInput: { name: 'Rule' } } });

    expect(http.post).toHaveBeenCalledWith(`${PROPOSALS_INTERNAL_URL}/p-1/approve`, {
      version: AGENTIC_INVESTIGATIONS_API_VERSION,
      body: JSON.stringify({ actionInput: { name: 'Rule' } }),
    });
  });

  it('percent-encodes special characters in id when approving', async () => {
    const http = makeHttp();
    http.post.mockResolvedValue({ id: 'org/repo#42', status: 'approved' });
    useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<
      typeof useKibana
    >);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useApproveProposal(), { wrapper: Wrapper });

    await result.current.mutateAsync({ id: 'org/repo#42', body: {} });

    expect(http.post).toHaveBeenCalledWith(
      `${PROPOSALS_INTERNAL_URL}/org%2Frepo%2342/approve`,
      expect.any(Object)
    );
  });

  it('invalidates only the top-level proposals key on success (single call)', async () => {
    const http = makeHttp();
    http.post.mockResolvedValue({ id: 'p-1', status: 'approved' });
    useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<
      typeof useKibana
    >);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useApproveProposal(), { wrapper: Wrapper });
    await result.current.mutateAsync({ id: 'p-1', body: {} });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledTimes(1);
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: expect.arrayContaining(['agenticInvestigations', 'proposals']),
        })
      );
    });
  });

  it('surfaces the error when the API call rejects', async () => {
    const http = makeHttp();
    http.post.mockRejectedValue(new Error('Server error'));
    useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<
      typeof useKibana
    >);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useApproveProposal(), { wrapper: Wrapper });

    await expect(result.current.mutateAsync({ id: 'p-1', body: {} })).rejects.toThrow(
      'Server error'
    );
  });
});

describe('useDismissProposal', () => {
  it('posts to the dismiss endpoint with the given body', async () => {
    const http = makeHttp();
    http.post.mockResolvedValue({ id: 'p-1', status: 'dismissed' });
    useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<
      typeof useKibana
    >);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDismissProposal(), { wrapper: Wrapper });

    await result.current.mutateAsync({
      id: 'p-1',
      body: { dismissReason: 'wrong', rationale: 'Not relevant' },
    });

    expect(http.post).toHaveBeenCalledWith(`${PROPOSALS_INTERNAL_URL}/p-1/dismiss`, {
      version: AGENTIC_INVESTIGATIONS_API_VERSION,
      body: JSON.stringify({ dismissReason: 'wrong', rationale: 'Not relevant' }),
    });
  });

  it('invalidates only the top-level proposals key on success (single call)', async () => {
    const http = makeHttp();
    http.post.mockResolvedValue({ id: 'p-1', status: 'dismissed' });
    useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<
      typeof useKibana
    >);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDismissProposal(), { wrapper: Wrapper });
    await result.current.mutateAsync({ id: 'p-1', body: { dismissReason: 'wrong' } });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledTimes(1);
      expect(invalidateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          queryKey: expect.arrayContaining(['agenticInvestigations', 'proposals']),
        })
      );
    });
  });

  it('surfaces the error when the API call rejects', async () => {
    const http = makeHttp();
    http.post.mockRejectedValue(new Error('Conflict'));
    useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<
      typeof useKibana
    >);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useDismissProposal(), { wrapper: Wrapper });

    await expect(
      result.current.mutateAsync({ id: 'p-1', body: { dismissReason: 'wrong' } })
    ).rejects.toThrow('Conflict');
  });
});
