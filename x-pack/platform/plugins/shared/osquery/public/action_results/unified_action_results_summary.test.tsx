/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { EuiThemeComputed } from '@elastic/eui';
import { EuiProvider } from '@elastic/eui';
import { ThemeProvider } from '@emotion/react';

import { UnifiedActionResultsSummary } from './unified_action_results_summary';
import * as useActionResultsHook from './use_action_results';
import { useKibana } from '../common/lib/kibana';

jest.mock('./use_action_results');
jest.mock('../common/lib/kibana');
jest.mock('./use_action_results_data_view', () => ({
  useActionResultsDataView: () => ({ id: 'osquery-status-dv' }),
}));
jest.mock('@kbn/unified-data-table', () => ({
  UnifiedDataTable: () => <div data-test-subj="unifiedDataTable" />,
  DataLoadingState: { loading: 'loading', loaded: 'loaded' },
  DataGridDensity: { EXPANDED: 'expanded' },
}));
jest.mock('@kbn/cell-actions', () => ({
  CellActionsProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const useKibanaMock = useKibana as jest.MockedFunction<typeof useKibana>;
const useActionResultsMock = useActionResultsHook.useActionResults as jest.MockedFunction<
  typeof useActionResultsHook.useActionResults
>;

const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false, cacheTime: 0 } },
  });

const mockHttpPost = jest.fn();

const mockKibanaServices = () => {
  useKibanaMock.mockReturnValue({
    services: {
      http: { post: mockHttpPost },
      application: { getUrlForApp: jest.fn().mockReturnValue('/app/fleet') },
      notifications: { toasts: { addError: jest.fn() } },
      appName: 'osquery',
      theme: {},
      uiSettings: {},
      data: { fieldFormats: {}, dataViews: { create: jest.fn() } },
      uiActions: { getTriggerCompatibleActions: jest.fn() },
    },
  } as unknown as ReturnType<typeof useKibana>);
};

const renderWithContext = (Element: React.ReactElement) =>
  render(
    <EuiProvider>
      <ThemeProvider
        theme={{
          euiTheme: {
            colors: { lightestShade: '#fff', success: '#00BFB3' },
            border: { width: { thin: '1px', thick: '2px' } },
          } as unknown as EuiThemeComputed<{}>,
        }}
      >
        <IntlProvider locale="en">
          <QueryClientProvider client={createTestQueryClient()}>{Element}</QueryClientProvider>
        </IntlProvider>
      </ThemeProvider>
    </EuiProvider>
  );

describe('UnifiedActionResultsSummary - Pagination', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibanaServices();
  });

  it('disables Next on a scheduled-query single-page result set', async () => {
    // Regression coverage for #269670 on the unified (UnifiedDataTable + EuiTablePagination) path.
    // Scheduled queries do not pass agentIds; `data.total` from the server must drive pageCount
    // so Next is disabled when total ≤ pageSize. Before the fix, totalItemCount fell back to
    // `agentIds?.length ?? 0`, yielding pageCount=0 and an enabled Next that opened an empty page.
    useActionResultsMock.mockReturnValue({
      data: {
        edges: [],
        total: 1,
        aggregations: {
          totalRowCount: 1,
          totalResponded: 1,
          successful: 1,
          failed: 0,
          pending: 0,
        },
        inspect: { dsl: [] },
      },
      isLoading: false,
      isFetching: false,
    } as never);

    mockHttpPost.mockResolvedValue({ agents: [] });

    const { container } = renderWithContext(
      <UnifiedActionResultsSummary
        actionId="test-schedule"
        scheduleId="test-schedule"
        executionCount={1}
      />
    );

    await waitFor(() => {
      expect(container.querySelector('[data-test-subj="unifiedDataTable"]')).toBeInTheDocument();
    });

    const nextButton = container.querySelector(
      '[data-test-subj="pagination-button-next"]'
    ) as HTMLButtonElement | null;
    // EuiTablePagination must render Next as disabled when pageCount=1 and activePage=0.
    // If Next is omitted entirely that's also acceptable — what must NOT happen is an enabled
    // Next that opens an empty page.
    if (nextButton) {
      expect(nextButton.disabled).toBe(true);
    }
  });

  it('derives pageCount from data.total, not agentIds.length, for scheduled queries', async () => {
    // 502 total with default page size 20 → 26 pages of numbered page buttons.
    // Pre-fix, `totalItemCount = agentIds?.length ?? 0` was 0 for scheduled queries, so
    // EuiPagination rendered no numbered page buttons at all.
    useActionResultsMock.mockReturnValue({
      data: {
        edges: [],
        total: 502,
        aggregations: {
          totalRowCount: 30,
          totalResponded: 2,
          successful: 2,
          failed: 0,
          pending: 500,
        },
        inspect: { dsl: [] },
      },
      isLoading: false,
      isFetching: false,
    } as never);

    mockHttpPost.mockResolvedValue({ agents: [] });

    const { container } = renderWithContext(
      <UnifiedActionResultsSummary
        actionId="test-schedule"
        scheduleId="test-schedule"
        executionCount={1}
      />
    );

    await waitFor(() => {
      expect(container.querySelector('[data-test-subj="unifiedDataTable"]')).toBeInTheDocument();
    });

    // EuiPagination renders numbered buttons `pagination-button-<index>` only when pageCount>0.
    // With the fix, page index 1 is present; pre-fix, no numbered buttons render.
    expect(container.querySelector('[data-test-subj="pagination-button-1"]')).toBeInTheDocument();
    const nextButton = container.querySelector(
      '[data-test-subj="pagination-button-next"]'
    ) as HTMLButtonElement | null;
    expect(nextButton).not.toBeNull();
    expect(nextButton!.disabled).toBe(false);
  });
});
