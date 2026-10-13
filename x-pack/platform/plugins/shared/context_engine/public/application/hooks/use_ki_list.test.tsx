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
import { useKiList } from './use_ki_list';

const renderUseKiList = (core: CoreStart, args: Parameters<typeof useKiList>[0]) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      KibanaContextProvider,
      { services: core },
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    );

  return renderHook(() => useKiList(args), { wrapper });
};

describe('useKiList', () => {
  it('shows an error toast when notifyOnError is enabled and the request fails', async () => {
    const core = coreMock.createStart();
    const requestError = new Error('Request timed out');
    (core.http.get as jest.Mock).mockRejectedValue(requestError);

    const { result } = renderUseKiList(core, {
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

    const { result } = renderUseKiList(core, {
      aiIndexId: 'my-ai-index',
    });

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });

    expect(core.notifications.toasts.addError).not.toHaveBeenCalled();
  });
});
