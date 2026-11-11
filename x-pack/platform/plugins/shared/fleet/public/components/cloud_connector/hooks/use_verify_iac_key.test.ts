/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';

import { sendVerifyCloudConnectorIacKey } from '../../../hooks/use_request/cloud_connector';

import { VERIFY_IAC_KEY_QUERY_KEY, useVerifyIacKey } from './use_verify_iac_key';

jest.mock('../../../hooks/use_request/cloud_connector');

const mockSendVerify = sendVerifyCloudConnectorIacKey as jest.MockedFunction<
  typeof sendVerifyCloudConnectorIacKey
>;

describe('useVerifyIacKey', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      logger: { log: () => {}, warn: () => {}, error: () => {} },
      defaultOptions: { queries: { retry: false } },
    });
    mockSendVerify.mockClear();
  });

  afterEach(() => {
    queryClient.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  it('does not call sendVerifyCloudConnectorIacKey when cloudConnectorId is undefined', async () => {
    const { result } = renderHook(
      () => useVerifyIacKey({ cloudConnectorId: undefined, enabled: true }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(mockSendVerify).not.toHaveBeenCalled();
  });

  it('does not call sendVerifyCloudConnectorIacKey when enabled is false', async () => {
    const { result } = renderHook(
      () => useVerifyIacKey({ cloudConnectorId: 'cc-1', enabled: false }),
      { wrapper }
    );
    await waitFor(() => expect(result.current.fetchStatus).toBe('idle'));
    expect(mockSendVerify).not.toHaveBeenCalled();
  });

  it('resolves with matches === false and reason no_key', async () => {
    mockSendVerify.mockResolvedValue({
      data: { matches: false, reason: 'no_key', outcome: 'no_key', integrations: [] },
      error: null,
    } as Awaited<ReturnType<typeof sendVerifyCloudConnectorIacKey>>);

    const { result } = renderHook(
      () => useVerifyIacKey({ cloudConnectorId: 'cc-1', enabled: true }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.matches).toBe(false);
    expect(result.current.data?.reason).toBe('no_key');
  });

  it('sets isError when the helper returns an error', async () => {
    mockSendVerify.mockResolvedValue({
      data: null,
      error: new Error('network error'),
    } as unknown as Awaited<ReturnType<typeof sendVerifyCloudConnectorIacKey>>);

    const { result } = renderHook(
      () => useVerifyIacKey({ cloudConnectorId: 'cc-1', enabled: true }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('sends the integrations in the request body and keys the query on them', async () => {
    mockSendVerify.mockResolvedValue({
      data: { matches: true, outcome: 'matches', integrations: [] },
      error: null,
    } as Awaited<ReturnType<typeof sendVerifyCloudConnectorIacKey>>);

    const integrations = [
      { name: 'aws', policyTemplates: [{ name: 'cspm', enabledInputs: ['cloudbeat/cis_aws'] }] },
      { name: 'aws_logs', policyTemplates: [{ name: 'generic', enabledInputs: ['aws-s3'] }] },
    ];

    renderHook(() => useVerifyIacKey({ cloudConnectorId: 'cc-1', integrations, enabled: true }), {
      wrapper,
    });

    await waitFor(() => expect(mockSendVerify).toHaveBeenCalled());
    expect(mockSendVerify).toHaveBeenCalledWith('cc-1', { integrations });
    // A changed selection must miss the cache, so the set is part of the key.
    expect(
      queryClient.getQueryData([VERIFY_IAC_KEY_QUERY_KEY, 'cc-1', integrations, undefined])
    ).toBeDefined();
  });

  it('omits integrations and compare from the body when none are passed', async () => {
    mockSendVerify.mockResolvedValue({
      data: { matches: true, outcome: 'matches', integrations: [] },
      error: null,
    } as Awaited<ReturnType<typeof sendVerifyCloudConnectorIacKey>>);

    renderHook(() => useVerifyIacKey({ cloudConnectorId: 'cc-1', enabled: true }), { wrapper });

    await waitFor(() => expect(mockSendVerify).toHaveBeenCalled());
    expect(mockSendVerify).toHaveBeenCalledWith('cc-1', { integrations: undefined });
    expect(mockSendVerify.mock.calls[0][1]).not.toHaveProperty('compare');
  });

  it('sends compare:false in the body and keys the query on it (flyout on open)', async () => {
    // A read of the integration set must not share a cache entry with a comparing check.
    mockSendVerify.mockResolvedValue({
      data: { matches: true, outcome: 'not_checked', integrations: [] },
      error: null,
    } as Awaited<ReturnType<typeof sendVerifyCloudConnectorIacKey>>);

    renderHook(() => useVerifyIacKey({ cloudConnectorId: 'cc-1', compare: false, enabled: true }), {
      wrapper,
    });

    await waitFor(() => expect(mockSendVerify).toHaveBeenCalled());
    expect(mockSendVerify).toHaveBeenCalledWith('cc-1', {
      integrations: undefined,
      compare: false,
    });
    expect(
      queryClient.getQueryData([VERIFY_IAC_KEY_QUERY_KEY, 'cc-1', undefined, false])
    ).toBeDefined();
    expect(
      queryClient.getQueryData([VERIFY_IAC_KEY_QUERY_KEY, 'cc-1', undefined, undefined])
    ).toBeUndefined();
  });
});
