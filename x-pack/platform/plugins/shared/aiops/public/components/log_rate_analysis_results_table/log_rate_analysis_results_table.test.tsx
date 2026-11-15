/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { BehaviorSubject } from 'rxjs';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { I18nProvider } from '@kbn/i18n-react';
import type { SignificantItem } from '@kbn/ml-agg-utils';

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
import { LogRateAnalysisResultsTable } from './log_rate_analysis_results_table';

const execCommandMock = (global.document.execCommand = jest.fn(() => true));

function renderTable(parentApi?: unknown) {
  return render(
    <I18nProvider>
      <LogRateAnalysisResultsTable skippedColumns={[]} searchQuery={{}} parentApi={parentApi} />
    </I18nProvider>
  );
}

describe('LogRateAnalysisResultsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders filter/navigation actions and allows them to be used when the panel is interactive', async () => {
    renderTable();

    expect(screen.getByText('Actions')).toBeInTheDocument();

    // EUI collapses the row's actions into a single menu button.
    await userEvent.click(screen.getByTestId('euiCollapsedItemActionsButton'));

    const copyButton = await screen.findByTestId('aiopsTableActionButtonCopyToClipboard enabled');
    await userEvent.click(copyButton);
    expect(execCommandMock).toHaveBeenCalledWith('copy');
  });

  it('hides filter/navigation actions when the panel is non-interactive', () => {
    const parentApi = { disableTriggers$: new BehaviorSubject(true) };
    renderTable(parentApi);

    expect(screen.queryByText('Actions')).not.toBeInTheDocument();
    expect(screen.queryByTestId('euiCollapsedItemActionsButton')).not.toBeInTheDocument();
  });

  it('keeps filter/navigation actions available when disableTriggers$ explicitly reports interactive', async () => {
    const parentApi = { disableTriggers$: new BehaviorSubject(false) };
    renderTable(parentApi);

    await userEvent.click(screen.getByTestId('euiCollapsedItemActionsButton'));
    expect(
      await screen.findByTestId('aiopsTableActionButtonCopyToClipboard enabled')
    ).toBeInTheDocument();
  });
});
