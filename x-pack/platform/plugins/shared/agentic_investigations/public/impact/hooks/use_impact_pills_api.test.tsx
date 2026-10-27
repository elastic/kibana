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
  http = { get: jest.fn().mockResolvedValue({ pills }) };
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

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(pills);
    expect(http.get).toHaveBeenCalledWith(IMPACT_PROPOSAL_SUMMARY_URL, {
      version: AGENTIC_INVESTIGATIONS_API_VERSION,
      query: {
        origin: 'alertzero',
        categories: ['respond', 'investigate'],
        decidedWithinHours: 72,
      },
    });
  });

  it('leaves the window out when none is given', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(
      () => useProposalImpactPills({ origin: 'alertzero', categories: ['respond'] }),
      { wrapper: Wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(http.get.mock.calls[0][1].query).toEqual({
      origin: 'alertzero',
      categories: ['respond'],
    });
  });

  it('is cached under the proposals root, so a decision refreshes it', async () => {
    const { Wrapper, queryClient } = createWrapper();

    const { result } = renderHook(() => useProposalImpactPills(params), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

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
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    jest.advanceTimersByTime(10 * 60_000);

    expect(http.get).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});

describe('useEscalationImpactPills', () => {
  it('returns the pills across every escalation', async () => {
    const { Wrapper } = createWrapper();

    const { result } = renderHook(() => useEscalationImpactPills(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(pills);
    expect(http.get).toHaveBeenCalledWith(IMPACT_ESCALATION_SUMMARY_URL, {
      version: AGENTIC_INVESTIGATIONS_API_VERSION,
    });
  });

  it('is cached under the escalations root, so an escalation change refreshes it', async () => {
    const { Wrapper, queryClient } = createWrapper();

    const { result } = renderHook(() => useEscalationImpactPills(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

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
