/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { waitFor, renderHook, act } from '@testing-library/react';
import { useRotateInboundIngress } from './use_rotate_inbound_ingress';

const mockAddDanger = jest.fn();
const mockAddSuccess = jest.fn();
const mockRotateInboundIngress = jest.fn();

jest.mock('../../common/lib/kibana', () => {
  const originalModule = jest.requireActual('../../common/lib/kibana');
  return {
    ...originalModule,
    useKibana: () => {
      const { services } = originalModule.useKibana();
      return {
        services: {
          ...services,
          notifications: { toasts: { addSuccess: mockAddSuccess, addDanger: mockAddDanger } },
        },
      };
    },
  };
});

jest.mock('../lib/action_connector_api', () => ({
  rotateInboundIngress: (...args: unknown[]) => mockRotateInboundIngress(...args),
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      cacheTime: 0,
    },
    mutations: {
      retry: false,
    },
  },
});
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useRotateInboundIngress', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    queryClient.clear();
  });

  it('returns the minted token and shows a success toast', async () => {
    mockRotateInboundIngress.mockResolvedValueOnce({ ingestToken: 'rotated-token' });

    const { result } = renderHook(() => useRotateInboundIngress(), { wrapper });

    expect(result.current.isLoading).toBe(false);

    let rotated: { ingestToken: string } | undefined;
    await act(async () => {
      rotated = await result.current.rotateIngress('sales-ingress');
    });

    expect(rotated).toEqual({ ingestToken: 'rotated-token' });
    await waitFor(() => expect(mockAddSuccess).toHaveBeenCalledWith('Ingest token rotated'));
    expect(mockAddDanger).not.toHaveBeenCalled();
  });

  it('shows an error toast and rejects when rotate fails', async () => {
    mockRotateInboundIngress.mockRejectedValueOnce({
      name: 'Error',
      body: { message: 'Cannot rotate' },
    });

    const { result } = renderHook(() => useRotateInboundIngress(), { wrapper });

    await act(async () => {
      await expect(result.current.rotateIngress('sales-ingress')).rejects.toEqual({
        name: 'Error',
        body: { message: 'Cannot rotate' },
      });
    });

    await waitFor(() => expect(mockAddDanger).toHaveBeenCalledWith('Cannot rotate'));
    expect(mockAddSuccess).not.toHaveBeenCalled();
  });
});
