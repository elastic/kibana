/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import type { DataViewFieldMap } from '@kbn/data-views-plugin/common';
import type { ComposedQuery, RuleQuery } from '../../form/types';
import { getBreachQuery, getRecoverQuery } from '../../form/utils/query_helpers';
import { QuerySandboxFlyout, type QuerySandboxFlyoutProps } from './query_sandbox_flyout';

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
  }),
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
  TAB_DEFINITIONS: [],
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

describe('QuerySandboxFlyout — timefield auto-select', () => {
  beforeEach(() => {
    mockFieldMap = {};
    jest.clearAllMocks();
  });

  it('auto-selects first date field when current timeField is not in the index', () => {
    const onTimeFieldChange = jest.fn();
    mockFieldMap = {
      'event.start': mockField('event.start', 'date'),
      'event.end': mockField('event.end', 'date'),
      'host.name': mockField('host.name', 'keyword'),
    };

    renderSandbox({ timeField: '@timestamp', onTimeFieldChange });

    // sorted: event.end < event.start
    expect(onTimeFieldChange).toHaveBeenCalledWith('event.end');
  });

  it('resets to @timestamp when fieldMap is empty and current timeField differs', () => {
    const onTimeFieldChange = jest.fn();
    mockFieldMap = {};

    renderSandbox({ timeField: 'event.start', onTimeFieldChange });

    expect(onTimeFieldChange).toHaveBeenCalledWith('@timestamp');
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

  it('does not reset when fieldMap is empty and timeField is already @timestamp', () => {
    const onTimeFieldChange = jest.fn();
    mockFieldMap = {};

    renderSandbox({ timeField: '@timestamp', onTimeFieldChange });

    expect(onTimeFieldChange).not.toHaveBeenCalled();
  });

  it('auto-selects when fieldMap changes and current selection is no longer valid', () => {
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

    expect(onTimeFieldChange).toHaveBeenCalledWith('created_at');
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
