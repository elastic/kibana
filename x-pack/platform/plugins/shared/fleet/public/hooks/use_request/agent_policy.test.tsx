/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

import { AGENT_POLICY_API_ROUTES, API_VERSIONS } from '../../../common/constants';

import { sendRequestForRq } from './use_request';
import { useGetAgentPoliciesPackagePoliciesSummaryQuery } from './agent_policy';

jest.mock('./use_request', () => ({
  ...jest.requireActual('./use_request'),
  sendRequestForRq: jest.fn(),
}));

describe('useGetAgentPoliciesPackagePoliciesSummaryQuery', () => {
  const summary = {
    count: 4301,
    has_fleet_server: false,
    has_managed: false,
    has_root_integrations: true,
    has_shared: false,
  };
  let queryClient: QueryClient;
  let wrapper: FC<PropsWithChildren>;

  beforeEach(() => {
    jest.mocked(sendRequestForRq).mockReset();
    jest.mocked(sendRequestForRq).mockResolvedValue({ items: { 'policy-1': summary } });

    queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  });

  it('posts the ids to the internal package policies summary route', async () => {
    const { result } = renderHook(
      () => useGetAgentPoliciesPackagePoliciesSummaryQuery(['policy-1', 'policy-2']),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(sendRequestForRq).toHaveBeenCalledTimes(1);
    expect(sendRequestForRq).toHaveBeenCalledWith({
      path: AGENT_POLICY_API_ROUTES.PACKAGE_POLICIES_SUMMARY_PATTERN,
      method: 'post',
      body: JSON.stringify({ ids: ['policy-1', 'policy-2'] }),
      version: API_VERSIONS.internal.v1,
    });
    expect(result.current.data).toEqual({ items: { 'policy-1': summary } });
  });

  it('does not send a request when disabled', async () => {
    renderHook(() => useGetAgentPoliciesPackagePoliciesSummaryQuery([], { enabled: false }), {
      wrapper,
    });

    await act(() => new Promise((resolve) => setTimeout(resolve, 20)));

    expect(sendRequestForRq).not.toHaveBeenCalled();
  });

  it('sends a new request when the ids change', async () => {
    let ids = ['policy-1'];
    const { result, rerender } = renderHook(
      () => useGetAgentPoliciesPackagePoliciesSummaryQuery(ids),
      { wrapper }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    ids = ['policy-1', 'policy-2'];
    rerender();

    await waitFor(() => expect(sendRequestForRq).toHaveBeenCalledTimes(2));
  });

  it('exposes the error and recovers when the summaries are invalidated', async () => {
    jest.mocked(sendRequestForRq).mockRejectedValueOnce(new Error('boom'));
    const { result } = renderHook(
      () => useGetAgentPoliciesPackagePoliciesSummaryQuery(['policy-1']),
      {
        wrapper,
      }
    );
    await waitFor(() => expect(result.current.isError).toBe(true));

    await act(async () => {
      await queryClient.invalidateQueries(['agentPolicies', 'packagePoliciesSummary']);
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ items: { 'policy-1': summary } });
    expect(sendRequestForRq).toHaveBeenCalledTimes(2);
  });

  it('is refreshed together with the other agent policies queries', async () => {
    const { result } = renderHook(
      () => useGetAgentPoliciesPackagePoliciesSummaryQuery(['policy-1']),
      {
        wrapper,
      }
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    await act(async () => {
      await queryClient.invalidateQueries(['agentPolicies']);
    });

    await waitFor(() => expect(sendRequestForRq).toHaveBeenCalledTimes(2));
  });
});
