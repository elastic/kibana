/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, act } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import type { DataViewFieldMap } from '@kbn/data-views-plugin/common';
import type { SandboxDraft } from './types';
import { QuerySandboxFlyout, type QuerySandboxFlyoutProps } from './query_sandbox_flyout';

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

jest.mock('./use_query_execution', () => ({
  useQueryExecution: () => ({
    columns: [],
    rows: [],
    totalRowCount: 0,
    isLoading: false,
    isError: false,
    error: null,
    run: jest.fn(),
    hasRun: false,
    lastExecutedQuery: null,
  }),
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
}));

const mockField = (name: string, type: string) =>
  ({ name, type, searchable: true, aggregatable: true } as DataViewFieldMap[string]);

const createDraft = (overrides: Partial<SandboxDraft> = {}): SandboxDraft => ({
  base: '',
  breach: 'FROM test-index | LIMIT 10',
  recover: '',
  timeField: '@timestamp',
  dateStart: 'now-15m',
  dateEnd: 'now',
  ...overrides,
});

const defaultProps: QuerySandboxFlyoutProps = {
  draft: createDraft(),
  onDraftChange: jest.fn(),
  tabConfig: { type: 'single' },
  activeTab: 'alert',
  onTabChange: jest.fn(),
  onClose: jest.fn(),
};

const renderSandbox = (overrides: Partial<QuerySandboxFlyoutProps> = {}) =>
  render(
    <IntlProvider locale="en">
      <QuerySandboxFlyout {...defaultProps} {...overrides} />
    </IntlProvider>
  );

describe('QuerySandboxFlyout — timefield auto-select', () => {
  beforeEach(() => {
    mockFieldMap = {};
    jest.clearAllMocks();
  });

  it('auto-selects first date field when current timeField is not in the index', () => {
    const onDraftChange = jest.fn();
    mockFieldMap = {
      'event.start': mockField('event.start', 'date'),
      'event.end': mockField('event.end', 'date'),
      'host.name': mockField('host.name', 'keyword'),
    };

    renderSandbox({
      draft: createDraft({ timeField: '@timestamp' }),
      onDraftChange,
    });

    expect(onDraftChange).toHaveBeenCalledWith({
      timeField: expect.stringMatching(/^event\.(end|start)$/),
    });
  });

  it('resets to @timestamp when fieldMap is empty and current timeField differs', () => {
    const onDraftChange = jest.fn();
    mockFieldMap = {};

    renderSandbox({
      draft: createDraft({ timeField: 'event.start' }),
      onDraftChange,
    });

    expect(onDraftChange).toHaveBeenCalledWith({ timeField: '@timestamp' });
  });

  it('does not call onDraftChange when current timeField exists in the index', () => {
    const onDraftChange = jest.fn();
    mockFieldMap = {
      '@timestamp': mockField('@timestamp', 'date'),
      'event.end': mockField('event.end', 'date'),
    };

    renderSandbox({
      draft: createDraft({ timeField: '@timestamp' }),
      onDraftChange,
    });

    expect(onDraftChange).not.toHaveBeenCalled();
  });

  it('does not reset when fieldMap is empty and timeField is already @timestamp', () => {
    const onDraftChange = jest.fn();
    mockFieldMap = {};

    renderSandbox({
      draft: createDraft({ timeField: '@timestamp' }),
      onDraftChange,
    });

    expect(onDraftChange).not.toHaveBeenCalled();
  });

  it('auto-selects when fieldMap changes and current selection is no longer valid', () => {
    const onDraftChange = jest.fn();
    mockFieldMap = {
      'event.start': mockField('event.start', 'date'),
    };

    const { rerender } = renderSandbox({
      draft: createDraft({ timeField: 'event.start' }),
      onDraftChange,
    });

    expect(onDraftChange).not.toHaveBeenCalled();

    mockFieldMap = {
      created_at: mockField('created_at', 'date'),
    };

    act(() => {
      rerender(
        <IntlProvider locale="en">
          <QuerySandboxFlyout
            {...defaultProps}
            draft={createDraft({ timeField: 'event.start' })}
            onDraftChange={onDraftChange}
          />
        </IntlProvider>
      );
    });

    expect(onDraftChange).toHaveBeenCalledWith({ timeField: 'created_at' });
  });
});
