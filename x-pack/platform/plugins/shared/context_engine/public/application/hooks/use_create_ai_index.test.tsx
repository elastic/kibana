/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { contextEngineQueryKeys } from './query_keys';
import { useCreateAiIndex } from './use_create_ai_index';

const renderUseCreateAiIndex = () => {
  const core = coreMock.createStart();
  core.http.post.mockResolvedValue({ status: 'created' });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <KibanaContextProvider services={core}>{children}</KibanaContextProvider>
      </QueryClientProvider>
    </I18nProvider>
  );
  return { ...renderHook(() => useCreateAiIndex(), { wrapper }), queryClient };
};

describe('useCreateAiIndex', () => {
  it('drops data cached for a deleted AI index with the same id, and keeps other AI indices', async () => {
    const { result, queryClient } = renderUseCreateAiIndex();
    const { aiIndex, spend } = contextEngineQueryKeys;
    const oldKeys = [
      aiIndex.detail('reused'),
      aiIndex.dreaming('reused'),
      aiIndex.listKiPrefix('reused'),
      spend.aiIndex('reused'),
    ];
    [...oldKeys, aiIndex.detail('other')].forEach((queryKey) =>
      queryClient.setQueryData(queryKey, { old: true })
    );

    await act(async () => {
      await result.current.createAiIndex({ id: 'reused', description: '', sources: [] });
    });

    oldKeys.forEach((queryKey) => {
      expect(queryClient.getQueryData(queryKey)).toBeUndefined();
    });
    expect(queryClient.getQueryData(aiIndex.detail('other'))).toEqual({ old: true });
  });
});
