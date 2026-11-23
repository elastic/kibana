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
import type { KiListItem } from '../../../common/http_api/knowledge_indicators';
import { useListKiByType } from './use_list_ki_by_type';

type Args = Parameters<typeof useListKiByType>[0];

const ki = (id: string): KiListItem => ({
  id,
  index: 'ai-index-idx-support',
  type: 'faq',
  title: id,
  status: 'active',
});

const listResponse = (kis: KiListItem[]) => ({
  kis,
  total: kis.length,
  summary: { total: kis.length, counts_by_type: [] },
});

const baseArgs: Args = {
  aiIndexId: 'support',
  sizesByType: { faq: 50 },
  status: ['active'],
  sort: 'updated',
};

const renderUseListKiByType = (core: CoreStart, args: Args) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    React.createElement(
      KibanaContextProvider,
      { services: core },
      React.createElement(QueryClientProvider, { client: queryClient }, children)
    );

  return renderHook((props: Args) => useListKiByType(props), { wrapper, initialProps: args });
};

describe('useListKiByType', () => {
  it('requests nothing when no group asked for more', () => {
    const core = coreMock.createStart();

    const { result } = renderUseListKiByType(core, { ...baseArgs, sizesByType: {} });

    expect(result.current).toEqual({});
    expect(core.http.get).not.toHaveBeenCalled();
  });

  it('requests each type with its size, the filters and the sort', async () => {
    const core = coreMock.createStart();
    (core.http.get as jest.Mock).mockResolvedValue(listResponse([ki('faq-1')]));

    const { result } = renderUseListKiByType(core, {
      ...baseArgs,
      query: 'refund',
      sort: 'title',
    });

    await waitFor(() => expect(result.current.faq?.kis).toEqual([ki('faq-1')]));
    expect(core.http.get).toHaveBeenCalledWith(
      '/internal/context_engine/ai_index/support/kis',
      expect.objectContaining({
        query: { size: 50, type: 'faq', query: 'refund', status: ['active'], sort: 'title' },
      })
    );
  });

  it('keeps the shown rows while a bigger page of the same type loads', async () => {
    const core = coreMock.createStart();
    (core.http.get as jest.Mock)
      .mockResolvedValueOnce(listResponse([ki('faq-1'), ki('faq-2')]))
      .mockReturnValueOnce(new Promise(() => {}));

    const { result, rerender } = renderUseListKiByType(core, baseArgs);
    await waitFor(() => expect(result.current.faq?.kis).toHaveLength(2));

    rerender({ ...baseArgs, sizesByType: { faq: 75 } });

    await waitFor(() => expect(result.current.faq?.isFetching).toBe(true));
    expect(result.current.faq?.kis).toEqual([ki('faq-1'), ki('faq-2')]);
  });

  it('does not reuse rows loaded with other filters', async () => {
    const core = coreMock.createStart();
    (core.http.get as jest.Mock)
      .mockResolvedValueOnce(listResponse([ki('faq-1')]))
      .mockReturnValueOnce(new Promise(() => {}));

    const { result, rerender } = renderUseListKiByType(core, baseArgs);
    await waitFor(() => expect(result.current.faq?.kis).toHaveLength(1));

    rerender({ ...baseArgs, status: ['deleted'] });

    await waitFor(() => expect(result.current.faq?.isFetching).toBe(true));
    expect(result.current.faq?.kis).toBeUndefined();
  });

  it('shows one error toast for a failed request and sends it again on retry', async () => {
    const core = coreMock.createStart();
    const requestError = new Error('Request timed out');
    (core.http.get as jest.Mock)
      .mockRejectedValueOnce(requestError)
      .mockResolvedValueOnce(listResponse([ki('faq-1')]));

    const { result, rerender } = renderUseListKiByType(core, baseArgs);

    await waitFor(() => expect(result.current.faq?.isError).toBe(true));
    rerender(baseArgs);
    expect(core.notifications.toasts.addError).toHaveBeenCalledTimes(1);
    expect(core.notifications.toasts.addError).toHaveBeenCalledWith(
      requestError,
      expect.objectContaining({
        title: 'Unable to load more Knowledge documents',
        toastMessage: 'Request timed out',
      })
    );

    act(() => result.current.faq?.retry());

    await waitFor(() => expect(result.current.faq?.kis).toEqual([ki('faq-1')]));
    expect(result.current.faq?.isError).toBe(false);
    expect(core.http.get).toHaveBeenCalledTimes(2);
  });
});
