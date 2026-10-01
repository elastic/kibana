/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PropsWithChildren } from 'react';
import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useApiSelectors } from './use_api_selectors';

const Wrapper = ({ children }: PropsWithChildren) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
);

describe('useApiSelectors', () => {
  it('lists the selectors of each backend from broadest to narrowest', async () => {
    const { result } = renderHook(() => useApiSelectors(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.selectorsByTarget).toBeDefined());

    const elasticsearch = result.current.selectorsByTarget?.elasticsearch ?? [];
    const kibana = result.current.selectorsByTarget?.kibana ?? [];
    expect(elasticsearch[0]).toBe('*');
    expect(elasticsearch.indexOf('indices.*')).toBeLessThan(elasticsearch.indexOf('bulk'));
    expect(elasticsearch).toContain('indices.delete');
    expect(kibana).toContain('alerting.delete-alerting-rule-id');
    expect(result.current.isLoading).toBe(false);
  });
});
