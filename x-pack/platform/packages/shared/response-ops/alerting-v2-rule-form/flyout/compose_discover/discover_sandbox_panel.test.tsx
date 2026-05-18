/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { DiscoverSandboxPanel, type DiscoverSandboxPanelProps } from './discover_sandbox_panel';

const mockRun = jest.fn();
jest.mock('./use_query_execution', () => ({
  useQueryExecution: () => ({
    columns: [],
    rows: [],
    totalRowCount: 0,
    isLoading: false,
    isError: false,
    error: null,
    run: mockRun,
    hasRun: false,
    lastExecutedQuery: null,
  }),
}));

jest.mock('./compose_discover_chart', () => ({
  ComposeDiscoverChart: () => <div data-test-subj="mockChart" />,
}));

jest.mock('../../form/hooks/use_data_fields', () => ({
  useDataFields: () => ({
    data: { '@timestamp': { name: '@timestamp', type: 'date' } },
  }),
}));

jest.mock('@kbn/code-editor', () => ({
  ESQL_LANG_ID: 'esql',
  CodeEditor: ({ value, options }: { value: string; options?: Record<string, unknown> }) => (
    <pre
      data-test-subj="codeEditorMock"
      data-readonly={String(options?.readOnly ?? false)}
      data-dom-readonly={String(options?.domReadOnly ?? false)}
    >
      {value}
    </pre>
  ),
}));

const createMockServices = (): DiscoverSandboxPanelProps['services'] => ({
  http: {} as any,
  data: { search: { search: jest.fn() } } as any,
  dataViews: {} as any,
});

const defaultProps: DiscoverSandboxPanelProps = {
  query: 'FROM logs-* | STATS count() BY host.name',
  timeField: '@timestamp',
  dateStart: 'now-15m',
  dateEnd: 'now',
  onDateRangeChange: jest.fn(),
  onTimeFieldChange: jest.fn(),
  onQueryChange: jest.fn(),
  services: createMockServices(),
};

const renderPanel = (overrides: Partial<DiscoverSandboxPanelProps> = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <DiscoverSandboxPanel {...defaultProps} {...overrides} />
    </QueryClientProvider>
  );
};

describe('DiscoverSandboxPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the code editor with the query', () => {
    renderPanel();
    const editor = screen.getByTestId('codeEditorMock');
    expect(editor).toBeDefined();
    expect(editor.textContent).toContain('FROM logs-*');
  });

  it('renders the time field selector', () => {
    renderPanel();
    expect(screen.getByTestId('composeDiscoverTimeField')).toBeDefined();
  });

  it('renders the search button', () => {
    renderPanel();
    expect(screen.getByTestId('composeDiscoverRunQuery')).toBeDefined();
  });

  it('shows empty prompt before query is run', () => {
    renderPanel();
    expect(screen.getByText('Run your query to see results')).toBeDefined();
  });

  describe('readOnly mode', () => {
    it('sets the editor to readOnly when readOnly is true', () => {
      renderPanel({ readOnly: true });
      const editor = screen.getByTestId('codeEditorMock');
      expect(editor.dataset.readonly).toBe('true');
      expect(editor.dataset.domReadonly).toBe('true');
    });

    it('sets the editor to editable when readOnly is false', () => {
      renderPanel({ readOnly: false });
      const editor = screen.getByTestId('codeEditorMock');
      expect(editor.dataset.readonly).toBe('false');
      expect(editor.dataset.domReadonly).toBe('false');
    });

    it('disables the time field selector when readOnly', () => {
      renderPanel({ readOnly: true });
      const select = screen.getByTestId('composeDiscoverTimeField');
      expect(select).toBeDisabled();
    });

    it('enables the time field selector when not readOnly', () => {
      renderPanel({ readOnly: false });
      const select = screen.getByTestId('composeDiscoverTimeField');
      expect(select).not.toBeDisabled();
    });
  });

  describe('editorSlot', () => {
    it('renders the editorSlot instead of the default editor when provided', () => {
      renderPanel({
        editorSlot: <div data-test-subj="customEditorSlot">Custom editor</div>,
      });
      expect(screen.getByTestId('customEditorSlot')).toBeDefined();
      expect(screen.queryByTestId('codeEditorMock')).toBeNull();
    });

    it('renders the default editor when editorSlot is not provided', () => {
      renderPanel();
      expect(screen.getByTestId('codeEditorMock')).toBeDefined();
    });
  });
});
