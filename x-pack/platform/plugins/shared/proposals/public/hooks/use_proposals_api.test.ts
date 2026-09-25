/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { IHttpFetchError } from '@kbn/core-http-browser';
import {
  retryOnTransientError,
  useConversationProposals,
  usePendingProposals,
  useProposal,
  useApproveProposal,
  useDismissProposal,
  useIsApprovingProposal,
  useIsDecliningProposal,
} from './use_proposals_api';
import {
  PROPOSALS_INTERNAL_URL,
  PROPOSALS_API_VERSION,
  MAX_PROPOSALS_PAGE_SIZE,
} from '@kbn/proposals-common';
import { queryKeys } from '../query_keys';
import { proposalDecisionSignal } from './proposal_decision_signal';

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
  it('calls GET on the proposals URL filtered to proposals a human can still act on', async () => {
    const http = makeHttp();
    http.get.mockResolvedValue({ proposals: [], total: 0 });
    useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<
      typeof useKibana
    >);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => usePendingProposals(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(http.get).toHaveBeenCalledWith(PROPOSALS_INTERNAL_URL, {
      version: PROPOSALS_API_VERSION,
      // `excludeSuperseded` drops the earlier attempts of a retried proposal,
      // so a chain of failures appears once rather than once per attempt.
      query: { status: 'pending', excludeExpired: true, excludeSuperseded: true },
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
      version: PROPOSALS_API_VERSION,
      query: {
        status: 'pending',
        excludeExpired: true,
        excludeSuperseded: true,
        conversationId: 'conv-42',
      },
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

describe('useConversationProposals', () => {
  it('calls GET on the proposals URL scoped to the conversation, with no status filter', async () => {
    const http = makeHttp();
    http.get.mockResolvedValue({ proposals: [], total: 0 });
    useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<
      typeof useKibana
    >);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useConversationProposals('conv-42'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Decided proposals matter here too — the investigation's own history, not just what still
    // needs a human — so unlike `usePendingProposals` this carries no `status` filter.
    expect(http.get).toHaveBeenCalledWith(PROPOSALS_INTERNAL_URL, {
      version: PROPOSALS_API_VERSION,
      query: {
        conversationId: 'conv-42',
        excludeSuperseded: true,
        size: MAX_PROPOSALS_PAGE_SIZE,
        from: 0,
      },
    });
  });

  it('returns the data from the API', async () => {
    const http = makeHttp();
    const mockResponse = {
      proposals: [{ id: 'p-1', status: 'succeeded', decision: 'approved' }],
      total: 1,
    };
    http.get.mockResolvedValue(mockResponse);
    useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<
      typeof useKibana
    >);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useConversationProposals('conv-42'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ pages: [mockResponse], pageParams: [undefined] });
  });

  it("pages past the API cap rather than silently losing a conversation's older proposals", async () => {
    const http = makeHttp();
    // `total` (2), not the API's per-page cap, is what should end paging — the point is that a
    // conversation with more proposals than one page holds still gets all of them via
    // `fetchNextPage`, not that this specific test has to reach the real 100-row cap.
    const firstPage = { proposals: [{ id: 'p-1' }], total: 2 };
    const secondPage = { proposals: [{ id: 'p-2' }], total: 2 };
    http.get.mockResolvedValueOnce(firstPage).mockResolvedValueOnce(secondPage);
    useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<
      typeof useKibana
    >);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useConversationProposals('conv-42'), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.hasNextPage).toBe(true);

    await result.current.fetchNextPage();

    // `from` is the rows actually loaded so far (1, from the first page's own response),
    // not the page size — the API caps how much a page can return, not the offset step.
    expect(http.get).toHaveBeenLastCalledWith(PROPOSALS_INTERNAL_URL, {
      version: PROPOSALS_API_VERSION,
      query: {
        conversationId: 'conv-42',
        excludeSuperseded: true,
        size: MAX_PROPOSALS_PAGE_SIZE,
        from: 1,
      },
    });
    await waitFor(() => expect(result.current.data?.pages).toEqual([firstPage, secondPage]));
    expect(result.current.hasNextPage).toBe(false);
  });

  it('uses a query key distinct from usePendingProposals, so the two caches never collide', () => {
    expect(queryKeys.proposals.forConversation('conv-42')).not.toEqual(
      queryKeys.proposals.list('conv-42')
    );
  });

  it("does not keep the previous conversation's proposals on screen while the next one loads", async () => {
    const http = makeHttp();
    const convAProposals = { proposals: [{ id: 'a-1' }], total: 1 };
    const convBProposals = { proposals: [{ id: 'b-1' }], total: 1 };
    http.get.mockImplementation((_url, { query }: { query: { conversationId: string } }) =>
      Promise.resolve(query.conversationId === 'conv-a' ? convAProposals : convBProposals)
    );
    useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<
      typeof useKibana
    >);

    const { Wrapper } = createWrapper();
    const { result, rerender } = renderHook(
      ({ conversationId }) => useConversationProposals(conversationId),
      { wrapper: Wrapper, initialProps: { conversationId: 'conv-a' } }
    );
    await waitFor(() =>
      expect(result.current.data).toEqual({ pages: [convAProposals], pageParams: [undefined] })
    );

    // A row keyed by `conv-a`'s proposal must not still be on screen, un-flagged as stale, once
    // the analyst has navigated to `conv-b` — that is what would let an approve/dismiss click
    // land on the wrong investigation.
    rerender({ conversationId: 'conv-b' });
    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();

    await waitFor(() =>
      expect(result.current.data).toEqual({ pages: [convBProposals], pageParams: [undefined] })
    );
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
      version: PROPOSALS_API_VERSION,
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
    // `onSuccess` polls the proposal directly until it reads a decision — see `waitForDecision`.
    http.get.mockResolvedValue({ decision: 'approved' });
    useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<
      typeof useKibana
    >);

    const { Wrapper, queryClient } = createWrapper();
    jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useApproveProposal(), { wrapper: Wrapper });

    await result.current.mutateAsync({ id: 'p-1', body: { actionInput: { name: 'Rule' } } });

    expect(http.post).toHaveBeenCalledWith(`${PROPOSALS_INTERNAL_URL}/p-1/approve`, {
      version: PROPOSALS_API_VERSION,
      body: JSON.stringify({ actionInput: { name: 'Rule' } }),
    });
  });

  it('percent-encodes special characters in id when approving', async () => {
    const http = makeHttp();
    http.post.mockResolvedValue({ id: 'org/repo#42', status: 'approved' });
    http.get.mockResolvedValue({ decision: 'approved' });
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
    http.get.mockResolvedValue({ decision: 'approved' });
    useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<
      typeof useKibana
    >);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useApproveProposal(), { wrapper: Wrapper });
    await result.current.mutateAsync({ id: 'p-1', body: {} });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledTimes(1);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.proposals.all });
    });
  });

  it('bumps the cross-boundary decision signal, so a host with its own isolated QueryClient invalidates too', async () => {
    const http = makeHttp();
    http.post.mockResolvedValue({ id: 'p-1', status: 'approved' });
    http.get.mockResolvedValue({ decision: 'approved' });
    useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<
      typeof useKibana
    >);

    const { Wrapper } = createWrapper();
    const bumpSpy = jest.spyOn(proposalDecisionSignal, 'bump');

    const { result } = renderHook(() => useApproveProposal(), { wrapper: Wrapper });
    await result.current.mutateAsync({ id: 'p-1', body: {} });

    expect(bumpSpy).toHaveBeenCalledTimes(1);
    bumpSpy.mockRestore();
  });

  it('keeps polling the proposal until it reads a decision, rather than trusting the first look', async () => {
    const http = makeHttp();
    http.post.mockResolvedValue({ id: 'p-1', status: 'approved' });
    http.get
      .mockResolvedValueOnce({ decision: undefined })
      .mockResolvedValueOnce({ decision: undefined })
      .mockResolvedValueOnce({ decision: 'approved' });
    useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<
      typeof useKibana
    >);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useApproveProposal(), { wrapper: Wrapper });

    await result.current.mutateAsync({ id: 'p-1', body: {} });

    expect(http.get).toHaveBeenCalledTimes(3);
  });

  it('does not fail an already-successful decision over a transient read failure while polling', async () => {
    // The decide POST already succeeded by the time this poll runs — a network blip reading it
    // back is not a decision failure and must not be reported as one.
    const http = makeHttp();
    http.post.mockResolvedValue({ id: 'p-1', status: 'approved' });
    http.get
      .mockRejectedValueOnce(new Error('network blip'))
      .mockResolvedValueOnce({ decision: 'approved' });
    useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<
      typeof useKibana
    >);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useApproveProposal(), { wrapper: Wrapper });

    await expect(result.current.mutateAsync({ id: 'p-1', body: {} })).resolves.toEqual({
      id: 'p-1',
      status: 'approved',
    });
    expect(http.get).toHaveBeenCalledTimes(2);
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
    http.get.mockResolvedValue({ decision: 'dismissed' });
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
      version: PROPOSALS_API_VERSION,
      body: JSON.stringify({ dismissReason: 'wrong', rationale: 'Not relevant' }),
    });
  });

  it('invalidates only the top-level proposals key on success (single call)', async () => {
    const http = makeHttp();
    http.post.mockResolvedValue({ id: 'p-1', status: 'dismissed' });
    http.get.mockResolvedValue({ decision: 'dismissed' });
    useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<
      typeof useKibana
    >);

    const { Wrapper, queryClient } = createWrapper();
    const invalidateSpy = jest.spyOn(queryClient, 'invalidateQueries');

    const { result } = renderHook(() => useDismissProposal(), { wrapper: Wrapper });
    await result.current.mutateAsync({ id: 'p-1', body: { dismissReason: 'wrong' } });

    await waitFor(() => {
      expect(invalidateSpy).toHaveBeenCalledTimes(1);
      expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: queryKeys.proposals.all });
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

describe('useIsApprovingProposal / useIsDecliningProposal', () => {
  it('is false for every proposal before any mutation has been called', () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => ({
        approving: useIsApprovingProposal('p-1'),
        declining: useIsDecliningProposal('p-1'),
      }),
      { wrapper: Wrapper }
    );

    expect(result.current.approving).toBe(false);
    expect(result.current.declining).toBe(false);
  });

  it('is true only for the proposal actually being approved, and settles back to false', async () => {
    const http = makeHttp();
    let resolvePost: (value: unknown) => void = () => {};
    http.post.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve;
        })
    );
    http.get.mockResolvedValue({ decision: 'approved' });
    useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<
      typeof useKibana
    >);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => ({
        approve: useApproveProposal(),
        isApprovingP1: useIsApprovingProposal('p-1'),
        isApprovingP2: useIsApprovingProposal('p-2'),
        isDecliningP1: useIsDecliningProposal('p-1'),
      }),
      { wrapper: Wrapper }
    );

    let mutatePromise: Promise<unknown> = Promise.resolve();
    act(() => {
      mutatePromise = result.current.approve.mutateAsync({ id: 'p-1', body: {} });
    });

    await waitFor(() => expect(result.current.isApprovingP1).toBe(true));
    // Neither a different proposal nor a decline reads this approval.
    expect(result.current.isApprovingP2).toBe(false);
    expect(result.current.isDecliningP1).toBe(false);

    resolvePost({ id: 'p-1', status: 'approved' });
    await act(async () => {
      await mutatePromise;
    });

    await waitFor(() => expect(result.current.isApprovingP1).toBe(false));
  });

  it('is true only for the proposal actually being declined, and settles back to false', async () => {
    const http = makeHttp();
    let resolvePost: (value: unknown) => void = () => {};
    http.post.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePost = resolve;
        })
    );
    http.get.mockResolvedValue({ decision: 'dismissed' });
    useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<
      typeof useKibana
    >);

    const { Wrapper } = createWrapper();
    const { result } = renderHook(
      () => ({
        dismiss: useDismissProposal(),
        isDecliningP1: useIsDecliningProposal('p-1'),
        isDecliningP2: useIsDecliningProposal('p-2'),
        isApprovingP1: useIsApprovingProposal('p-1'),
      }),
      { wrapper: Wrapper }
    );

    let mutatePromise: Promise<unknown> = Promise.resolve();
    act(() => {
      mutatePromise = result.current.dismiss.mutateAsync({
        id: 'p-1',
        body: { dismissReason: 'wrong' },
      });
    });

    await waitFor(() => expect(result.current.isDecliningP1).toBe(true));
    expect(result.current.isDecliningP2).toBe(false);
    expect(result.current.isApprovingP1).toBe(false);

    resolvePost({ id: 'p-1', status: 'dismissed' });
    await act(async () => {
      await mutatePromise;
    });

    await waitFor(() => expect(result.current.isDecliningP1).toBe(false));
  });
});
