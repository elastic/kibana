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
import { PoliciesExecutionHistoryTable } from './policies_execution_history_table';
import { POLICY_EXECUTION_FIELDS } from '../data_view';

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
      return { canRead, canWrite: canRead, can: () => true };
    }
    return {};
  },
  CoreStart: (key: string) => key,
}));

// Render each row's cells through the custom renderers the component supplies, so the cell
// renderers stay covered without mounting the real virtualized data grid.
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

jest.mock('../data_view', () => ({
  ...jest.requireActual('../data_view'),
  usePolicyExecutionsDataView: () => ({ dataView: {}, error: undefined }),
}));

jest.mock('../hooks/use_unified_data_table_services', () => ({
  useUnifiedDataTableServices: () => ({}),
}));

const buildItem = (
  overrides: Partial<PolicyExecutionHistoryItem> = {}
): PolicyExecutionHistoryItem => ({
  dispatched_at: '2026-05-05T10:00:00.000Z',
  policy: { id: 'policy-1', name: 'My Policy' },
  rules: [{ id: 'rule-1', name: 'My Rule' }],
  total_rule_count: 1,
  outcome: 'dispatched',
  episode_count: 3,
  episodes: [],
  action_group_count: 2,
  workflows: [{ id: 'wf-1', name: 'My Workflow' }],
  error: null,
  ...overrides,
});

const onPolicyClick = jest.fn();
const onRuleClick = jest.fn();
const onChangePage = jest.fn();
const onChangeItemsPerPage = jest.fn();

const renderTable = (props: Partial<React.ComponentProps<typeof PoliciesExecutionHistoryTable>>) =>
  render(
    <I18nProvider>
      <PoliciesExecutionHistoryTable
        items={[buildItem()]}
        loading={false}
        page={0}
        perPage={10}
        total={1}
        onChangePage={onChangePage}
        onChangeItemsPerPage={onChangeItemsPerPage}
        onPolicyClick={onPolicyClick}
        onRuleClick={onRuleClick}
        activeRuleId={null}
        noItemsMessage="No items"
        tableCaption="Policy execution history"
        {...props}
      />
    </I18nProvider>
  );

const lastGridColumns = (): string[] => {
  const calls = jest.mocked(UnifiedDataTable).mock.calls;
  return (calls[calls.length - 1][0] as Record<string, any>).columns;
};

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
    expect(screen.getByText('Dispatched')).toBeInTheDocument();
    expect(screen.getByText('My Workflow')).toBeInTheDocument();
    expect(screen.getByText(/2026-05-05/)).toBeInTheDocument();
  });

  it('shows the Episodes and Action groups columns by default', () => {
    renderTable({});

    expect(lastGridColumns()).toEqual(
      expect.arrayContaining([
        POLICY_EXECUTION_FIELDS.episodeCount,
        POLICY_EXECUTION_FIELDS.actionGroupCount,
      ])
    );
  });

  it('hides the Episodes and Action groups columns when showEpisodeColumns is false', () => {
    renderTable({ showEpisodeColumns: false });

    const columns = lastGridColumns();
    expect(columns).not.toContain(POLICY_EXECUTION_FIELDS.episodeCount);
    expect(columns).not.toContain(POLICY_EXECUTION_FIELDS.actionGroupCount);
    expect(columns).toEqual(
      expect.arrayContaining([POLICY_EXECUTION_FIELDS.policy, POLICY_EXECUTION_FIELDS.workflows])
    );
  });

  it('hides the Rules column when showRulesColumn is false', () => {
    renderTable({ showRulesColumn: false });

    expect(lastGridColumns()).not.toContain(POLICY_EXECUTION_FIELDS.rules);
    expect(screen.queryByText('My Rule')).not.toBeInTheDocument();
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

  it('renders the failure reason and outcome for a failed dispatch', () => {
    renderTable({
      items: [
        buildItem({
          outcome: 'dispatch_failed',
          failure_reason: 'workflow_not_found',
          error: { message: 'Workflow not found', stack_trace: null },
        }),
      ],
    });

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(screen.getByText('workflow_not_found')).toBeInTheDocument();
  });

  it('shows the noItemsMessage when there are no items', () => {
    renderTable({ items: [], total: 0, noItemsMessage: 'Nothing here' });

    expect(screen.getByText('Nothing here')).toBeInTheDocument();
  });
});
