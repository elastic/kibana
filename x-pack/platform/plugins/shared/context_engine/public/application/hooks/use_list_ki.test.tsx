/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { DEFAULT_KI_PAGE_SIZE } from '../../../common/constants';
import { useListKi } from './use_list_ki';

const renderUseListKi = (core: CoreStart, args: Parameters<typeof useListKi>[0]) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      KibanaContextProvider,
      { services: core },
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    );

  return renderHook(() => useListKi(args), { wrapper });
};

describe('useListKi', () => {
  it('shows an error toast when notifyOnError is enabled and the request fails', async () => {
    const core = coreMock.createStart();
    const requestError = new Error('Request timed out');
    (core.http.get as jest.Mock).mockRejectedValue(requestError);

    const { result } = renderUseListKi(core, {
      aiIndexId: 'my-ai-index',
      notifyOnError: true,
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    await waitFor(() => {
      expect(core.notifications.toasts.addError).toHaveBeenCalledWith(
        requestError,
        expect.objectContaining({
          title: 'Unable to load Knowledge Indicators',
          toastMessage: 'Request timed out',
        })
      );
    });
  });

  it('does not show an error toast when notifyOnError is disabled', async () => {
    const core = coreMock.createStart();
    (core.http.get as jest.Mock).mockRejectedValue(new Error('Request timed out'));

    const { result } = renderUseListKi(core, {
      aiIndexId: 'my-ai-index',
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(core.notifications.toasts.addError).not.toHaveBeenCalled();
  });

  it('passes size and type through to the list endpoint', async () => {
    const core = coreMock.createStart();
    (core.http.get as jest.Mock).mockResolvedValue({ kis: [], total: 0 });

    renderUseListKi(core, {
      aiIndexId: 'my-ai-index',
      size: 10,
      type: 'playbook',
    });

    await waitFor(() => {
      expect(core.http.get).toHaveBeenCalledWith(
        '/internal/context_engine/ai_index/my-ai-index/kis',
        expect.objectContaining({
          query: expect.objectContaining({
            size: 10,
            type: 'playbook',
            lifecycle_status: ['active', 'deleted'],
          }),
        })
      );
    });
  });

  it('uses the default page size when size is omitted', async () => {
    const core = coreMock.createStart();
    (core.http.get as jest.Mock).mockResolvedValue({ kis: [], total: 0 });

    renderUseListKi(core, { aiIndexId: 'my-ai-index' });

    await waitFor(() => {
      expect(core.http.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          query: expect.objectContaining({ size: DEFAULT_KI_PAGE_SIZE }),
        })
      );
    });
  });

  it('does not fetch when aiIndexId is undefined', () => {
    const core = coreMock.createStart();

    renderUseListKi(core, { aiIndexId: undefined });

    expect(core.http.get).not.toHaveBeenCalled();
  });

  it('does not fetch when enabled is false', () => {
    const core = coreMock.createStart();

    renderUseListKi(core, {
      aiIndexId: 'my-ai-index',
      enabled: false,
    });

    expect(core.http.get).not.toHaveBeenCalled();
  });

  it('falls back summary totals when summary is missing', async () => {
    const core = coreMock.createStart();
    (core.http.get as jest.Mock).mockResolvedValue({
      kis: [],
      total: 42,
    });

    const { result } = renderUseListKi(core, { aiIndexId: 'my-ai-index' });

    await waitFor(() => {
      expect(result.current.total).toBe(42);
    });

    expect(result.current.summary).toEqual({
      total: 42,
      countsByType: [],
    });
  });

  it('maps summary counts when the API returns them', async () => {
    const core = coreMock.createStart();
    (core.http.get as jest.Mock).mockResolvedValue({
      kis: [],
      total: 10,
      summary: {
        total: 100,
        counts_by_type: [{ type: 'playbook', count: 3 }],
      },
    });

    const { result } = renderUseListKi(core, { aiIndexId: 'my-ai-index' });

    await waitFor(() => {
      expect(result.current.summary).toEqual({
        total: 100,
        countsByType: [{ type: 'playbook', count: 3 }],
      });
    });
  });
});
