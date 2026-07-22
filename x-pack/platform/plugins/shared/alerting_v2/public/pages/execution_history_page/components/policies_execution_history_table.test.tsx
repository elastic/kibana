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
import { PoliciesExecutionHistoryTable } from './policies_execution_history_table';

let mockCanReadRules = true;
let mockCanReadActionPolicies = true;

jest.mock('@kbn/core-di-browser', () => ({
  useService: (token: unknown) => {
    if (token === 'application') {
      return { getUrlForApp: (app: string, opts: { path: string }) => `/app/${app}${opts.path}` };
    }
    if (token === 'settings') {
      return { client: { get: () => 'YYYY-MM-DD HH:mm' } };
    }
    if (typeof token === 'function') {
      const canRead = (feature: string) =>
        feature === 'actionPolicies' ? mockCanReadActionPolicies : mockCanReadRules;
      return {
        canRead,
        canWrite: canRead,
        can: () => true,
      };
    }
    return {};
  },
  CoreStart: (key: string) => key,
}));

const buildItem = (
  overrides: Partial<PolicyExecutionHistoryItem> = {}
): PolicyExecutionHistoryItem => ({
  '@timestamp': '2026-05-05T10:00:00.000Z',
  policy: { id: 'policy-1', name: 'My Policy' },
  rules: [{ id: 'rule-1', name: 'My Rule' }],
  totalRuleCount: 1,
  outcome: 'dispatched',
  episode_count: 3,
  action_group_count: 2,
  workflows: [{ id: 'wf-1', name: 'My Workflow' }],
  ...overrides,
});

const onPolicyClick = jest.fn();
const onRuleClick = jest.fn();
const onChange = jest.fn();

const renderTable = (props: Partial<React.ComponentProps<typeof PoliciesExecutionHistoryTable>>) =>
  render(
    <I18nProvider>
      <PoliciesExecutionHistoryTable
        items={[buildItem()]}
        loading={false}
        pageIndex={0}
        pageSize={10}
        totalItemCount={1}
        onChange={onChange}
        onPolicyClick={onPolicyClick}
        onRuleClick={onRuleClick}
        activeRuleId={null}
        noItemsMessage="No items"
        {...props}
      />
    </I18nProvider>
  );

describe('PoliciesExecutionHistoryTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCanReadRules = true;
    mockCanReadActionPolicies = true;
  });

  it('renders rows with policy, rule, outcome, and workflow names', () => {
    renderTable({});

    expect(screen.getByText('My Policy')).toBeInTheDocument();
    expect(screen.getByText('My Rule')).toBeInTheDocument();
    expect(screen.getByText('dispatched')).toBeInTheDocument();
    expect(screen.getByText('My Workflow')).toBeInTheDocument();
    expect(screen.getByText(/2026-05-05/)).toBeInTheDocument();
  });

  it('shows the Episodes and Action groups columns by default', () => {
    renderTable({});

    expect(screen.getByRole('columnheader', { name: /Episodes/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Action groups/i })).toBeInTheDocument();
  });

  it('hides the Episodes and Action groups columns when showEpisodeColumns is false', () => {
    renderTable({ showEpisodeColumns: false });

    expect(screen.queryByRole('columnheader', { name: /Episodes/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('columnheader', { name: /Action groups/i })).not.toBeInTheDocument();
    // Other columns remain
    expect(screen.getByRole('columnheader', { name: /Policy/i })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Workflows/i })).toBeInTheDocument();
  });

  it('hides the Rules column when showRulesColumn is false', () => {
    renderTable({ showRulesColumn: false });

    expect(screen.queryByRole('columnheader', { name: /Rules/i })).not.toBeInTheDocument();
    expect(screen.queryByText('My Rule')).not.toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Policy/i })).toBeInTheDocument();
  });

  it('calls onPolicyClick when the policy link is clicked', async () => {
    renderTable({});

    await userEvent.click(screen.getByRole('button', { name: 'My Policy' }));
    expect(onPolicyClick).toHaveBeenCalledWith('policy-1');
  });

  it('renders the policy name as plain text when the user cannot read action policies', () => {
    mockCanReadActionPolicies = false;
    renderTable({});

    expect(screen.getByText('My Policy')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'My Policy' })).not.toBeInTheDocument();
  });

  it('calls onRuleClick when the rule badge is clicked', async () => {
    renderTable({});

    await userEvent.click(screen.getByText('My Rule'));
    expect(onRuleClick).toHaveBeenCalledWith('rule-1');
  });

  it('renders workflow pills as links to the workflows app', () => {
    renderTable({});

    const workflowLink = screen.getByRole('link', { name: 'My Workflow' });
    expect(workflowLink).toHaveAttribute('href', '/app/workflows/wf-1');
    expect(workflowLink).toHaveAttribute('target', '_blank');
  });

  it('shows the noItemsMessage when there are no items', () => {
    renderTable({ items: [], totalItemCount: 0, noItemsMessage: 'Nothing here' });

    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });
});
