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
import { useListKiGroups } from './use_list_ki_groups';

const renderUseListKiGroups = (core: CoreStart, args: Parameters<typeof useListKiGroups>[0]) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      KibanaContextProvider,
      { services: core },
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    );
  return renderHook(() => useListKiGroups(args), { wrapper });
};

const ARGS = {
  aiIndexId: 'my-ai-index',
  maxGroups: 5,
  previewSize: 10,
  status: ['active', 'expired'] as const,
  sort: 'updated' as const,
};

describe('useListKiGroups', () => {
  it('asks the groups endpoint with the bounded params and maps the response', async () => {
    const core = coreMock.createStart();
    (core.http.get as jest.Mock).mockResolvedValue({
      total: 12,
      total_other: 2,
      groups: [{ type: 'faq', count: 10, kis: [] }],
    });

    const { result } = renderUseListKiGroups(core, { ...ARGS, query: 'refund' });

    await waitFor(() => {
      expect(result.current.total).toBe(12);
    });
    expect(result.current.totalOther).toBe(2);
    expect(result.current.groups).toEqual([{ type: 'faq', count: 10, kis: [] }]);
    expect(core.http.get).toHaveBeenCalledWith(
      '/internal/context_engine/ai_index/my-ai-index/kis/_groups',
      expect.objectContaining({
        version: '1',
        query: {
          max_groups: 5,
          preview_size: 10,
          query: 'refund',
          status: ['active', 'expired'],
          sort: 'updated',
        },
      })
    );
  });

  it('starts empty and reports errors', async () => {
    const core = coreMock.createStart();
    (core.http.get as jest.Mock).mockRejectedValue(new Error('boom'));

    const { result } = renderUseListKiGroups(core, ARGS);
    expect(result.current).toEqual(
      expect.objectContaining({ groups: [], total: 0, totalOther: 0 })
    );

    await waitFor(() => {
      expect(result.current.error?.message).toBe('boom');
    });
  });
});
