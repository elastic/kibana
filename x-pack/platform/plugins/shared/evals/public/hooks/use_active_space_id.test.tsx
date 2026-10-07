/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ReactNode } from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { useActiveSpaceId } from './use_active_space_id';

const renderUseActiveSpaceId = (services: Record<string, unknown>) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <KibanaContextProvider services={services}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </KibanaContextProvider>
  );

  return renderHook(() => useActiveSpaceId(), { wrapper });
};

describe('useActiveSpaceId', () => {
  it('returns the active space id from the spaces plugin', async () => {
    const getActiveSpace = jest.fn().mockResolvedValue({ id: 'marketing' });

    const { result } = renderUseActiveSpaceId({ spaces: { getActiveSpace } });

    await waitFor(() => expect(result.current.spaceId).toBe('marketing'));
    expect(result.current.isLoading).toBe(false);
  });

  it('settles without a space id when the active space cannot be resolved', async () => {
    const getActiveSpace = jest.fn().mockRejectedValue(new Error('boom'));

    const { result } = renderUseActiveSpaceId({ spaces: { getActiveSpace } });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.spaceId).toBeUndefined();
  });

  it('falls back to the default space when spaces is unavailable', async () => {
    const { result } = renderUseActiveSpaceId({});

    await waitFor(() => expect(result.current.spaceId).toBe('default'));
  });
});
