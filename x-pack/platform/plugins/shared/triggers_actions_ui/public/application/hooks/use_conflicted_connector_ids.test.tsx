/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mocked, MockedFunction } from 'vitest';

import React from 'react';
import { waitFor, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { useKibana } from '../../common/lib/kibana';
import { useSkippedPreconfiguredConnectorIds } from './use_conflicted_connector_ids';
import { getSkippedPreconfiguredConnectorIds } from '../lib/action_connector_api';

vi.mock('../../common/lib/kibana');
vi.mock('../lib/action_connector_api', async () => {
      const mocked = {
      ...(await vi.importActual('../lib/action_connector_api')),
      getSkippedPreconfiguredConnectorIds: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

const useKibanaMock = useKibana as Mocked<typeof useKibana>;
const getSkippedPreconfiguredConnectorIdsMock =
  getSkippedPreconfiguredConnectorIds as MockedFunction<
    typeof getSkippedPreconfiguredConnectorIds
  >;

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useSkippedPreconfiguredConnectorIds', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useKibanaMock().services.http = vi.fn() as any;
  });

  it('returns skipped connector IDs on success', async () => {
    getSkippedPreconfiguredConnectorIdsMock.mockResolvedValue({
      skippedPreconfiguredConnectorIds: ['connector-a', 'connector-b'],
    });

    const { result } = renderHook(() => useSkippedPreconfiguredConnectorIds(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.skippedPreconfiguredConnectorIds).toEqual(['connector-a', 'connector-b']);
    expect(result.current.isError).toBe(false);
  });

  it('returns isError and empty array when the API call fails', async () => {
    getSkippedPreconfiguredConnectorIdsMock.mockRejectedValue(new Error('Server error'));

    const { result } = renderHook(() => useSkippedPreconfiguredConnectorIds(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.skippedPreconfiguredConnectorIds).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});
