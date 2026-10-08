/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { DataViewFieldMap } from '@kbn/data-views-plugin/common';
import type { ComposedQuery, RuleQuery } from '../../form/types';
import { getBreachQuery, getRecoverQuery } from '../../form/utils/query_helpers';
import { QuerySandboxFlyout, type QuerySandboxFlyoutProps } from './query_sandbox_flyout';
import type { QueryTab } from './types';

jest.mock('@kbn/esql-utils', () => ({
  ...jest.requireActual('@kbn/esql-utils'),
  getESQLTimeFieldFromQuery: jest.fn().mockResolvedValue(undefined),
}));

let mockFieldMap: DataViewFieldMap = {};
jest.mock('../../form/hooks/use_data_fields', () => ({
  useDataFields: () => ({ data: mockFieldMap, isLoading: false }),
}));

jest.mock('../../form/contexts/rule_form_context', () => ({
  useRuleFormServices: () => ({
    http: {},
    data: { search: { search: jest.fn() } },
    dataViews: {},
    application: {},
  }),
}));

const mockValidateTabQueries = jest.fn(
  async (_queries: unknown, _callbacks: unknown) =>
    [] as Array<{ tab: QueryTab; messages: string[] }>
);
jest.mock('./validate_tab_queries', () => ({
  validateTabQueries: (queries: unknown, callbacks: unknown) =>
    mockValidateTabQueries(queries, callbacks),
}));

const mockColumns: never[] = [];
const mockRows: never[] = [];
const mockRun = jest.fn();
const mockUseQueryExecution = jest.fn((_params: unknown) => ({
  columns: mockColumns,
  rows: mockRows,
  totalRowCount: 0,
  isLoading: false,
  isError: false,
  error: null,
  run: mockRun,
  hasRun: false,
  lastExecutedQuery: null,
}));
jest.mock('./use_query_execution', () => ({
  useQueryExecution: (params: unknown) => mockUseQueryExecution(params),
}));

jest.mock('./compose_discover_chart', () => ({
  ComposeDiscoverChart: () => null,
}));

jest.mock('@kbn/code-editor', () => ({
  CodeEditor: () => <div data-test-subj="codeEditorMock" />,
  ESQL_LANG_ID: 'esql',
}));

jest.mock('./compose_discover_tabs', () => ({
  ComposeDiscoverTabs: () => null,
  QueryTabButton: () => null,
  TAB_DEFINITIONS: [
    { id: 'base', label: 'Base query' },
    { id: 'alert', label: 'Alert query' },
    { id: 'recovery', label: 'Recovery query' },
  ],
  visibleTabIds: () => [],
  isAlertTabDisabled: () => false,
}));

const mockField = (name: string, type: string) =>
  ({ name, type, searchable: true, aggregatable: true } as DataViewFieldMap[string]);

const standaloneQuery = (breach = 'FROM test-index | LIMIT 10'): RuleQuery => ({
  format: 'standalone',
  breach: { query: breach },
});

const composedQuery = (): ComposedQuery => ({
  format: 'composed',
  base: 'FROM test-index',
  breach: { segment: '| WHERE cpu > 70' },
  recovery: { segment: '| WHERE cpu <= 70' },
});

const defaultProps: QuerySandboxFlyoutProps = {
  query: standaloneQuery(),
  onQueryChange: jest.fn(),
  timeField: '@timestamp',
  onTimeFieldChange: jest.fn(),
  dateRange: { dateStart: 'now-15m', dateEnd: 'now' },
  onDateRangeChange: jest.fn(),
  onClose: jest.fn(),
};

const testQueryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const renderSandbox = (overrides: Partial<QuerySandboxFlyoutProps> = {}) =>
  render(
    <QueryClientProvider client={testQueryClient}>
      <IntlProvider locale="en">
        <QuerySandboxFlyout {...defaultProps} {...overrides} />
      </IntlProvider>
    </QueryClientProvider>
  );

