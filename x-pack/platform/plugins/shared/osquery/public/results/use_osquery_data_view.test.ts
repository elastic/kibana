/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { MockedFunction } from 'vitest';

import { renderHook, waitFor } from '@testing-library/react';
import { useKibana } from '../common/lib/kibana';
import { useOsqueryDataView } from './use_osquery_data_view';
import React from 'react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';

vi.mock('../common/lib/kibana');

const useKibanaMock = useKibana as MockedFunction<typeof useKibana>;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) =>
    React.createElement(QueryClientProvider, { client: queryClient }, children);

  return Wrapper;
};

const mockDataView = { id: 'dv-1', title: 'logs-osquery_manager.result*' };

describe('useOsqueryDataView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a found data view', async () => {
    useKibanaMock.mockReturnValue({
      services: {
        data: {
          dataViews: {
            find: vi.fn().mockResolvedValue([mockDataView]),
            getCanSaveSync: vi.fn().mockReturnValue(false),
            createAndSave: vi.fn(),
            create: vi.fn(),
          },
        },
      },
    } as any);

    const { result } = renderHook(() => useOsqueryDataView(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.dataView).toBe(mockDataView);
  });

  it('creates and saves when find returns empty and user can save', async () => {
    const createdDv = { id: 'dv-new', title: 'logs-osquery_manager.result*' };
    useKibanaMock.mockReturnValue({
      services: {
        data: {
          dataViews: {
            find: vi.fn().mockResolvedValue([]),
            getCanSaveSync: vi.fn().mockReturnValue(true),
            createAndSave: vi.fn().mockResolvedValue(createdDv),
            create: vi.fn(),
          },
        },
      },
    } as any);

    const { result } = renderHook(() => useOsqueryDataView(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.dataView).toBe(createdDv);
  });

  it('falls back to ad-hoc create when user cannot save', async () => {
    const adhocDv = { id: 'dv-adhoc', title: 'logs-osquery_manager.result*' };
    useKibanaMock.mockReturnValue({
      services: {
        data: {
          dataViews: {
            find: vi.fn().mockResolvedValue([]),
            getCanSaveSync: vi.fn().mockReturnValue(false),
            createAndSave: vi.fn(),
            create: vi.fn().mockResolvedValue(adhocDv),
          },
        },
      },
    } as any);

    const { result } = renderHook(() => useOsqueryDataView(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.dataView).toBe(adhocDv);
  });

  it('is disabled when skip is true', () => {
    useKibanaMock.mockReturnValue({
      services: {
        data: {
          dataViews: {
            find: vi.fn(),
            getCanSaveSync: vi.fn().mockReturnValue(false),
            createAndSave: vi.fn(),
            create: vi.fn(),
          },
        },
      },
    } as any);

    const { result } = renderHook(() => useOsqueryDataView({ skip: true }), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
  });
});
