/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { I18nProvider } from '@kbn/i18n-react';
import type { SignificantItem } from '@kbn/ml-agg-utils';
import type { GroupTableItem } from '@kbn/aiops-log-rate-analysis/state';

const significantItems: SignificantItem[] = [
  {
    key: 'message:an unexpected error occurred',
    type: 'log_pattern',
    fieldName: 'message',
    fieldValue: 'an unexpected error occurred',
    doc_count: 100,
    bg_count: 10,
    total_doc_count: 1000,
    total_bg_count: 100,
    score: 10,
    pValue: 0.0001,
    normalizedScore: 0.9,
  },
];

const groupTableItems: GroupTableItem[] = [
  {
    id: 'group-1',
    docCount: 100,
    pValue: 0.0001,
    uniqueItemsCount: 1,
    groupItemsSortedByUniqueness: [
      {
        key: significantItems[0].key,
        type: significantItems[0].type,
        fieldName: significantItems[0].fieldName,
        fieldValue: significantItems[0].fieldValue,
        docCount: significantItems[0].doc_count,
        pValue: significantItems[0].pValue,
        duplicate: 1,
      },
    ],
    histogram: undefined,
  },
];

const mockState = {
  logRateAnalysis: {
    earliest: 0,
    latest: 0,
    documentStats: { documentCountStats: undefined },
  },
  logRateAnalysisResults: {
    significantItems,
    zeroDocsFallback: false,
    currentAnalysisType: undefined,
    currentAnalysisWindowParameters: undefined,
  },
  logRateAnalysisTable: {
    pinnedGroup: null,
    selectedGroup: null,
    pinnedSignificantItem: null,
    selectedSignificantItem: null,
  },
  stream: { isRunning: false },
};

jest.mock('@kbn/aiops-log-rate-analysis/state', () => {
  const actual = jest.requireActual('@kbn/aiops-log-rate-analysis/state');
  return {
    ...actual,
    useAppDispatch: () => jest.fn(),
    useAppSelector: (selector: (state: typeof mockState) => unknown) => selector(mockState),
  };
});

jest.mock('../../hooks/use_aiops_app_context', () => ({
  useAiopsAppContext: () => ({
    data: { query: { filterManager: { getFilters: () => [] } }, dataViews: {} },
    uiSettings: {},
    fieldFormats: {},
    charts: { theme: { useChartsBaseTheme: () => ({}) } },
    application: { capabilities: {}, navigateToUrl: jest.fn() },
    share: undefined,
  }),
}));

jest.mock('../../hooks/use_data_source', () => ({
  useDataSource: () => ({ dataView: { id: 'mock-data-view-id' } }),
}));

jest.mock('../../hooks/use_filters_query', () => ({
  useFilterQueryUpdates: () => ({
    filters: [],
    query: { query: '', language: 'kuery' },
    timeRange: { from: 'now-15m', to: 'now' },
    searchBounds: {},
    interval: '1h',
  }),
}));

// eslint-disable-next-line import/order
import { LogRateAnalysisResultsGroupsTable } from './log_rate_analysis_results_table_groups';

const execCommandMock = (global.document.execCommand = jest.fn(() => true));

function renderGroupsTable(parentApi?: unknown) {
  return render(
    <I18nProvider>
      <LogRateAnalysisResultsGroupsTable
        skippedColumns={[]}
        significantItems={significantItems}
        groupTableItems={groupTableItems}
        searchQuery={{}}
        parentApi={parentApi}
      />
    </I18nProvider>
  );
}

async function openRowActionsMenu() {
  await userEvent.click(screen.getByTestId('euiCollapsedItemActionsButton'));
  return screen.findByTestId('aiopsTableActionButtonCopyToClipboard enabled');
}

describe('LogRateAnalysisResultsGroupsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('allows the group row filter/navigation actions to be used when the panel is interactive', async () => {
    renderGroupsTable();

    const copyButton = await openRowActionsMenu();
    await userEvent.click(copyButton);
    expect(execCommandMock).toHaveBeenCalledWith('copy');
  });

  it('hides the group row filter/navigation actions when the panel is non-interactive', () => {
    const parentApi = { disableTriggers$: new BehaviorSubject(true) };
    renderGroupsTable(parentApi);

    expect(screen.queryByTestId('euiCollapsedItemActionsButton')).not.toBeInTheDocument();
  });

  it('still allows rows to be expanded when the panel is non-interactive, hiding actions in the expanded row too', async () => {
    const parentApi = { disableTriggers$: new BehaviorSubject(true) };
    renderGroupsTable(parentApi);

    await userEvent.click(
      screen.getByTestId('aiopsLogRateAnalysisResultsGroupsTableRowExpansionButton')
    );

    const nestedTable = await screen.findByTestId('aiopsLogRateAnalysisResultsTable');
    expect(within(nestedTable).queryByText('Actions')).not.toBeInTheDocument();
    expect(
      within(nestedTable).queryByTestId('euiCollapsedItemActionsButton')
    ).not.toBeInTheDocument();
  });

  it('shows filter/navigation actions in the expanded row when the panel is interactive', async () => {
    renderGroupsTable();

    await userEvent.click(
      screen.getByTestId('aiopsLogRateAnalysisResultsGroupsTableRowExpansionButton')
    );

    const nestedTable = await screen.findByTestId('aiopsLogRateAnalysisResultsTable');
    expect(within(nestedTable).getByText('Actions')).toBeInTheDocument();
  });
});