describe('QuerySandboxFlyout — timefield selection', () => {
  beforeEach(() => {
    mockFieldMap = {};
    jest.clearAllMocks();
  });

  it('does not auto-select a field when current timeField is not in the index; offers the real fields', () => {
    const onTimeFieldChange = jest.fn();
    mockFieldMap = {
      'event.start': mockField('event.start', 'date'),
      'event.end': mockField('event.end', 'date'),
      'host.name': mockField('host.name', 'keyword'),
    };

    renderSandbox({ timeField: '@timestamp', onTimeFieldChange });

    // The invalid `@timestamp` is cleared (never replaced with a real field); the
    // user must pick from the offered options.
    expect(onTimeFieldChange).toHaveBeenCalledWith('');
    const select = screen.getByTestId('querySandboxTimeField');
    expect(select).toHaveValue('');
    expect(screen.getByRole('option', { name: 'event.end' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'event.start' })).toBeInTheDocument();
  });

  it('clears the selection and shows no options when the index has no date field', async () => {
    const onTimeFieldChange = jest.fn();
    mockFieldMap = {};

    renderSandbox({ timeField: 'event.start', onTimeFieldChange });

    // No date field to resolve to (after the API fallback settles): clear the
    // value, don't fabricate `@timestamp`.
    await waitFor(() => expect(onTimeFieldChange).toHaveBeenCalledWith(''));
    const select = screen.getByTestId('querySandboxTimeField');
    expect(select).toHaveValue('');
    // No selectable date-field options are offered.
    expect(screen.queryByRole('option', { name: 'event.start' })).not.toBeInTheDocument();
  });

  it('does not call onTimeFieldChange when current timeField exists in the index', () => {
    const onTimeFieldChange = jest.fn();
    mockFieldMap = {
      '@timestamp': mockField('@timestamp', 'date'),
      'event.end': mockField('event.end', 'date'),
    };

    renderSandbox({ timeField: '@timestamp', onTimeFieldChange });

    expect(onTimeFieldChange).not.toHaveBeenCalled();
  });

  it('clears @timestamp (does not fabricate) when fieldMap is empty', async () => {
    const onTimeFieldChange = jest.fn();
    mockFieldMap = {};

    renderSandbox({ timeField: '@timestamp', onTimeFieldChange });

    await waitFor(() => expect(onTimeFieldChange).toHaveBeenCalledWith(''));
  });

  it('clears (does not auto-select) when fieldMap changes and current selection is no longer valid', () => {
    const onTimeFieldChange = jest.fn();
    mockFieldMap = {
      'event.start': mockField('event.start', 'date'),
    };

    const { rerender } = renderSandbox({ timeField: 'event.start', onTimeFieldChange });

    expect(onTimeFieldChange).not.toHaveBeenCalled();

    mockFieldMap = {
      created_at: mockField('created_at', 'date'),
    };

    act(() => {
      rerender(
        <QueryClientProvider client={testQueryClient}>
          <IntlProvider locale="en">
            <QuerySandboxFlyout
              {...defaultProps}
              timeField="event.start"
              onTimeFieldChange={onTimeFieldChange}
            />
          </IntlProvider>
        </QueryClientProvider>
      );
    });

    // `event.start` is no longer on the index: clear it (never force `created_at`) —
    // the user must pick it explicitly.
    expect(onTimeFieldChange).toHaveBeenCalledWith('');
    expect(screen.getByRole('option', { name: 'created_at' })).toBeInTheDocument();
  });
});

describe('QuerySandboxFlyout — per-tab query execution', () => {
  beforeEach(() => {
    mockFieldMap = {};
    jest.clearAllMocks();
  });

  it('runs the base-only query when the Base tab is active', () => {
    const query = composedQuery();
    renderSandbox({
      query,
      tabs: ['base', 'alert', 'recovery'],
      activeTab: 'base',
      onTabChange: jest.fn(),
    });

    expect(mockUseQueryExecution).toHaveBeenCalledWith(
      expect.objectContaining({ query: query.base })
    );
  });

  it('runs the base+breach query when the Alert tab is active', () => {
    const query = composedQuery();
    renderSandbox({
      query,
      tabs: ['base', 'alert', 'recovery'],
      activeTab: 'alert',
      onTabChange: jest.fn(),
    });

    expect(mockUseQueryExecution).toHaveBeenCalledWith(
      expect.objectContaining({ query: getBreachQuery(query) })
    );
  });

  it('runs the base+recover query when the Recovery tab is active', () => {
    const query = composedQuery();
    renderSandbox({
      query,
      tabs: ['base', 'alert', 'recovery'],
      activeTab: 'recovery',
      onTabChange: jest.fn(),
    });

    expect(mockUseQueryExecution).toHaveBeenCalledWith(
      expect.objectContaining({ query: getRecoverQuery(query) })
    );
  });

  it('runs the base+breach query in unified (no-tabs) mode regardless of activeTab', () => {
    const query = composedQuery();
    renderSandbox({ query, tabs: undefined, activeTab: 'recovery' });

    expect(mockUseQueryExecution).toHaveBeenCalledWith(
      expect.objectContaining({ query: getBreachQuery(query) })
    );
  });
});

