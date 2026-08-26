/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  // `loadingState` is surfaced as an attribute so the live-polling flag it is derived from
  // can be asserted without the real grid.
  UnifiedDataTable: ({ loadingState }: { loadingState: string }) => (
    <div data-test-subj="unifiedDataTable" data-loading-state={loadingState} />
  ),
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

const mockActionResults = ({
  total,
  totalResponded,
}: {
  total: number;
  totalResponded: number;
}) => {
  useActionResultsMock.mockReturnValue({
    data: {
      edges: [],
      total,
      aggregations: {
        totalRowCount: totalResponded * 10,
        totalResponded,
        successful: totalResponded,
        failed: 0,
        pending: total - totalResponded,
      },
      inspect: { dsl: [] },
    },
    isLoading: false,
    isFetching: false,
  } as never);
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

  it('requests the first page with the default page size on mount', () => {
    mockActionResults({ total: 100, totalResponded: 20 });

    renderWithContext(
      <UnifiedActionResultsSummary
        actionId="test-schedule"
        scheduleId="test-schedule"
        executionCount={1}
      />
    );

    expect(useActionResultsMock).toHaveBeenCalledWith(
      expect.objectContaining({ activePage: 0, limit: 20 })
    );
  });

  it('resets to the first page when the page size changes', async () => {
    mockActionResults({ total: 502, totalResponded: 2 });

    const { container } = renderWithContext(
      <UnifiedActionResultsSummary
        actionId="test-schedule"
        scheduleId="test-schedule"
        executionCount={1}
      />
    );

    fireEvent.click(container.querySelector('[data-test-subj="pagination-button-1"]')!);

    expect(useActionResultsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ activePage: 1, limit: 20 })
    );

    fireEvent.click(screen.getByTestId('tablePaginationPopoverButton'));
    fireEvent.click(await screen.findByTestId('tablePagination-50-rows'));

    // A larger page size invalidates the current offset, so the request must go back to page 0.
    expect(useActionResultsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ activePage: 0, limit: 50 })
    );
  });
});

describe('UnifiedActionResultsSummary - Live polling', () => {
  const agentIds = ['agent-1', 'agent-2'];

  beforeEach(() => {
    jest.clearAllMocks();
    mockKibanaServices();
  });

  it('stays live while some agents have not responded yet', async () => {
    mockActionResults({ total: 2, totalResponded: 1 });

    const { container } = renderWithContext(
      <UnifiedActionResultsSummary actionId="test-action" agentIds={agentIds} />
    );

    await waitFor(() => {
      expect(container.querySelector('[data-test-subj="unifiedDataTable"]')).toBeInTheDocument();
    });

    expect(container.querySelector('.euiProgress')).toBeInTheDocument();
    expect(container.querySelector('[data-test-subj="unifiedDataTable"]')).toHaveAttribute(
      'data-loading-state',
      'loading'
    );
    // `isLive` drives `refetchInterval` in useActionResults; it must still be true here.
    expect(useActionResultsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ isLive: true })
    );
  });

  it('stops being live once every agent has responded', async () => {
    mockActionResults({ total: 2, totalResponded: 2 });

    const { container } = renderWithContext(
      <UnifiedActionResultsSummary actionId="test-action" agentIds={agentIds} />
    );

    await waitFor(() => {
      expect(container.querySelector('.euiProgress')).not.toBeInTheDocument();
    });

    expect(container.querySelector('[data-test-subj="unifiedDataTable"]')).toHaveAttribute(
      'data-loading-state',
      'loaded'
    );
    // Without this the results page keeps polling every 5s after the live query completed.
    expect(useActionResultsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ isLive: false })
    );
  });

  it('stops being live once the action has expired, even with pending agents', async () => {
    mockActionResults({ total: 2, totalResponded: 1 });

    const { container } = renderWithContext(
      <UnifiedActionResultsSummary
        actionId="test-action"
        agentIds={agentIds}
        expirationDate="2020-01-01T00:00:00.000Z"
      />
    );

    await waitFor(() => {
      expect(container.querySelector('.euiProgress')).not.toBeInTheDocument();
    });

    expect(useActionResultsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ isLive: false })
    );
  });

  it('stops being live when the action reported an error', async () => {
    mockActionResults({ total: 2, totalResponded: 1 });

    const { container } = renderWithContext(
      <UnifiedActionResultsSummary
        actionId="test-action"
        agentIds={agentIds}
        error="rate limit exceeded"
      />
    );

    await waitFor(() => {
      expect(container.querySelector('.euiProgress')).not.toBeInTheDocument();
    });

    expect(useActionResultsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ isLive: false })
    );
  });

  it('is never live for scheduled queries, which pass no agentIds', async () => {
    mockActionResults({ total: 2, totalResponded: 1 });

    const { container } = renderWithContext(
      <UnifiedActionResultsSummary
        actionId="test-schedule"
        scheduleId="test-schedule"
        executionCount={1}
      />
    );

    await waitFor(() => {
      expect(container.querySelector('.euiProgress')).not.toBeInTheDocument();
    });

    expect(useActionResultsMock).toHaveBeenLastCalledWith(
      expect.objectContaining({ isLive: false })
    );
  });
});

describe('UnifiedActionResultsSummary - Per-page agent details fetch', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockKibanaServices();
  });

  it('fetches agent details only for the agents on the current page, not all agentIds', async () => {
    // The bulk Fleet lookup must send the page's 20 edge-derived ids, not all 100 agentIds.
    const allAgentIds = Array.from({ length: 100 }, (_, index) => `agent-${index}`);
    const pageAgentIds = allAgentIds.slice(0, 20);

    useActionResultsMock.mockReturnValue({
      data: {
        edges: pageAgentIds.map((agentId, index) => ({
          _id: `response-${index}`,
          _index: '.logs-osquery_manager.action.responses',
          fields: { 'agent.id': [agentId], completed_at: ['2026-08-26T00:00:00Z'] },
        })),
        total: 100,
        aggregations: {
          totalRowCount: 200,
          totalResponded: 100,
          successful: 100,
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
        actionId="test-action"
        agentIds={allAgentIds}
        startDate="2026-08-25T00:00:00Z"
      />
    );

    await waitFor(() => {
      expect(container.querySelector('[data-test-subj="unifiedDataTable"]')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(mockHttpPost).toHaveBeenCalledWith(
        '/internal/osquery/fleet_wrapper/agents/_bulk',
        expect.objectContaining({ body: JSON.stringify({ agentIds: pageAgentIds }) })
      );
    });
    expect(mockHttpPost).toHaveBeenCalledTimes(1);
  });
});
