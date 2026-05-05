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
import type { PolicyExecutionHistoryItem } from '../../services/execution_history_api';
import { ExecutionHistoryPage } from './execution_history_page';

const mockUseFetchExecutionHistory = jest.fn();
const mockRefetch = jest.fn();

jest.mock('../../application/breadcrumb_context', () => ({
  useSetBreadcrumbs: () => jest.fn(),
}));

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'chrome') return { docTitle: { change: jest.fn() } };
    return {};
  },
  CoreStart: (key: string) => key,
}));

jest.mock('../../hooks/use_fetch_execution_history', () => ({
  useFetchExecutionHistory: (...args: unknown[]) => mockUseFetchExecutionHistory(...args),
}));

jest.mock(
  '../../components/action_policy/details_flyout/action_policy_details_flyout_container',
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
  '@timestamp': '2026-05-05T10:00:00.000Z',
  policy: { id: 'policy-1', name: 'My Policy' },
  rule: { id: 'rule-1', name: 'My Rule' },
  outcome: 'dispatched',
  episode_count: 3,
  action_group_count: 2,
  workflows: [{ id: 'wf-1', name: 'My Workflow' }],
  ...overrides,
});

const mockFetchResult = (
  overrides: Partial<{
    data: { items: PolicyExecutionHistoryItem[]; page: number; perPage: number; total: number };
    isFetching: boolean;
    isError: boolean;
  }> = {}
) => {
  mockUseFetchExecutionHistory.mockReturnValue({
    data: { items: [], page: 1, perPage: 50, total: 0 },
    isFetching: false,
    isError: false,
    refetch: mockRefetch,
    ...overrides,
  });
};

const renderPage = () =>
  render(
    <I18nProvider>
      <ExecutionHistoryPage />
    </I18nProvider>
  );

describe('ExecutionHistoryPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the page title and tabs', () => {
    mockFetchResult();
    renderPage();

    expect(screen.getByRole('heading', { name: /execution history/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Policies' })).toHaveAttribute('aria-selected', 'true');
  });

  it('shows the empty state when there are no items', () => {
    mockFetchResult();
    renderPage();

    expect(
      screen.getByText(/No policy execution activity in the last 24 hours/i)
    ).toBeInTheDocument();
  });

  it('renders rows with policy, rule, and workflow names', () => {
    mockFetchResult({
      data: {
        items: [buildItem()],
        page: 1,
        perPage: 50,
        total: 1,
      },
    });
    renderPage();

    expect(screen.getByText('My Policy')).toBeInTheDocument();
    expect(screen.getByText('My Rule')).toBeInTheDocument();
    expect(screen.getByText('My Workflow')).toBeInTheDocument();
    expect(screen.getByText('dispatched')).toBeInTheDocument();
  });

  it('falls back to ids when names are missing', () => {
    mockFetchResult({
      data: {
        items: [
          buildItem({
            policy: { id: 'policy-orphan', name: null },
            rule: { id: 'rule-orphan', name: null },
            workflows: [{ id: 'wf-orphan', name: null }],
          }),
        ],
        page: 1,
        perPage: 50,
        total: 1,
      },
    });
    renderPage();

    expect(screen.getByText('policy-orphan')).toBeInTheDocument();
    expect(screen.getByText('rule-orphan')).toBeInTheDocument();
    expect(screen.getByText('wf-orphan')).toBeInTheDocument();
  });

  it('renders the error callout with a Retry button when isError is true', async () => {
    mockFetchResult({ isError: true });
    renderPage();

    expect(screen.getByText(/Failed to load execution history/i)).toBeInTheDocument();
    const retry = screen.getByRole('button', { name: /retry/i });
    await userEvent.click(retry);
    expect(mockRefetch).toHaveBeenCalledTimes(1);
  });

  it('hides the table when in error state', () => {
    mockFetchResult({ isError: true });
    renderPage();

    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('opens the flyout when the policy link is clicked and closes it on dismiss', async () => {
    mockFetchResult({
      data: {
        items: [buildItem()],
        page: 1,
        perPage: 50,
        total: 1,
      },
    });
    renderPage();

    expect(screen.queryByTestId('mockFlyout-policy-1')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'My Policy' }));
    expect(screen.getByTestId('mockFlyout-policy-1')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('mockFlyoutClose'));
    expect(screen.queryByTestId('mockFlyout-policy-1')).not.toBeInTheDocument();
  });

  it('queries with default page=1 and perPage=50', () => {
    mockFetchResult();
    renderPage();

    expect(mockUseFetchExecutionHistory).toHaveBeenCalledWith({ page: 1, perPage: 50 });
  });
});
