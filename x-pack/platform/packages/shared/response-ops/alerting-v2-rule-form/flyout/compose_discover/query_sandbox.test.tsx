/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { QuerySandbox } from './query_sandbox';
import type { QuerySandboxProps } from './query_sandbox';
import type { QueryExecutionResult } from './use_query_execution';

const mockRun = jest.fn();

const defaultExecutionResult: QueryExecutionResult = {
  columns: [],
  rows: [],
  totalRowCount: 0,
  isLoading: false,
  isError: false,
  error: null,
  run: mockRun,
  hasRun: false,
  lastExecutedQuery: null,
};

let mockExecutionResult = { ...defaultExecutionResult };

jest.mock('./use_query_execution', () => ({
  useQueryExecution: () => mockExecutionResult,
}));

jest.mock('../../form/hooks/use_data_fields', () => ({
  useDataFields: () => ({ data: {} }),
}));

jest.mock('../../form/contexts/rule_form_context', () => ({
  useRuleFormServices: () => ({
    http: {},
    data: { search: { search: jest.fn() } },
    dataViews: {},
    lens: { EmbeddableComponent: () => null, stateHelperApi: jest.fn() },
  }),
}));

jest.mock('./compose_discover_chart', () => ({
  ComposeDiscoverChart: () => <div data-test-subj="mockComposeDiscoverChart" />,
}));

jest.mock('./compose_discover_tabs', () => ({
  ComposeDiscoverTabs: () => <div data-test-subj="mockComposeDiscoverTabs" />,
  TAB_DEFINITIONS: [
    { id: 'base', label: 'Base' },
    { id: 'alert', label: 'Alert' },
    { id: 'recovery', label: 'Recovery' },
  ],
}));

jest.mock('@kbn/code-editor', () => ({
  CodeEditor: ({ value }: { value: string }) => <pre data-test-subj="mockCodeEditor">{value}</pre>,
  ESQL_LANG_ID: 'esql',
}));

const defaultProps: QuerySandboxProps = {
  query: 'FROM logs-* | STATS count() BY host.name',
  timeField: '@timestamp',
  dateRange: { dateStart: 'now-15m', dateEnd: 'now' },
  onDateRangeChange: jest.fn(),
};

const renderSandbox = (overrides: Partial<QuerySandboxProps> = {}) =>
  render(
    <I18nProvider>
      <QuerySandbox {...defaultProps} {...overrides} />
    </I18nProvider>
  );

