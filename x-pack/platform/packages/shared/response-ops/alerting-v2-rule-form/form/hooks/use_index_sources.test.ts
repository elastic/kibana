/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { getESQLSources } from '@kbn/esql-utils';
import { SOURCES_TYPES } from '@kbn/esql-types';
import type { EsqlDatasetsResult } from '@kbn/esql-types';
import { createQueryClientWrapper } from '../../test_utils';
import { useIndexSources } from './use_index_sources';

jest.mock('@kbn/esql-utils');

const mockGetESQLSources = jest.mocked(getESQLSources);

describe('useIndexSources', () => {
  let http: ReturnType<typeof httpServiceMock.createStartContract>;
  let application: ReturnType<typeof applicationServiceMock.createStartContract>;

  beforeEach(() => {
    jest.clearAllMocks();
    http = httpServiceMock.createStartContract();
    application = applicationServiceMock.createStartContract();
  });

  it('fetches and maps sources to combo box options', async () => {
    mockGetESQLSources.mockResolvedValue([
      { name: 'logs-*', hidden: false },
      { name: 'metrics-*', hidden: false },
    ]);

    const { result } = renderHook(() => useIndexSources({ http, application }), {
      wrapper: createQueryClientWrapper(),
    });

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([{ label: 'logs-*' }, { label: 'metrics-*' }]);
    expect(mockGetESQLSources).toHaveBeenCalledWith({ application, http }, undefined);
  });

  it('filters out hidden sources', async () => {
    mockGetESQLSources.mockResolvedValue([
      { name: 'logs-*', hidden: false },
      { name: '.internal-index', hidden: true },
      { name: 'metrics-*', hidden: false },
    ]);

    const { result } = renderHook(() => useIndexSources({ http, application }), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([{ label: 'logs-*' }, { label: 'metrics-*' }]);
  });

  it('filters out integration sources', async () => {
    mockGetESQLSources.mockResolvedValue([
      { name: 'logs-*', hidden: false, type: SOURCES_TYPES.INDEX },
      { name: 'nginx', hidden: false, type: SOURCES_TYPES.INTEGRATION },
      { name: 'apache', hidden: false, type: SOURCES_TYPES.INTEGRATION },
      { name: 'metrics-apm.*', hidden: false, type: SOURCES_TYPES.DATA_STREAM },
    ]);

    const { result } = renderHook(() => useIndexSources({ http, application }), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([{ label: 'logs-*' }, { label: 'metrics-apm.*' }]);
  });

  it('returns empty array when getESQLSources fails', async () => {
    mockGetESQLSources.mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useIndexSources({ http, application }), {
      wrapper: createQueryClientWrapper(),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual([]);
  });

  it('returns empty array while loading', () => {
    mockGetESQLSources.mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useIndexSources({ http, application }), {
      wrapper: createQueryClientWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toEqual([]);
  });

  describe('with getDatasets', () => {
    it('merges federated datasets into the options list', async () => {
      mockGetESQLSources.mockResolvedValue([{ name: 'logs-*', hidden: false }]);
      const mockGetDatasets = jest.fn<Promise<EsqlDatasetsResult>, []>().mockResolvedValue({
        datasets: [
          { name: 'federation.orders', data_source: 's3', resource: 'orders' },
          { name: 'federation.customers', data_source: 's3', resource: 'customers' },
        ],
      });

      const { result } = renderHook(
        () => useIndexSources({ http, application, getDatasets: mockGetDatasets }),
        { wrapper: createQueryClientWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([
        { label: 'logs-*' },
        { label: 'federation.orders' },
        { label: 'federation.customers' },
      ]);
    });

    it('deduplicates datasets that share a name with an existing index', async () => {
      mockGetESQLSources.mockResolvedValue([{ name: 'logs-*', hidden: false }]);
      const mockGetDatasets = jest.fn<Promise<EsqlDatasetsResult>, []>().mockResolvedValue({
        datasets: [
          { name: 'logs-*', data_source: 's3', resource: 'logs' },
          { name: 'federation.events', data_source: 's3', resource: 'events' },
        ],
      });

      const { result } = renderHook(
        () => useIndexSources({ http, application, getDatasets: mockGetDatasets }),
        { wrapper: createQueryClientWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([{ label: 'logs-*' }, { label: 'federation.events' }]);
    });

    it('returns only index options when getDatasets resolves with an empty list', async () => {
      mockGetESQLSources.mockResolvedValue([{ name: 'logs-*', hidden: false }]);
      const mockGetDatasets = jest
        .fn<Promise<EsqlDatasetsResult>, []>()
        .mockResolvedValue({ datasets: [] });

      const { result } = renderHook(
        () => useIndexSources({ http, application, getDatasets: mockGetDatasets }),
        { wrapper: createQueryClientWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([{ label: 'logs-*' }]);
    });

    it('returns only datasets when getESQLSources fails', async () => {
      mockGetESQLSources.mockRejectedValue(new Error('Sources unavailable'));
      const mockGetDatasets = jest.fn<Promise<EsqlDatasetsResult>, []>().mockResolvedValue({
        datasets: [{ name: 'federation.orders', data_source: 's3', resource: 'orders' }],
      });

      const { result } = renderHook(
        () => useIndexSources({ http, application, getDatasets: mockGetDatasets }),
        { wrapper: createQueryClientWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([{ label: 'federation.orders' }]);
    });

    it('returns only index options when getDatasets fails', async () => {
      mockGetESQLSources.mockResolvedValue([{ name: 'logs-*', hidden: false }]);
      const mockGetDatasets = jest
        .fn<Promise<EsqlDatasetsResult>, []>()
        .mockRejectedValue(new Error('Datasets unavailable'));

      const { result } = renderHook(
        () => useIndexSources({ http, application, getDatasets: mockGetDatasets }),
        { wrapper: createQueryClientWrapper() }
      );

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.data).toEqual([{ label: 'logs-*' }]);
    });
  });
});
