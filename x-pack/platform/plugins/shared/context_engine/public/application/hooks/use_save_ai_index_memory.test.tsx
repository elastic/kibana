/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { act, renderHook } from '@testing-library/react';
import React from 'react';
import { AI_INDEX_API_VERSION } from '../../../common/constants';
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import { useSaveAiIndexMemory } from './use_save_ai_index_memory';

const aiIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  description: 'Support knowledge',
  managed: false,
  memory_enabled: true,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [{ type: 'workflow', value: 'workflow-1' }],
  sources: [{ type: 'esql', value: 'FROM support-cases' }],
  traces: [{ type: 'index', value: 'logs-*', query: 'FROM logs-*' }],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-02T00:00:00.000Z',
};

describe('useSaveAiIndexMemory', () => {
  it('updates memory while preserving all other writable properties', async () => {
    const services = coreMock.createStart();
    services.http.put.mockResolvedValue({ status: 'updated' });
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <KibanaContextProvider services={services}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </KibanaContextProvider>
    );
    const { result } = renderHook(() => useSaveAiIndexMemory(), { wrapper });

    let saved = false;
    await act(async () => {
      saved = await result.current.saveMemoryEnabled(aiIndex, false);
    });

    expect(saved).toBe(true);
    expect(services.http.put).toHaveBeenCalledWith('/api/context_engine/ai_index/my-ai-index', {
      version: AI_INDEX_API_VERSION,
      body: JSON.stringify({
        description: 'Support knowledge',
        memory_enabled: false,
        dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
        automations: [{ type: 'workflow', value: 'workflow-1' }],
        sources: [{ type: 'esql', value: 'FROM support-cases' }],
        traces: [{ type: 'index', value: 'logs-*' }],
      }),
    });
  });
});
