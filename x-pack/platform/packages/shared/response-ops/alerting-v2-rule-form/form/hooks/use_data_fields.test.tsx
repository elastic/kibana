/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { getESQLAdHocDataview, getESQLQueryColumnsRaw } from '@kbn/esql-utils';
import { createQueryClientWrapper } from '../../test_utils';
import { useDataFields } from './use_data_fields';

jest.mock('@kbn/esql-utils');

const mockGetESQLAdHocDataview = jest.mocked(getESQLAdHocDataview);
const mockGetESQLQueryColumnsRaw = jest.mocked(getESQLQueryColumnsRaw);

describe('useDataFields', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches fields when query is provided', async () => {
    const mockFields = {
      '@timestamp': { name: '@timestamp', type: 'date' },
      message: { name: 'message', type: 'text' },
    };
    const mockDataView = {
      getIndexPattern: () => 'logs-*',
      fields: {
        toSpec: () => mockFields,
      },
    };

    mockGetESQLAdHocDataview.mockResolvedValue(mockDataView as any);

    const http = httpServiceMock.createStartContract();
    const dataViews = dataViewPluginMocks.createStartContract();

    const { result } = renderHook(
      () =>
        useDataFields({
          query: 'FROM logs-* | LIMIT 10',
          http,
          dataViews,
        }),
      { wrapper: createQueryClientWrapper() }
    );

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual(mockFields);
    expect(result.current.error).toBeNull();
    expect(mockGetESQLAdHocDataview).toHaveBeenCalled();
  });

  it('returns empty fields when dataView is null', async () => {
    mockGetESQLAdHocDataview.mockResolvedValue(null as any);

    const http = httpServiceMock.createStartContract();
    const dataViews = dataViewPluginMocks.createStartContract();

    const { result } = renderHook(
      () =>
        useDataFields({
          query: 'FROM logs-* | LIMIT 10',
          http,
          dataViews,
        }),
      { wrapper: createQueryClientWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual({});
    expect(result.current.error).toBeNull();
  });

  it('handles errors gracefully', async () => {
    const testError = new Error('Failed to fetch data view');
    mockGetESQLAdHocDataview.mockRejectedValue(testError);

    const http = httpServiceMock.createStartContract();
    const dataViews = dataViewPluginMocks.createStartContract();

    const { result } = renderHook(
      () =>
        useDataFields({
          query: 'FROM logs-* | LIMIT 10',
          http,
          dataViews,
        }),
      { wrapper: createQueryClientWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual({});
    expect(result.current.error).toBe(testError);
  });

  describe('with search service (ES|QL column introspection path)', () => {
    const mockSearch = jest.fn();

    it('uses getESQLQueryColumnsRaw directly without dropNullColumns, skipping DataView', async () => {
      mockGetESQLQueryColumnsRaw.mockResolvedValue([
        { name: 'order_id', type: 'keyword', isNull: false },
        { name: 'amount', type: 'double', isNull: false },
        { name: 'created_at', type: 'date', isNull: false },
      ] as any);

      const http = httpServiceMock.createStartContract();
      const dataViews = dataViewPluginMocks.createStartContract();

      const { result } = renderHook(
        () =>
          useDataFields({
            query: 'FROM federation.orders',
            http,
            dataViews,
            search: mockSearch as any,
          }),
        { wrapper: createQueryClientWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual({
        order_id: { name: 'order_id', type: 'keyword', searchable: true, aggregatable: true },
        amount: { name: 'amount', type: 'double', searchable: true, aggregatable: true },
        created_at: { name: 'created_at', type: 'date', searchable: true, aggregatable: true },
      });
      expect(mockGetESQLQueryColumnsRaw).toHaveBeenCalledWith({
        esqlQuery: 'FROM federation.orders',
        search: mockSearch,
        signal: expect.any(AbortSignal),
      });
      expect(mockGetESQLAdHocDataview).not.toHaveBeenCalled();
    });

    it('propagates errors when getESQLQueryColumnsRaw throws', async () => {
      const fetchError = new Error('Unable to load columns');
      mockGetESQLQueryColumnsRaw.mockRejectedValue(fetchError);

      const http = httpServiceMock.createStartContract();
      const dataViews = dataViewPluginMocks.createStartContract();

      const { result } = renderHook(
        () =>
          useDataFields({
            query: 'FROM test_ndjson',
            http,
            dataViews,
            search: mockSearch as any,
          }),
        { wrapper: createQueryClientWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.isError).toBe(true);
      expect(result.current.error).toBe(fetchError);
      expect(result.current.data).toEqual({});
    });

    it('does not call getESQLAdHocDataview when search is provided', async () => {
      mockGetESQLQueryColumnsRaw.mockResolvedValue([
        { name: '@timestamp', type: 'date', isNull: false },
      ] as any);

      const http = httpServiceMock.createStartContract();
      const dataViews = dataViewPluginMocks.createStartContract();

      const { result } = renderHook(
        () =>
          useDataFields({
            query: 'FROM logs-*',
            http,
            dataViews,
            search: mockSearch as any,
          }),
        { wrapper: createQueryClientWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetESQLAdHocDataview).not.toHaveBeenCalled();
      expect(result.current.data).toEqual({
        '@timestamp': { name: '@timestamp', type: 'date', searchable: true, aggregatable: true },
      });
    });

    it('passes an AbortSignal to getESQLQueryColumnsRaw', async () => {
      mockGetESQLQueryColumnsRaw.mockResolvedValue([
        { name: '@timestamp', type: 'date', isNull: false },
      ] as any);

      const http = httpServiceMock.createStartContract();
      const dataViews = dataViewPluginMocks.createStartContract();

      const { result } = renderHook(
        () =>
          useDataFields({
            query: 'FROM federation.orders',
            http,
            dataViews,
            search: mockSearch as any,
          }),
        { wrapper: createQueryClientWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetESQLQueryColumnsRaw).toHaveBeenCalledWith(
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });

    it('refetches when query changes (search path)', async () => {
      mockGetESQLQueryColumnsRaw.mockResolvedValue([
        { name: '@timestamp', type: 'date', isNull: false },
      ] as any);

      const http = httpServiceMock.createStartContract();
      const dataViews = dataViewPluginMocks.createStartContract();

      const { result, rerender } = renderHook(
        ({ query }) =>
          useDataFields({
            query,
            http,
            dataViews,
            search: mockSearch as any,
          }),
        {
          initialProps: { query: 'FROM federation.orders' },
          wrapper: createQueryClientWrapper(),
        }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetESQLQueryColumnsRaw).toHaveBeenCalledTimes(1);

      rerender({ query: 'FROM federation.customers' });

      await waitFor(() => {
        expect(mockGetESQLQueryColumnsRaw).toHaveBeenCalledTimes(2);
      });
    });

    it('uses DataView field-caps when search is not provided', async () => {
      const emptyDataView = {
        getIndexPattern: () => 'logs-*',
        fields: { toSpec: () => ({}) },
      };
      mockGetESQLAdHocDataview.mockResolvedValue(emptyDataView as any);

      const http = httpServiceMock.createStartContract();
      const dataViews = dataViewPluginMocks.createStartContract();

      const { result } = renderHook(
        () =>
          useDataFields({
            query: 'FROM logs-*',
            http,
            dataViews,
          }),
        { wrapper: createQueryClientWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(mockGetESQLQueryColumnsRaw).not.toHaveBeenCalled();
      expect(mockGetESQLAdHocDataview).toHaveBeenCalled();
      expect(result.current.data).toEqual({});
    });
  });

  it('refetches when query changes', async () => {
    const mockFields = {
      '@timestamp': { name: '@timestamp', type: 'date' },
      message: { name: 'message', type: 'text' },
    };
    const mockDataView = {
      getIndexPattern: () => 'logs-*',
      fields: {
        toSpec: () => mockFields,
      },
    };
    mockGetESQLAdHocDataview.mockResolvedValue(mockDataView as any);

    const http = httpServiceMock.createStartContract();
    const dataViews = dataViewPluginMocks.createStartContract();

    const { result, rerender } = renderHook(
      ({ query }) =>
        useDataFields({
          query,
          http,
          dataViews,
        }),
      { initialProps: { query: 'FROM logs-* | LIMIT 10' }, wrapper: createQueryClientWrapper() }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockGetESQLAdHocDataview).toHaveBeenCalledTimes(1);

    // Change query
    rerender({ query: 'FROM metrics-* | LIMIT 10' });

    await waitFor(() => {
      expect(mockGetESQLAdHocDataview).toHaveBeenCalledTimes(2);
    });
  });
});