describe('QuerySandboxFlyout — Apply gating', () => {
  beforeEach(() => {
    mockFieldMap = {};
    jest.clearAllMocks();
    mockValidateTabQueries.mockResolvedValue([]);
  });

  it('does not render Apply when onApply is not provided', () => {
    renderSandbox({ onApply: undefined });

    expect(screen.queryByTestId('querySandboxApply')).not.toBeInTheDocument();
  });

  it('applies when validation finds no errors', async () => {
    const onApply = jest.fn();
    mockValidateTabQueries.mockResolvedValue([]);

    renderSandbox({ onApply, tabs: ['base', 'alert'], activeTab: 'alert' });

    await userEvent.click(screen.getByTestId('querySandboxApply'));

    await waitFor(() => expect(onApply).toHaveBeenCalledTimes(1));
    expect(screen.queryByTestId('querySandboxValidationError')).not.toBeInTheDocument();
  });

  it('switches to the offending tab and blocks apply when validation fails elsewhere', async () => {
    const onApply = jest.fn();
    const onTabChange = jest.fn();
    mockValidateTabQueries.mockResolvedValue([{ tab: 'alert', messages: ['bad query'] }]);

    renderSandbox({ onApply, onTabChange, tabs: ['base', 'alert'], activeTab: 'base' });

    await userEvent.click(screen.getByTestId('querySandboxApply'));

    await waitFor(() => expect(onTabChange).toHaveBeenCalledWith('alert'));
    expect(onApply).not.toHaveBeenCalled();
    // Not yet visible — the flyout is still on 'base', a controlled prop the mock onTabChange doesn't update.
    expect(screen.queryByTestId('querySandboxValidationError')).not.toBeInTheDocument();
  });

  it('shows the inline error once the offending tab becomes active', async () => {
    const onApply = jest.fn();
    const onTabChange = jest.fn();
    mockValidateTabQueries.mockResolvedValue([{ tab: 'alert', messages: ['bad query'] }]);

    const { rerender } = renderSandbox({
      onApply,
      onTabChange,
      tabs: ['base', 'alert'],
      activeTab: 'base',
    });

    await userEvent.click(screen.getByTestId('querySandboxApply'));
    await waitFor(() => expect(onTabChange).toHaveBeenCalledWith('alert'));

    // Simulate the parent responding to onTabChange by making 'alert' active.
    act(() => {
      rerender(
        <QueryClientProvider client={testQueryClient}>
          <IntlProvider locale="en">
            <QuerySandboxFlyout
              {...defaultProps}
              onApply={onApply}
              onTabChange={onTabChange}
              tabs={['base', 'alert']}
              activeTab="alert"
            />
          </IntlProvider>
        </QueryClientProvider>
      );
    });

    expect(await screen.findByText('bad query')).toBeInTheDocument();
  });

  it('shows the inline error immediately when the failing tab is already active', async () => {
    const onApply = jest.fn();
    const onTabChange = jest.fn();
    mockValidateTabQueries.mockResolvedValue([{ tab: 'alert', messages: ['bad query'] }]);

    renderSandbox({ onApply, onTabChange, tabs: ['base', 'alert'], activeTab: 'alert' });

    await userEvent.click(screen.getByTestId('querySandboxApply'));

    expect(await screen.findByText('bad query')).toBeInTheDocument();
    expect(onTabChange).not.toHaveBeenCalled();
    expect(onApply).not.toHaveBeenCalled();
  });

  it('shows the error inline in unified (no-tabs) mode without switching tabs', async () => {
    const onApply = jest.fn();
    mockValidateTabQueries.mockResolvedValue([{ tab: 'alert', messages: ['bad query'] }]);

    renderSandbox({ onApply, tabs: undefined });

    await userEvent.click(screen.getByTestId('querySandboxApply'));

    expect(await screen.findByText('bad query')).toBeInTheDocument();
    expect(onApply).not.toHaveBeenCalled();
  });
});
