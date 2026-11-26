/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { renderHook } from '@testing-library/react';
import React from 'react';
import { useRefreshKnowledgeDocumentsAfterRun } from './use_refresh_knowledge_documents_after_run';

const renderRefreshHook = (initialProps: { aiIndexId?: string; isRunning: boolean }) => {
  const queryClient = new QueryClient();
  const invalidateQueries = jest.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const rendered = renderHook(
    ({ aiIndexId, isRunning }) => useRefreshKnowledgeDocumentsAfterRun(aiIndexId, isRunning),
    { wrapper, initialProps }
  );
  return { ...rendered, invalidateQueries };
};

describe('useRefreshKnowledgeDocumentsAfterRun', () => {
  it('refreshes the knowledge document queries of the AI index when a run ends', () => {
    const { rerender, invalidateQueries } = renderRefreshHook({
      aiIndexId: 'my-index',
      isRunning: true,
    });

    rerender({ aiIndexId: 'my-index', isRunning: false });

    expect(invalidateQueries).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['context_engine', 'ai_index', 'my-index', 'list_ki'],
    });
  });

  it('does not refresh when no run was in progress', () => {
    const { rerender, invalidateQueries } = renderRefreshHook({
      aiIndexId: 'my-index',
      isRunning: false,
    });

    rerender({ aiIndexId: 'my-index', isRunning: false });

    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it('does not refresh while a run starts or keeps running', () => {
    const { rerender, invalidateQueries } = renderRefreshHook({
      aiIndexId: 'my-index',
      isRunning: false,
    });

    rerender({ aiIndexId: 'my-index', isRunning: true });
    rerender({ aiIndexId: 'my-index', isRunning: true });

    expect(invalidateQueries).not.toHaveBeenCalled();
  });

  it('does nothing without an AI index', () => {
    const { rerender, invalidateQueries } = renderRefreshHook({ isRunning: true });

    rerender({ isRunning: false });

    expect(invalidateQueries).not.toHaveBeenCalled();
  });
});
