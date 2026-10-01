/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import { UnifiedDataTable } from '@kbn/unified-data-table';
import type { PolicyExecutionHistoryItem } from '../../../services/execution_history_api';
import { POLICY_EXECUTION_FIELDS } from '../../execution_history_page/data_view';
import { EpisodeActionPolicyHistoryTab } from './episode_action_policy_history_tab';

const EPISODE_ID = 'episode-42';

const mockUseFetchExecutionHistory = jest.fn();
const mockRefetch = jest.fn();

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'application') {
      return { getUrlForApp: (app: string, opts: { path: string }) => `/app/${app}${opts.path}` };
    }
    if (token === 'settings') {
      return { client: { get: () => 'YYYY-MM-DD HH:mm' } };
    }
    if (typeof token === 'function') {
      return { canRead: () => true, canWrite: () => true, can: () => true };
    }
    return {};
  },
  CoreStart: (key: string) => key,
}));

jest.mock('../../../hooks/use_fetch_execution_history', () => ({
  useFetchExecutionHistory: (...args: unknown[]) => mockUseFetchExecutionHistory(...args),
}));

jest.mock('../../../hooks/use_fetch_rules', () => ({
  useFetchRules: () => ({ data: { items: [] }, isFetching: false }),
}));

// The policies table renders on UnifiedDataTable; stub the grid (rendering each row through the
// custom renderers) and the ad-hoc data view / services helpers so the test needs no real
// DataViews service.
jest.mock('@kbn/unified-data-table', () => {
  const ReactActual = jest.requireActual('react');
  return {
    DataLoadingState: { loading: 'loading', loaded: 'loaded' },
    ROWS_HEIGHT_OPTIONS: { auto: -1, single: 1, default: 3 },
    UnifiedDataTable: jest.fn(({ rows, columns, externalCustomRenderers }: Record<string, any>) =>
      ReactActual.createElement(
        'div',
        { 'data-test-subj': 'unifiedDataTable' },
        rows.map((row: any) =>
          ReactActual.createElement(
            'div',
            { key: row.id, role: 'row' },
            columns.map((columnId: string) => {
              const Renderer = externalCustomRenderers?.[columnId];
              return ReactActual.createElement(
                'div',
                { key: columnId, role: 'cell' },
                Renderer
                  ? ReactActual.createElement(Renderer, { row, columnId })
                  : String(row.flattened?.[columnId] ?? '')
              );
            })
          )
        )
      )
    ),
  };
});

jest.mock('@kbn/cell-actions', () => ({
  CellActionsProvider: ({ children }: { children: React.ReactNode }) => children,
}));

jest.mock('../../execution_history_page/data_view', () => ({
  ...jest.requireActual('../../execution_history_page/data_view'),
  usePolicyExecutionsDataView: () => ({ dataView: {}, error: undefined }),
}));

jest.mock('../../execution_history_page/hooks/use_unified_data_table_services', () => ({
  useUnifiedDataTableServices: () => ({}),
}));

jest.mock(
  '../../../components/action_policy/details_flyout/action_policy_details_flyout_container',
  () => ({
    ActionPolicyDetailsFlyoutContainer: ({
      policyId,
      onClose,
    }: {
      policyId: string;
      onClose: () => void;
    }) => (
      <div data-test-subj={`mockFlyout-${policyId}`}>
        <button data-test-subj="mockFlyoutClose" onClick={onClose} type="button">
          close
        </button>
      </div>
    ),
  })
);

const buildItem = (
  overrides: Partial<PolicyExecutionHistoryItem> = {}
): PolicyExecutionHistoryItem => ({
  dispatched_at: '2026-05-05T10:00:00.000Z',
  policy: { id: 'policy-1', name: 'My Policy' },
  rules: [{ id: 'rule-1', name: 'My Rule' }],
  total_rule_count: 1,
  outcome: 'success',
  episode_count: 3,
  episodes: [],
  action_group_count: 2,
  workflows: [{ id: 'wf-1', name: 'My Workflow' }],
  error: null,
  ...overrides,
});

