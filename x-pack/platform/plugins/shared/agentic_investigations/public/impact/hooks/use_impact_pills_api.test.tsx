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
import { queryKeys as proposalsQueryKeys } from '@kbn/proposals-plugin/public';
import {
  AGENTIC_INVESTIGATIONS_API_VERSION,
  IMPACT_ESCALATION_SUMMARY_URL,
  IMPACT_PROPOSAL_SUMMARY_URL,
} from '../../../common';
import { escalationQueryKeys } from '../../escalations/query_keys';
import { impactPillsQueryKeys } from '../query_keys';
import { useEscalationImpactPills, useProposalImpactPills } from './use_impact_pills_api';

jest.mock('@kbn/kibana-react-plugin/public', () => ({ useKibana: jest.fn() }));

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;
const pills = [{ entityId: 'host-1', count: 2, entityType: 'host' }];
const onlyPage = { pills, total: 1, remaining: 0 };

let http: { get: jest.Mock };

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
    logger: { log: () => null, warn: () => null, error: () => null },
  });
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { Wrapper, queryClient };
};

beforeEach(() => {
  http = { get: jest.fn().mockResolvedValue(onlyPage) };
  useKibanaMock.mockReturnValue({ services: { http } } as unknown as ReturnType<typeof useKibana>);
});

describe('useProposalImpactPills', () => {
  const params = {
    origin: 'alertzero' as const,
    categories: ['respond', 'investigate'],
    decidedWithinHours: 72,
  };

  it('asks for the queue the page describes and returns its pills', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useProposalImpactPills(params), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.pills).toEqual(pills));
    expect(result.current.total).toBe(1);
    expect(result.current.remaining).toBe(0);
    expect(http.get).toHaveBeenCalledWith(IMPACT_PROPOSAL_SUMMARY_URL, {
      version: AGENTIC_INVESTIGATIONS_API_VERSION,
      query: {
        origin: 'alertzero',
        categories: ['respond', 'investigate'],
        decidedWithinHours: 72,
        from: 0,
        size: 10,
      },
    });
  });

  it('leaves the window out when none is given', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useProposalImpactPills({ origin: 'alertzero', categories: ['respond'] }),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.pills).toEqual(pills));
    expect(http.get.mock.calls[0][1].query).toEqual({
      origin: 'alertzero',
      categories: ['respond'],
      from: 0,
      size: 10,
    });
  });

  it('is cached under the proposals root, so a decision refreshes it', async () => {
    const { Wrapper, queryClient } = createWrapper();

    const { result } = renderHook(() => useProposalImpactPills(params), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.pills).toEqual(pills));

    expect(
      queryClient.getQueryCache().findAll({ queryKey: proposalsQueryKeys.proposals.all })
    ).toHaveLength(1);
    expect(
      queryClient.getQueryCache().findAll({ queryKey: impactPillsQueryKeys.proposals() })
    ).toHaveLength(1);
  });

  it('does not poll on its own', async () => {
    jest.useFakeTimers();
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useProposalImpactPills(params), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.pills).toEqual(pills));

    jest.advanceTimersByTime(10 * 60_000);

    expect(http.get).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});

