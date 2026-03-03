/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { renderWithKibanaRenderContext } from '@kbn/test-jest-helpers';
import { screen } from '@testing-library/react';
import type { RunningQuery } from '../../../common/types';
import { QueryDetailFlyout } from './query_detail_flyout';
import { useRunningQueriesAppContext, type RunningQueriesAppContextValue } from '../app_context';

jest.mock('../app_context', () => ({
  __esModule: true,
  useRunningQueriesAppContext: jest.fn(),
}));

const mockUseRunningQueriesAppContext = useRunningQueriesAppContext as jest.MockedFunction<
  typeof useRunningQueriesAppContext
>;

const createQuery = (overrides: Partial<RunningQuery> = {}): RunningQuery => ({
  taskId: 'node1:123',
  queryType: 'DSL',
  source: 'Discover',
  startTime: Date.now() - 60_000,
  indices: 1,
  query: '{"query":{"match_all":{}}}',
  cancellable: true,
  cancelled: false,
  ...overrides,
});

describe('QueryDetailFlyout', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Inspect in Discover button when traceId and locator are available', async () => {
    const query = createQuery({ traceId: 'trace-123' });
    const discoverLocator = {
      getRedirectUrl: jest.fn(() => '/app/discover#/?_a=()'),
      navigate: jest.fn(),
    };

    mockUseRunningQueriesAppContext.mockReturnValue({
      chrome: {} as any,
      http: {} as any,
      notifications: {} as any,
      apiService: {} as any,
      url: {
        locators: {
          get: jest.fn(() => discoverLocator),
        },
      } as any,
      capabilities: {
        canCancelTasks: true,
        canViewTasks: true,
        isLoading: false,
        missingClusterPrivileges: [],
      },
    } as RunningQueriesAppContextValue);

    renderWithKibanaRenderContext(
      <QueryDetailFlyout
        query={query}
        isStopRequested={false}
        onClose={() => {}}
        onStopQuery={() => {}}
      />
    );

    expect(
      await screen.findByTestId('runningQueriesFlyoutInspectInDiscoverButton')
    ).toBeInTheDocument();
  });
});
