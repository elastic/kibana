/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { approveImprovement, rejectImprovement } from '../api/improvements';
import { contextEngineQueryKeys } from './query_keys';
import { useApproveImprovement, useRejectImprovement } from './use_resolve_improvement';

jest.mock('../api/improvements', () => ({
  approveImprovement: jest.fn(),
  rejectImprovement: jest.fn(),
}));

const mockApproveImprovement = jest.mocked(approveImprovement);
const mockRejectImprovement = jest.mocked(rejectImprovement);

const setup = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
  const services = coreMock.createStart();

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <KibanaContextProvider services={services}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </KibanaContextProvider>
  );

  return { wrapper, invalidateQueries, services };
};

const resolved = { improvement: { improvement_id: 'imp-1' } };

describe('useApproveImprovement', () => {
  beforeEach(() => {
    mockApproveImprovement.mockResolvedValue(
      resolved as unknown as Awaited<ReturnType<typeof approveImprovement>>
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('approves the given suggestion', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(() => useApproveImprovement('my-index'), { wrapper });

    result.current.mutate('imp-1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApproveImprovement).toHaveBeenCalledWith(expect.anything(), {
      improvementId: 'imp-1',
    });
  });

  it('refreshes the panels an applied change can alter', async () => {
    const { wrapper, invalidateQueries } = setup();
    const { result } = renderHook(() => useApproveImprovement('my-index'), { wrapper });

    result.current.mutate('imp-1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const invalidatedKeys = invalidateQueries.mock.calls.map(([args]) => args);
    expect(invalidatedKeys).toEqual(
      expect.arrayContaining([
        { queryKey: contextEngineQueryKeys.improvements.all('my-index') },
        { queryKey: contextEngineQueryKeys.aiIndex.detail('my-index'), exact: true },
        { queryKey: contextEngineQueryKeys.aiIndex.kiSummary('my-index'), exact: true },
      ])
    );
  });

  it('reports a failed apply to the user', async () => {
    mockApproveImprovement.mockRejectedValue(new Error('boom'));
    const { wrapper, services } = setup();
    const { result } = renderHook(() => useApproveImprovement('my-index'), { wrapper });

    result.current.mutate('imp-1');

    await waitFor(() => expect(services.notifications.toasts.addError).toHaveBeenCalledTimes(1));
  });
});

describe('useRejectImprovement', () => {
  beforeEach(() => {
    mockRejectImprovement.mockResolvedValue(
      resolved as unknown as Awaited<ReturnType<typeof rejectImprovement>>
    );
  });

  afterEach(() => jest.clearAllMocks());

  it('refreshes only the suggestions, since nothing else changed', async () => {
    const { wrapper, invalidateQueries } = setup();
    const { result } = renderHook(() => useRejectImprovement('my-index'), { wrapper });

    result.current.mutate('imp-1');
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(mockRejectImprovement).toHaveBeenCalledWith(expect.anything(), {
      improvementId: 'imp-1',
    });
    expect(invalidateQueries).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: contextEngineQueryKeys.improvements.all('my-index'),
    });
  });
});
