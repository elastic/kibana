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
import { useViewKi } from './use_view_ki';

const renderUseViewKi = (
  core: CoreStart,
  args: { aiIndexId: string; kiId: string; index: string; enabled?: boolean }
) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      KibanaContextProvider,
      { services: core },
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    );

  return renderHook(() => useViewKi(args), { wrapper });
};

describe('useViewKi', () => {
  it('fetches with active and deleted lifecycle statuses when enabled', async () => {
    const core = coreMock.createStart();
    const response = {
      id: 'ki-1',
      document: { type: 'playbook', title: 'Refund playbook' },
    };
    (core.http.get as jest.Mock).mockResolvedValue(response);

    const { result } = renderUseViewKi(core, {
      aiIndexId: 'sample-ki',
      kiId: 'ki-1',
      index: 'ai-index-idx-sample-ki',
    });

    await waitFor(() => expect(result.current.ki).toEqual(response));
    expect(core.http.get).toHaveBeenCalledWith(
      '/internal/context_engine/ai_index/sample-ki/kis/ki-1',
      expect.objectContaining({
        version: '1',
        query: {
          index: 'ai-index-idx-sample-ki',
          lifecycle_status: ['active', 'deleted'],
        },
      })
    );
  });

  it('does not fetch when index is empty', () => {
    const core = coreMock.createStart();

    renderUseViewKi(core, {
      aiIndexId: 'sample-ki',
      kiId: 'ki-1',
      index: '',
    });

    expect(core.http.get).not.toHaveBeenCalled();
  });
});