describe('QuerySandbox', () => {
  beforeEach(() => {
    mockRun.mockClear();
    mockExecutionResult = { ...defaultExecutionResult };
    jest.clearAllMocks();
  });

  it('renders the sandbox container', () => {
    renderSandbox();
    expect(screen.getByTestId('querySandbox')).toBeInTheDocument();
  });

  it('renders the search button', () => {
    renderSandbox();
    expect(screen.getByTestId('querySandboxRunQuery')).toBeInTheDocument();
  });

  it('renders the time field selector', () => {
    renderSandbox();
    expect(screen.getByTestId('querySandboxTimeField')).toBeInTheDocument();
  });

  it('renders the single code editor when tabProps is absent', () => {
    renderSandbox();
    expect(screen.getByTestId('mockCodeEditor')).toBeInTheDocument();
    expect(screen.getByTestId('mockCodeEditor')).toHaveTextContent(
      'FROM logs-* | STATS count() BY host.name'
    );
    expect(screen.queryByTestId('mockComposeDiscoverTabs')).not.toBeInTheDocument();
  });

  it('renders ComposeDiscoverTabs when tabProps is provided', () => {
    renderSandbox({
      tabProps: {
        tabs: ['base', 'alert'],
        activeTab: 'alert',
        onTabChange: jest.fn(),
        baseQuery: 'FROM logs-*',
        alertBlock: '| WHERE count > 100',
        recoveryBlock: '',
        onBaseQueryChange: jest.fn(),
        onAlertBlockChange: jest.fn(),
        onRecoveryBlockChange: jest.fn(),
      },
    });
    expect(screen.getByTestId('mockComposeDiscoverTabs')).toBeInTheDocument();
    expect(screen.queryByTestId('mockCodeEditor')).not.toBeInTheDocument();
  });

  it('renders tab bar when tabProps is provided', () => {
    renderSandbox({
      tabProps: {
        tabs: ['base', 'alert'],
        activeTab: 'alert',
        onTabChange: jest.fn(),
        baseQuery: 'FROM logs-*',
        alertBlock: '| WHERE count > 100',
        recoveryBlock: '',
        onBaseQueryChange: jest.fn(),
        onAlertBlockChange: jest.fn(),
        onRecoveryBlockChange: jest.fn(),
      },
    });
    expect(screen.getByText('Base')).toBeInTheDocument();
    expect(screen.getByText('Alert')).toBeInTheDocument();
  });

  it('renders ES|QL query title and helper on first create without the separate link', () => {
    renderSandbox({ showUnifiedQueryHeader: true });

    expect(screen.getByTestId('querySandboxEsqlQueryTitle')).toBeInTheDocument();
    expect(screen.getByText('ES|QL query')).toBeInTheDocument();
    expect(screen.getByTestId('querySandboxSeparateQueryHelper')).toHaveTextContent(
      "We'll automatically identify the base query and alert condition when you apply changes."
    );
    expect(screen.queryByTestId('querySandboxSeparateBaseAndAlert')).not.toBeInTheDocument();
  });

  it('renders separate link in helper when onEditManually is provided', () => {
    renderSandbox({ onEditManually: jest.fn() });
    expect(screen.getByTestId('querySandboxEsqlQueryTitle')).toBeInTheDocument();
    expect(screen.getByText('ES|QL query')).toBeInTheDocument();
    expect(screen.getByTestId('querySandboxSeparateBaseAndAlert')).toHaveTextContent(
      'Separate base and alert'
    );
    expect(screen.getByTestId('querySandboxSeparateQueryHelper')).toHaveTextContent(
      "We'll automatically identify the base query and alert condition when you apply changes."
    );
    expect(screen.getByTestId('querySandboxSeparateQueryHelper')).toHaveTextContent(
      'Prefer to edit them separately?'
    );
    expect(screen.queryByText('Base')).not.toBeInTheDocument();
  });

  it('renders ES|QL query title and base/alert sub-tabs when manual split', () => {
    renderSandbox({
      onUseSingleEditor: jest.fn(),
      tabProps: {
        tabs: ['base', 'alert'],
        activeTab: 'alert',
        onTabChange: jest.fn(),
        baseQuery: 'FROM logs-*',
        alertBlock: '| WHERE count > 100',
        recoveryBlock: '',
        onBaseQueryChange: jest.fn(),
        onAlertBlockChange: jest.fn(),
        onRecoveryBlockChange: jest.fn(),
      },
    });
    expect(screen.getByTestId('querySandboxEsqlQueryTitle')).toBeInTheDocument();
    expect(screen.getByTestId('querySandboxUseSingleEditor')).toHaveTextContent('Use single editor');
    expect(screen.getByTestId('querySandboxSeparateQueryHelper')).toHaveTextContent(
      'Define the base query and alert condition separately. Automatic query splitting is disabled in this mode.'
    );
    expect(screen.getByTestId('querySandboxSeparateQueryHelper')).toHaveTextContent(
      'Prefer one editor?'
    );
    expect(screen.getByText('Base')).toBeInTheDocument();
    expect(screen.getByText('Alert')).toBeInTheDocument();
  });

  it('renders ES|QL title, YAML helper, and tabs in YAML mode without mode-switch links', () => {
    renderSandbox({
      showYamlQueryHeader: true,
      tabProps: {
        tabs: ['base', 'alert', 'recovery'],
        activeTab: 'alert',
        onTabChange: jest.fn(),
        baseQuery: 'FROM logs-*',
        alertBlock: '| WHERE count > 100',
        recoveryBlock: '| WHERE count < 50',
        onBaseQueryChange: jest.fn(),
        onAlertBlockChange: jest.fn(),
        onRecoveryBlockChange: jest.fn(),
      },
    });
    expect(screen.getByTestId('querySandboxEsqlQueryTitle')).toBeInTheDocument();
    expect(screen.getByTestId('querySandboxSeparateQueryHelper')).toHaveTextContent(
      'Edit in YAML view or in this query sandbox. Apply changes to update the YAML. Each query block is on its own tab.'
    );
    expect(screen.queryByTestId('querySandboxSeparateBaseAndAlert')).not.toBeInTheDocument();
    expect(screen.queryByTestId('querySandboxUseSingleEditor')).not.toBeInTheDocument();
    expect(screen.getByText('Base')).toBeInTheDocument();
    expect(screen.getByText('Alert')).toBeInTheDocument();
    expect(screen.getByText('Recovery')).toBeInTheDocument();
  });

  it('renders signal title and helper without split-query copy', () => {
    renderSandbox({ showSignalQueryHeader: true });

    expect(screen.getByTestId('querySandboxEsqlQueryTitle')).toHaveTextContent('ES|QL query');
    expect(screen.getByTestId('querySandboxSeparateQueryHelper')).toHaveTextContent(
      'Define what to detect with ES|QL. Each match is recorded as a signal for querying and investigation, without alert lifecycle or notifications.'
    );
    expect(screen.queryByTestId('querySandboxSeparateBaseAndAlert')).not.toBeInTheDocument();
    expect(screen.queryByTestId('querySandboxUseSingleEditor')).not.toBeInTheDocument();
    expect(screen.getByTestId('querySandboxSeparateQueryHelper')).not.toHaveTextContent(
      'base query and alert condition'
    );
  });

  it('renders recovery title, helper, and split editor without a tab bar in recovery-only sandbox', () => {
    renderSandbox({
      showRecoveryQueryHeader: true,
      tabProps: {
        tabs: ['recovery'],
        activeTab: 'recovery',
        onTabChange: jest.fn(),
        baseQuery: 'FROM logs-* | STATS c = COUNT(*) BY host',
        alertBlock: '| WHERE c > 100',
        recoveryBlock: '| WHERE c < 50',
        onBaseQueryChange: jest.fn(),
        onAlertBlockChange: jest.fn(),
        onRecoveryBlockChange: jest.fn(),
      },
    });
    expect(screen.getByTestId('querySandboxEsqlQueryTitle')).toHaveTextContent(
      'Recovery condition'
    );
    expect(screen.getByTestId('querySandboxSeparateQueryHelper')).toHaveTextContent(
      'Define when the alert should recover. This ES|QL block is evaluated against the base query.'
    );
    expect(screen.getByTestId('mockComposeDiscoverTabs')).toBeInTheDocument();
    expect(screen.queryByTestId('querySandboxTab-recovery')).not.toBeInTheDocument();
  });

  it('shows "Run your query" prompt when hasRun is false', () => {
    renderSandbox();
    expect(screen.getByText('Run your query to see results')).toBeInTheDocument();
  });

  it('calls run on mount when autoRun is true', () => {
    renderSandbox({ autoRun: true });
    expect(mockRun).toHaveBeenCalledTimes(1);
  });

  it('does not call run on mount when autoRun is false', () => {
    renderSandbox({ autoRun: false });
    expect(mockRun).not.toHaveBeenCalled();
  });

  it('shows loading spinner when loading after a run', () => {
    mockExecutionResult = { ...defaultExecutionResult, hasRun: true, isLoading: true };
    renderSandbox();
    const spinners = screen.getAllByRole('progressbar');
    expect(spinners.length).toBeGreaterThanOrEqual(2);
  });

  it('shows error callout when query errors', () => {
    mockExecutionResult = {
      ...defaultExecutionResult,
      hasRun: true,
      isError: true,
      error: 'Something went wrong',
    };
    renderSandbox();
    expect(screen.getByText('Query error')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('shows "No results" when query returns empty rows', () => {
    mockExecutionResult = { ...defaultExecutionResult, hasRun: true, rows: [] };
    renderSandbox();
    expect(screen.getByText('No results')).toBeInTheDocument();
  });

  it('renders chart and grid when results are present', () => {
    mockExecutionResult = {
      ...defaultExecutionResult,
      hasRun: true,
      columns: [{ id: 'host.name', displayAsText: 'host.name', esType: 'keyword' }],
      rows: [{ 'host.name': 'server-01' }],
      totalRowCount: 1,
      lastExecutedQuery: 'FROM logs-*',
    };
    renderSandbox();
    expect(screen.getByTestId('mockComposeDiscoverChart')).toBeInTheDocument();
    expect(screen.getByText('1 result')).toBeInTheDocument();
  });

  it('shows result count with plural form', () => {
    mockExecutionResult = {
      ...defaultExecutionResult,
      hasRun: true,
      columns: [{ id: 'host.name', displayAsText: 'host.name', esType: 'keyword' }],
      rows: [{ 'host.name': 'server-01' }, { 'host.name': 'server-02' }],
      totalRowCount: 2,
      lastExecutedQuery: 'FROM logs-*',
    };
    renderSandbox();
    expect(screen.getByText('2 results')).toBeInTheDocument();
  });

  it('disables time field selector when onTimeFieldChange is absent', () => {
    renderSandbox();
    expect(screen.getByTestId('querySandboxTimeField')).toBeDisabled();
  });

  it('enables time field selector when onTimeFieldChange is provided', () => {
    renderSandbox({ onTimeFieldChange: jest.fn() });
    expect(screen.getByTestId('querySandboxTimeField')).not.toBeDisabled();
  });
});
