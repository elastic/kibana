/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { useConditionFieldNames, type ConditionFieldsSource } from './use_condition_field_names';
import type { EpisodeSearchField } from '../types/episode_data_source';

const makeField = (name: string): EpisodeSearchField => ({
  name,
  type: 'string',
  esTypes: ['keyword'],
  searchable: true,
  aggregatable: true,
});

const wrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);
};

const http = httpServiceMock.createStartContract();

const makeSource = (
  fetchSearchFields: ConditionFieldsSource['fetchSearchFields']
): ConditionFieldsSource => ({ id: 'classic-alerts', fetchSearchFields });

describe('useConditionFieldNames', () => {
  it('returns the source fields as sorted condition field names', async () => {
    const dataSource = makeSource(jest.fn().mockResolvedValue([makeField('host.name')]));

    const { result } = renderHook(() => useConditionFieldNames({ http, dataSource }), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.fieldNames).toEqual(['host.name']);
  });

  it('keeps the empty list referentially stable across renders while the fields are pending', () => {
    const dataSource = makeSource(jest.fn().mockReturnValue(new Promise(() => {})));

    const { result, rerender } = renderHook(() => useConditionFieldNames({ http, dataSource }), {
      wrapper: wrapper(),
    });

    const firstRender = result.current.fieldNames;
    rerender();

    expect(result.current.fieldNames).toHaveLength(0);
    expect(result.current.fieldNames).toBe(firstRender);
  });

  it('keeps the empty list referentially stable across renders after the fields fail to load', async () => {
    const dataSource = makeSource(jest.fn().mockRejectedValue(new Error('boom')));

    const { result, rerender } = renderHook(() => useConditionFieldNames({ http, dataSource }), {
      wrapper: wrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const firstRender = result.current.fieldNames;
    rerender();

    expect(result.current.fieldNames).toBe(firstRender);
  });
});
