/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseLoadConnectorsResult } from '@kbn/inference-connectors';

/**
 * Helper function to create a properly typed mock return value for useLoadConnectors
 */
export const createMockUseLoadConnectorsResult = (
  overrides: Partial<UseLoadConnectorsResult>
): UseLoadConnectorsResult => {
  return {
    data: [],
    error: null,
    isError: false,
    isLoading: false,
    isSuccess: true,
    isFetching: false,
    isInitialLoading: false,
    isLoadingError: false,
    isRefetchError: false,
    isRefetching: false,
    isStale: false,
    isPreviousData: false,
    status: 'success',
    dataUpdatedAt: 0,
    errorUpdatedAt: 0,
    errorUpdateCount: 0,
    failureCount: 0,
    failureReason: null,
    fetchStatus: 'idle',
    isFetched: true,
    isFetchedAfterMount: true,
    isPaused: false,
    isPlaceholderData: false,
    refetch: jest.fn(),
    remove: jest.fn(),
    soEntryFound: false,
    ...overrides,
  } as UseLoadConnectorsResult;
};