const mockFetchResult = (
  overrides: Partial<{
    data: {
      items: PolicyExecutionHistoryItem[];
      page: number;
      perPage: number;
      total: number;
      searchMatches: null;
    };
    isFetching: boolean;
    isError: boolean;
  }> = {}
) => {
  mockUseFetchExecutionHistory.mockReturnValue({
    data: { items: [], page: 1, perPage: 10, total: 0, searchMatches: null },
    isFetching: false,
    isError: false,
    refetch: mockRefetch,
    ...overrides,
  });
};

const renderTab = (episodeStart?: string) =>
  render(
    <I18nProvider>
      <EpisodeActionPolicyHistoryTab episodeId={EPISODE_ID} episodeStart={episodeStart} />
    </I18nProvider>
  );

describe('EpisodeActionPolicyHistoryTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('fetches execution history scoped to the current episode', () => {
    mockFetchResult();
    renderTab();

    expect(mockUseFetchExecutionHistory).toHaveBeenCalledWith({
      page: 1,
      perPage: 10,
      outcomes: undefined,
      episodeIds: [EPISODE_ID],
    });
  });

  it('bounds the query by the episode start when provided', () => {
    mockFetchResult();
    renderTab('2026-01-01T00:00:00.000Z');

    expect(mockUseFetchExecutionHistory).toHaveBeenCalledWith({
      page: 1,
      perPage: 10,
      outcomes: undefined,
      episodeIds: [EPISODE_ID],
      from: '2026-01-01T00:00:00.000Z',
    });
  });

  it('renders the search bar and outcome filter but not the rule filter', () => {
    mockFetchResult();
    renderTab();

    expect(screen.getByTestId('executionHistorySearchBar')).toBeInTheDocument();
    expect(screen.getByTestId('executionHistoryOutcomeFilter')).toBeInTheDocument();
    expect(screen.queryByTestId('executionHistoryRuleFilter')).not.toBeInTheDocument();
  });

  it('refetches with the selected outcome when the outcome filter changes', async () => {
    mockFetchResult();
    renderTab();

    await userEvent.selectOptions(screen.getByTestId('executionHistoryOutcomeFilter'), 'success');

    expect(mockUseFetchExecutionHistory).toHaveBeenLastCalledWith(
      expect.objectContaining({ outcomes: ['success'], episodeIds: [EPISODE_ID] })
    );
  });

  it('renders rows without the Episodes, Action groups, and Rules columns', () => {
    mockFetchResult({
      data: { items: [buildItem()], page: 1, perPage: 10, total: 1, searchMatches: null },
    });
    renderTab();

    expect(screen.getByText('My Policy')).toBeInTheDocument();

    const calls = jest.mocked(UnifiedDataTable).mock.calls;
    const { columns } = calls[calls.length - 1][0] as Record<string, any>;
    expect(columns).not.toContain(POLICY_EXECUTION_FIELDS.episodeCount);
    expect(columns).not.toContain(POLICY_EXECUTION_FIELDS.actionGroupCount);
    expect(columns).not.toContain(POLICY_EXECUTION_FIELDS.rules);
    expect(screen.queryByText('My Rule')).not.toBeInTheDocument();
  });

  it('shows the empty state when there are no items', () => {
    mockFetchResult();
    renderTab();

    expect(screen.getByTestId('executionHistoryEmptyPrompt')).toBeInTheDocument();
  });

  it('renders the error state with retry when isError is true', async () => {
    mockFetchResult({ isError: true });
    renderTab();

    expect(screen.getByText(/Failed to load execution history/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('opens the policy flyout when the policy link is clicked and closes it on dismiss', async () => {
    mockFetchResult({
      data: { items: [buildItem()], page: 1, perPage: 10, total: 1, searchMatches: null },
    });
    renderTab();

    expect(screen.queryByTestId('mockFlyout-policy-1')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'My Policy' }));
    expect(screen.getByTestId('mockFlyout-policy-1')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('mockFlyoutClose'));
    expect(screen.queryByTestId('mockFlyout-policy-1')).not.toBeInTheDocument();
  });
});
