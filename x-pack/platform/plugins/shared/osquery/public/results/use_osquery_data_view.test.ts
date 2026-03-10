/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { QueryClientProvider, QueryClient } from '@kbn/react-query';
import type { DataView } from '@kbn/data-plugin/common';
import { useKibana } from '../common/lib/kibana';
import { useOsqueryDataView } from './use_osquery_data_view';

jest.mock('../common/lib/kibana');

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;

const createWrapper = (queryClient: QueryClient) => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return Wrapper;
};

const EXPECTED_TITLE = 'logs-osquery_manager.result*';

describe('useOsqueryDataView', () => {
  let mockDataViews: {
    find: jest.Mock;
    createAndSave: jest.Mock;
    create: jest.Mock;
    getCanSaveSync: jest.Mock;
  };
  let queryClient: QueryClient;

  const mockDataView = { id: 'dv-1', title: EXPECTED_TITLE } as unknown as DataView;

  beforeEach(() => {
    jest.clearAllMocks();
    mockDataViews = {
      find: jest.fn(),
      createAndSave: jest.fn(),
      create: jest.fn(),
      getCanSaveSync: jest.fn().mockReturnValue(true),
    };
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
      logger: { log: () => null, warn: () => null, error: () => null },
    });

    useKibanaMock.mockReturnValue({
      services: {
        data: { dataViews: mockDataViews },
      },
    } as unknown as ReturnType<typeof useKibana>);
  });

  it('returns existing DataView when found', async () => {
    mockDataViews.find.mockResolvedValue([mockDataView]);

    const { result } = renderHook(() => useOsqueryDataView(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.dataView).toBe(mockDataView);
    expect(mockDataViews.find).toHaveBeenCalledWith(EXPECTED_TITLE, 1);
    expect(mockDataViews.createAndSave).not.toHaveBeenCalled();
  });

  it('creates and saves DataView when not found and has permissions', async () => {
    mockDataViews.find.mockResolvedValue([]);
    mockDataViews.getCanSaveSync.mockReturnValue(true);
    const createdDv = { id: 'dv-new', title: EXPECTED_TITLE } as unknown as DataView;
    mockDataViews.createAndSave.mockResolvedValue(createdDv);

    const { result } = renderHook(() => useOsqueryDataView(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.dataView).toBe(createdDv);
    expect(mockDataViews.createAndSave).toHaveBeenCalledWith({
      title: EXPECTED_TITLE,
      timeFieldName: '@timestamp',
    });
  });

  it('creates ad-hoc DataView when save fails', async () => {
    mockDataViews.find.mockResolvedValue([]);
    mockDataViews.getCanSaveSync.mockReturnValue(true);
    mockDataViews.createAndSave.mockRejectedValue(new Error('save failed'));
    const adhocDv = { id: 'dv-adhoc', title: EXPECTED_TITLE } as unknown as DataView;
    mockDataViews.create.mockResolvedValue(adhocDv);

    const { result } = renderHook(() => useOsqueryDataView(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.dataView).toBe(adhocDv);
    expect(mockDataViews.create).toHaveBeenCalledWith({
      title: EXPECTED_TITLE,
      timeFieldName: '@timestamp',
    });
  });

  it('returns undefined when all creation paths fail', async () => {
    mockDataViews.find.mockRejectedValue(new Error('find failed'));
    mockDataViews.getCanSaveSync.mockReturnValue(false);
    mockDataViews.create.mockRejectedValue(new Error('create failed'));

    const { result } = renderHook(() => useOsqueryDataView(), {
      wrapper: createWrapper(queryClient),
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.dataView).toBeUndefined();
  });

  it('skip prevents data fetching', async () => {
    renderHook(() => useOsqueryDataView({ skip: true }), {
      wrapper: createWrapper(queryClient),
    });

    // Give a tick for any potential async work
    await new Promise((resolve) => setTimeout(resolve, 100));

    expect(mockDataViews.find).not.toHaveBeenCalled();
    expect(mockDataViews.createAndSave).not.toHaveBeenCalled();
    expect(mockDataViews.create).not.toHaveBeenCalled();
  });
});
