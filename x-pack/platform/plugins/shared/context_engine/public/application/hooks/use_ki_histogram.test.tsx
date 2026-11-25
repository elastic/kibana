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
import { useKiHistogram } from './use_ki_histogram';

const renderUseKiHistogram = (core: CoreStart) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      KibanaContextProvider,
      { services: core },
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    );
  return renderHook(() => useKiHistogram('my-ai-index'), { wrapper });
};

describe('useKiHistogram', () => {
  it('asks the histogram endpoint and returns its buckets', async () => {
    const core = coreMock.createStart();
    const buckets = [
      { date: '2026-11-19', count: 0 },
      { date: '2026-11-20', count: 4 },
    ];
    (core.http.get as jest.Mock).mockResolvedValue({ buckets });

    const { result } = renderUseKiHistogram(core);

    await waitFor(() => {
      expect(result.current.buckets).toEqual(buckets);
    });
    expect(core.http.get).toHaveBeenCalledWith(
      '/internal/context_engine/ai_index/my-ai-index/kis/_histogram',
      expect.objectContaining({ version: '1' })
    );
  });

  it('starts empty and reports errors', async () => {
    const core = coreMock.createStart();
    (core.http.get as jest.Mock).mockRejectedValue(new Error('boom'));

    const { result } = renderUseKiHistogram(core);
    expect(result.current.buckets).toEqual([]);

    await waitFor(() => {
      expect(result.current.error?.message).toBe('boom');
    });
  });
});
