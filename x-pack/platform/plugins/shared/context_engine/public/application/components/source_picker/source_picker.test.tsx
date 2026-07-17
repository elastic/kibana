/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { getViews } from '@kbn/esql-utils';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React, { useState } from 'react';
import { SourcePicker } from './source_picker';
import type { SelectedSource } from './types';

jest.mock('@kbn/esql-utils', () => ({
  getViews: jest.fn(),
}));

jest.mock('@kbn/esql/public', () => ({
  ESQLLangEditor: ({
    query,
    onTextLangQueryChange,
  }: {
    query: { esql: string };
    onTextLangQueryChange: (query: { esql: string }) => void;
  }) => (
    <textarea
      data-test-subj="mockEsqlEditor"
      value={query.esql}
      onChange={(event) => onTextLangQueryChange({ esql: event.target.value })}
    />
  ),
}));

const getViewsMock = getViews as jest.MockedFunction<typeof getViews>;

const VIEWS = [
  { name: 'BigQuery revenue view', query: 'FROM bigquery-export-* | STATS revenue BY account' },
  { name: 'Product analytics view', query: 'FROM analytics-events | WHERE event_type == "x"' },
];

const Harness = () => {
  const [selectedSources, setSelectedSources] = useState<SelectedSource[]>([]);
  return <SourcePicker selectedSources={selectedSources} onChange={setSelectedSources} />;
};

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={coreMock.createStart()}>{ui}</KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );

// The raw ES|QL tab is selected by default, so view-tab assertions must first
// switch to the ES|QL Views tab.
const openEsqlViewsTab = () =>
  fireEvent.click(screen.getByTestId('contextSourcePickerTab-esqlViews'));

describe('SourcePicker', () => {
  beforeEach(() => {
    getViewsMock.mockResolvedValue({ views: VIEWS });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('lists the ES|QL views returned by the API', async () => {
    renderWithProviders(<Harness />);
    openEsqlViewsTab();

    await waitFor(() => {
      expect(screen.getByTestId('contextEsqlViewRow-BigQuery revenue view')).toBeInTheDocument();
    });
    expect(screen.getByTestId('contextEsqlViewRow-Product analytics view')).toBeInTheDocument();
  });

  it('toggles a view selection when its button is clicked twice', async () => {
    renderWithProviders(<Harness />);
    openEsqlViewsTab();

    await waitFor(() => {
      expect(screen.getByTestId('contextAddEsqlViewButton-BigQuery revenue view')).toBeEnabled();
    });

    const toggleButton = screen.getByTestId('contextAddEsqlViewButton-BigQuery revenue view');

    fireEvent.click(toggleButton);
    expect(screen.getByTestId('contextSelectedSource-BigQuery revenue view')).toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(toggleButton);
    expect(
      screen.queryByTestId('contextSelectedSource-BigQuery revenue view')
    ).not.toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('does not show the source type tag or an "Added" badge in the editable picker list', async () => {
    renderWithProviders(<Harness />);
    openEsqlViewsTab();

    await waitFor(() => {
      expect(screen.getByTestId('contextAddEsqlViewButton-BigQuery revenue view')).toBeEnabled();
    });

    // The type tag only belongs on the read-only detail list, not the picker.
    expect(
      screen.queryByTestId('contextEsqlViewTypeBadge-BigQuery revenue view')
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('contextAddEsqlViewButton-BigQuery revenue view'));

    // Selecting adds a chip, but no "Added" badge is shown on the picker row.
    expect(screen.getByTestId('contextSelectedSource-BigQuery revenue view')).toBeInTheDocument();
    expect(
      screen.queryByTestId('contextEsqlViewAddedBadge-BigQuery revenue view')
    ).not.toBeInTheDocument();
  });

  it('removes a selected source when its chip is dismissed', async () => {
    renderWithProviders(<Harness />);
    openEsqlViewsTab();

    await waitFor(() => {
      expect(screen.getByTestId('contextAddEsqlViewButton-BigQuery revenue view')).toBeEnabled();
    });

    fireEvent.click(screen.getByTestId('contextAddEsqlViewButton-BigQuery revenue view'));

    const chip = screen.getByTestId('contextSelectedSource-BigQuery revenue view');
    fireEvent.click(within(chip).getByRole('button'));

    expect(
      screen.queryByTestId('contextSelectedSource-BigQuery revenue view')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('contextAddEsqlViewButton-BigQuery revenue view')).toBeEnabled();
  });

  it('adds a raw ES|QL query as a source from the ES|QL tab', async () => {
    renderWithProviders(<Harness />);

    await waitFor(() => {
      expect(screen.getByTestId('contextSourcePickerTab-esql')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('contextSourcePickerTab-esql'));

    // The add button is disabled until a non-empty query is entered.
    expect(screen.getByTestId('contextAddEsqlSourceButton')).toBeDisabled();

    fireEvent.change(screen.getByTestId('mockEsqlEditor'), {
      target: { value: 'FROM logs-* | LIMIT 10' },
    });
    fireEvent.click(screen.getByTestId('contextAddEsqlSourceButton'));

    expect(screen.getByTestId('contextSelectedSource-FROM logs-* | LIMIT 10')).toBeInTheDocument();
  });

  it('shows the connectors placeholder when its tab is selected', async () => {
    renderWithProviders(<Harness />);

    await waitFor(() => {
      expect(screen.getByTestId('contextSourcePickerTab-connectors')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('contextSourcePickerTab-connectors'));

    expect(screen.getByTestId('contextConnectorsPlaceholder')).toBeInTheDocument();
  });
});
