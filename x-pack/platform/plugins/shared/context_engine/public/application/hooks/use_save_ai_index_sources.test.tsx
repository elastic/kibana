/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart } from '@kbn/core/public';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import type { SelectedSource } from '../components/ai_index_detail/sources/types';
import { contextEngineQueryKeys } from './query_keys';
import { useSaveAiIndexSources } from './use_save_ai_index_sources';

const aiIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [],
  sources: [{ type: 'esql', value: 'FROM logs-*' }],
  traces: [
    { type: 'index', value: 'logs-*', query: 'FROM logs-*' },
    { type: 'elastic_agent', value: 'my-agent', query: 'FROM traces-agent_builder.otel-default' },
  ],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const selectedSources: SelectedSource[] = [
  { type: 'esql', value: 'FROM logs-*' },
  { type: 'connector', value: 'connector-1' },
];

const putPropertiesBody = JSON.stringify({
  dest: aiIndex.dest,
  automations: [],
  sources: [
    { type: 'esql', value: 'FROM logs-*' },
    { type: 'connector', value: 'connector-1' },
  ],
  traces: [
    { type: 'index', value: 'logs-*' },
    { type: 'elastic_agent', value: 'my-agent' },
  ],
});

const renderUseSaveAiIndexSources = (core: CoreStart) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  jest.spyOn(queryClient, 'invalidateQueries');
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nProvider>
      <QueryClientProvider client={queryClient}>
        <KibanaContextProvider services={core}>{children}</KibanaContextProvider>
      </QueryClientProvider>
    </I18nProvider>
  );

  return { ...renderHook(() => useSaveAiIndexSources(), { wrapper }), queryClient, core };
};

describe('useSaveAiIndexSources', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('PUTs mapped sources while keeping the other writable properties', async () => {
    const core = coreMock.createStart();
    core.http.put.mockResolvedValue({ status: 'updated' });

    const { result } = renderUseSaveAiIndexSources(core);

    let saved = false;
    await act(async () => {
      saved = await result.current.saveSources(aiIndex, selectedSources);
    });

    expect(saved).toBe(true);
    expect(core.http.put).toHaveBeenCalledWith(
      '/api/context_engine/ai_index/my-ai-index',
      expect.objectContaining({ body: putPropertiesBody })
    );
  });

  it('invalidates the AI index list after a successful save', async () => {
    const core = coreMock.createStart();
    core.http.put.mockResolvedValue({ status: 'updated' });

    const { result, queryClient } = renderUseSaveAiIndexSources(core);

    await act(async () => {
      await result.current.saveSources(aiIndex, selectedSources);
    });

    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: contextEngineQueryKeys.aiIndex.list(),
    });
  });

  it('shows a warning toast naming what the save did not do, and still reports it saved', async () => {
    const core = coreMock.createStart();
    core.http.put.mockResolvedValue({
      status: 'updated',
      warnings: [
        {
          source: { type: 'esql', value: 'FROM   logs-*\n| LIMIT 10' },
          message: 'No index matching logs-* was found, or you do not have read access to it.',
        },
        {
          source: { type: 'esql', value: 'FROM orders' },
          message: 'The index metadata automation could not be installed: workflows unavailable',
        },
      ],
    });

    const { result } = renderUseSaveAiIndexSources(core);

    let saved = false;
    await act(async () => {
      saved = await result.current.saveSources(aiIndex, selectedSources);
    });

    expect(saved).toBe(true);
    expect(core.notifications.toasts.addWarning).toHaveBeenCalledWith({
      title: 'Sources saved, but some automations were not updated',
      text: 'FROM logs-* | LIMIT 10: No index matching logs-* was found, or you do not have read access to it. FROM orders: The index metadata automation could not be installed: workflows unavailable.',
    });
    expect(core.notifications.toasts.addError).not.toHaveBeenCalled();
  });

  it('lists the first few warnings and counts the rest', async () => {
    const core = coreMock.createStart();
    core.http.put.mockResolvedValue({
      status: 'updated',
      warnings: ['a', 'b', 'c', 'd', 'e'].map((index) => ({
        source: { type: 'esql', value: `FROM ${index}` },
        message: 'Skipped.',
      })),
    });

    const { result } = renderUseSaveAiIndexSources(core);

    await act(async () => {
      await result.current.saveSources(aiIndex, selectedSources);
    });

    expect(core.notifications.toasts.addWarning).toHaveBeenCalledWith(
      expect.objectContaining({
        text: 'FROM a: Skipped. FROM b: Skipped. FROM c: Skipped. And 2 more.',
      })
    );
  });

  it('shows no warning toast when the save came back without warnings', async () => {
    const core = coreMock.createStart();
    core.http.put.mockResolvedValue({ status: 'updated' });

    const { result } = renderUseSaveAiIndexSources(core);

    await act(async () => {
      await result.current.saveSources(aiIndex, selectedSources);
    });

    expect(core.notifications.toasts.addWarning).not.toHaveBeenCalled();
  });

  it('returns false and shows an error toast when the PUT fails', async () => {
    const core = coreMock.createStart();
    const requestError = new Error('Network error');
    core.http.put.mockRejectedValue(requestError);

    const { result } = renderUseSaveAiIndexSources(core);

    let saved = true;
    await act(async () => {
      saved = await result.current.saveSources(aiIndex, selectedSources);
    });

    expect(saved).toBe(false);
    expect(core.notifications.toasts.addError).toHaveBeenCalledWith(
      requestError,
      expect.objectContaining({
        title: 'Unable to update sources',
        toastMessage: 'Network error',
      })
    );
  });

  it('sets isSaving while the PUT is in flight', async () => {
    const core = coreMock.createStart();
    let resolvePut!: (value: { status: string }) => void;
    const putPromise = new Promise<{ status: string }>((resolve) => {
      resolvePut = resolve;
    });
    core.http.put.mockReturnValue(putPromise);

    const { result } = renderUseSaveAiIndexSources(core);

    expect(result.current.isSaving).toBe(false);

    let savePromise: Promise<boolean> = Promise.resolve(false);
    act(() => {
      savePromise = result.current.saveSources(aiIndex, selectedSources);
    });

    await waitFor(() => expect(result.current.isSaving).toBe(true));

    await act(async () => {
      resolvePut({ status: 'updated' });
      await savePromise;
    });

    await waitFor(() => expect(result.current.isSaving).toBe(false));
  });
});
