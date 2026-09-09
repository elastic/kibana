/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import React from 'react';

import { sendVerifyCloudConnectorIacKey } from '../../../hooks/use_request/iac_provisioner';

import { useVerifyIacKey } from './use_verify_iac_key';

jest.mock('../../../hooks/use_request/iac_provisioner');

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
      data: { matches: false, reason: 'no_key', integrations: [] },
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

  it('sends the integration in the request body', async () => {
    mockSendVerify.mockResolvedValue({
      data: { matches: true, integrations: [] },
      error: null,
    } as Awaited<ReturnType<typeof sendVerifyCloudConnectorIacKey>>);

    const integration = { name: 'aws', policyTemplates: ['cspm'] };

    renderHook(() => useVerifyIacKey({ cloudConnectorId: 'cc-1', integration, enabled: true }), {
      wrapper,
    });

    await waitFor(() => expect(mockSendVerify).toHaveBeenCalled());
    expect(mockSendVerify).toHaveBeenCalledWith('cc-1', { integration });
  });
});
