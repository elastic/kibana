/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

import { useConfig, sendGetAgents } from '../../../../hooks';

import { useAgentSoftLimit } from './use_agent_soft_limit';

jest.mock('../../../../hooks');

const mockedSendGetAgents = jest.mocked(sendGetAgents);
const mockedUseConfig = jest.mocked(useConfig);

describe('useAgentSoftLimit', () => {
  let wrapper: FC<PropsWithChildren>;

  beforeEach(() => {
    mockedSendGetAgents.mockReset();
    mockedUseConfig.mockReset();

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    wrapper = ({ children }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
  });
  it('should return shouldDisplayAgentSoftLimit:false if soft limit is not enabled in config', () => {
    mockedUseConfig.mockReturnValue({} as any);
    const { result } = renderHook(() => useAgentSoftLimit(), { wrapper });

    expect(result.current.shouldDisplayAgentSoftLimit).toEqual(false);

    expect(mockedSendGetAgents).not.toHaveBeenCalled();
  });

  it('should return shouldDisplayAgentSoftLimit:false if soft limit is enabled in config and there is less online agents than the limit', async () => {
    mockedUseConfig.mockReturnValue({ internal: { activeAgentsSoftLimit: 10 } } as any);
    mockedSendGetAgents.mockResolvedValue({
      data: {
        total: 5,
      },
    } as any);
    const { result, rerender } = renderHook(() => useAgentSoftLimit(), { wrapper });
    await waitFor(() => expect(mockedSendGetAgents).toHaveBeenCalled());

    // re-render so cache is updated to value from most recent call
    rerender();

    expect(result.current.shouldDisplayAgentSoftLimit).toEqual(false);
  });

  it('should return shouldDisplayAgentSoftLimit:true if soft limit is enabled in config and there is more online agents than the limit', async () => {
    mockedUseConfig.mockReturnValue({ internal: { activeAgentsSoftLimit: 10 } } as any);
    mockedSendGetAgents.mockResolvedValue({
      data: {
        total: 15,
      },
    } as any);
    const { result, rerender } = renderHook(() => useAgentSoftLimit(), { wrapper });
    await waitFor(() => expect(mockedSendGetAgents).toHaveBeenCalled());

    // re-render so cache is updated to value from most recent call
    rerender();

    expect(result.current.shouldDisplayAgentSoftLimit).toEqual(true);
  });
});
