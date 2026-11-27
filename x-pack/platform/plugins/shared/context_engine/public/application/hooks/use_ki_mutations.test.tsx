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
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { useDeleteKi, useRestoreKi, useUpdateKi } from './use_ki_mutations';

const scope = { aiIndexId: 'sample-ki', kiId: 'ki-1', index: 'ai-index-idx-sample-ki' };

const renderWithQueryClient = <T,>(core: CoreStart, useHook: () => T) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  jest.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      KibanaContextProvider,
      { services: core },
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    );

  const rendered = renderHook(useHook, { wrapper });
  return { ...rendered, queryClient };
};

describe('useUpdateKi', () => {
  it('PATCHes the KI content and invalidates the list and single-KI queries', async () => {
    const core = coreMock.createStart();
    (core.http.patch as jest.Mock).mockResolvedValue({ id: 'ki-1', result: 'updated' });

    const { result, queryClient } = renderWithQueryClient(core, () => useUpdateKi(scope));

    await act(async () => {
      result.current.mutate({ content: 'Updated content' });
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(core.http.patch).toHaveBeenCalledWith(
      '/internal/context_engine/ai_index/sample-ki/kis/ki-1',
      expect.objectContaining({
        version: '1',
        query: { index: 'ai-index-idx-sample-ki' },
        body: JSON.stringify({ ki: { content: 'Updated content' } }),
      })
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['context_engine', 'ai_index', 'sample-ki', 'list_ki'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['context_engine', 'ai_index', 'sample-ki', 'ki', 'ai-index-idx-sample-ki', 'ki-1'],
    });
  });
});

describe('useDeleteKi', () => {
  it('DELETEs the KI and invalidates the list and single-KI queries', async () => {
    const core = coreMock.createStart();
    (core.http.delete as jest.Mock).mockResolvedValue({ id: 'ki-1' });

    const { result, queryClient } = renderWithQueryClient(core, () => useDeleteKi(scope));

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(core.http.delete).toHaveBeenCalledWith(
      '/internal/context_engine/ai_index/sample-ki/kis/ki-1',
      expect.objectContaining({ version: '1', query: { index: 'ai-index-idx-sample-ki' } })
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['context_engine', 'ai_index', 'sample-ki', 'list_ki'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['context_engine', 'ai_index', 'sample-ki', 'ki', 'ai-index-idx-sample-ki', 'ki-1'],
    });
  });
});

describe('useRestoreKi', () => {
  it('POSTs to the restore endpoint and invalidates the list and single-KI queries', async () => {
    const core = coreMock.createStart();
    (core.http.post as jest.Mock).mockResolvedValue({ id: 'ki-1' });

    const { result, queryClient } = renderWithQueryClient(core, () => useRestoreKi(scope));

    await act(async () => {
      result.current.mutate();
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(core.http.post).toHaveBeenCalledWith(
      '/internal/context_engine/ai_index/sample-ki/kis/ki-1/_restore',
      expect.objectContaining({ version: '1', query: { index: 'ai-index-idx-sample-ki' } })
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['context_engine', 'ai_index', 'sample-ki', 'list_ki'],
    });
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['context_engine', 'ai_index', 'sample-ki', 'ki', 'ai-index-idx-sample-ki', 'ki-1'],
    });
  });
});
