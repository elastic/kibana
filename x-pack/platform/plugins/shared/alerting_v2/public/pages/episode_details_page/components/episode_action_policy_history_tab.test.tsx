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
import type { PolicyExecutionHistoryItem } from '../../../services/execution_history_api';
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
  totalRuleCount: 1,
  outcome: 'dispatched',
  episode_count: 3,
  action_group_count: 2,
  workflows: [{ id: 'wf-1', name: 'My Workflow' }],
  ...overrides,
});

const mockFetchResult = (
  overrides: Partial<{
    data: {
      items: PolicyExecutionHistoryItem[];
      page: number;
      perPage: number;
      totalEvents: number;
      searchMatches: null;
    };
    isFetching: boolean;
    isError: boolean;
  }> = {}
) => {
  mockUseFetchExecutionHistory.mockReturnValue({
    data: { items: [], page: 1, perPage: 10, totalEvents: 0, searchMatches: null },
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
      episodeIds: [EPISODE_ID],
    });
  });

  it('bounds the query by the episode start when provided', () => {
    mockFetchResult();
    renderTab('2026-01-01T00:00:00.000Z');

    expect(mockUseFetchExecutionHistory).toHaveBeenCalledWith({
      page: 1,
      perPage: 10,
      episodeIds: [EPISODE_ID],
      startDate: '2026-01-01T00:00:00.000Z',
    });
  });

  it('renders rows without the Episodes, Action groups, and Rules columns', () => {
    mockFetchResult({
      data: { items: [buildItem()], page: 1, perPage: 10, totalEvents: 1, searchMatches: null },
    });
    renderTab();

    expect(screen.getByText('My Policy')).toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /Episodes/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /Action groups/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /Rules/i })).not.toBeInTheDocument();
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
      data: { items: [buildItem()], page: 1, perPage: 10, totalEvents: 1, searchMatches: null },
    });
    renderTab();

    expect(screen.queryByTestId('mockFlyout-policy-1')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'My Policy' }));
    expect(screen.getByTestId('mockFlyout-policy-1')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('mockFlyoutClose'));
    expect(screen.queryByTestId('mockFlyout-policy-1')).not.toBeInTheDocument();
  });
});