describe('paging', () => {
  const params = { origin: 'alertzero' as const, categories: ['respond'] };
  const pill = (entityId: string) => ({ entityId, count: 1 });
  const firstPage = { pills: [pill('a'), pill('b')], total: 5, remaining: 3 };
  const secondPage = { pills: [pill('c'), pill('d')], total: 5, remaining: 1 };

  beforeEach(() => {
    http.get.mockImplementation((_url: string, { query }: { query: { from: number } }) =>
      Promise.resolve(query.from === 0 ? firstPage : secondPage)
    );
  });

  it('reports how many pills are left and offers no way back on the first page', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useProposalImpactPills(params), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.pills).toHaveLength(2));
    expect(result.current.total).toBe(5);
    expect(result.current.remaining).toBe(3);
    expect(result.current.showFewer).toBeUndefined();
    expect(result.current.canShowMore).toBe(true);
    expect(result.current.reachLimit).toBe(10_000);
  });

  it('appends the next page from the offset of what has loaded', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useProposalImpactPills(params), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.pills).toHaveLength(2));

    act(() => result.current.showMore());

    await waitFor(() => expect(result.current.pills).toHaveLength(4));
    expect(http.get.mock.calls[1][1].query).toMatchObject({ from: 2, size: 10 });
    expect(result.current.pills.map(({ entityId }) => entityId)).toEqual(['a', 'b', 'c', 'd']);
    expect(result.current.remaining).toBe(1);
    expect(result.current.total).toBe(5);
  });

  it('goes back to the first page with showFewer', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useProposalImpactPills(params), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.pills).toHaveLength(2));
    act(() => result.current.showMore());
    await waitFor(() => expect(result.current.showFewer).toBeDefined());

    act(() => result.current.showFewer!());

    await waitFor(() => expect(result.current.pills).toHaveLength(2));
    expect(result.current.remaining).toBe(3);
    expect(result.current.showFewer).toBeUndefined();
  });

  it('shows an entity once when the ranking moved it into the next page', async () => {
    http.get.mockImplementation((_url: string, { query }: { query: { from: number } }) =>
      Promise.resolve(
        query.from === 0 ? firstPage : { pills: [pill('b'), pill('c')], total: 5, remaining: 1 }
      )
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useProposalImpactPills(params), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.pills).toHaveLength(2));

    act(() => result.current.showMore());

    await waitFor(() => expect(result.current.pills).toHaveLength(3));
    expect(result.current.pills.map(({ entityId }) => entityId)).toEqual(['a', 'b', 'c']);
  });

  it('stops asking for pages at the reach of the server', async () => {
    http.get.mockImplementation((_url: string, { query }: { query: { from: number } }) =>
      Promise.resolve({
        pills: Array.from({ length: 5000 }, (_, i) => pill(`e-${query.from + i}`)),
        total: 20000,
        remaining: 20000 - query.from - 5000,
      })
    );
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useProposalImpactPills(params), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.pills).toHaveLength(5000));
    act(() => result.current.showMore());
    await waitFor(() => expect(result.current.pills).toHaveLength(10000));

    act(() => result.current.showMore());

    expect(http.get).toHaveBeenCalledTimes(2);
    expect(result.current.remaining).toBeGreaterThan(0);
    expect(result.current.canShowMore).toBe(false);
  });

  it('flags a failed request and keeps the pills it has', async () => {
    const { Wrapper } = createWrapper();
    const { result } = renderHook(() => useProposalImpactPills(params), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.pills).toHaveLength(2));
    expect(result.current.loadFailed).toBe(false);
    // A 4xx is not retried, so the failure surfaces at once.
    http.get.mockRejectedValue(
      Object.assign(new Error('bad request'), { request: {}, response: { status: 400 } })
    );

    act(() => result.current.showMore());

    await waitFor(() => expect(result.current.loadFailed).toBe(true));
    expect(result.current.pills).toHaveLength(2);
  });

  it('asks for no further page once the server has sent everything', async () => {
    const { Wrapper } = createWrapper();
    http.get.mockReset().mockResolvedValue(onlyPage);
    const { result } = renderHook(() => useProposalImpactPills(params), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.pills).toEqual(pills));

    act(() => result.current.showMore());

    expect(http.get).toHaveBeenCalledTimes(1);
  });
});

describe('useEscalationImpactPills', () => {
  it('returns the pills across every escalation', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useEscalationImpactPills(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.pills).toEqual(pills));
    expect(http.get).toHaveBeenCalledWith(IMPACT_ESCALATION_SUMMARY_URL, {
      version: AGENTIC_INVESTIGATIONS_API_VERSION,
      query: { from: 0, size: 10 },
    });
  });

  it('is cached under the escalations root, so an escalation change refreshes it', async () => {
    const { Wrapper, queryClient } = createWrapper();

    const { result } = renderHook(() => useEscalationImpactPills(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.pills).toEqual(pills));

    expect(queryClient.getQueryCache().findAll({ queryKey: escalationQueryKeys.all })).toHaveLength(
      1
    );
  });

  it('makes no request when disabled', () => {
    const { Wrapper } = createWrapper();

    renderHook(() => useEscalationImpactPills({ enabled: false }), { wrapper: Wrapper });

    expect(http.get).not.toHaveBeenCalled();
  });
});
