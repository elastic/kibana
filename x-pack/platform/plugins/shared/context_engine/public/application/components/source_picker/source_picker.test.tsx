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
import { fireEvent, render, screen, within } from '@testing-library/react';
import React, { useState } from 'react';
import { SourcePicker } from './source_picker';
import type { SelectedSource } from './types';

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

const addEsqlSource = (query: string) => {
  fireEvent.change(screen.getByTestId('mockEsqlEditor'), { target: { value: query } });
  fireEvent.click(screen.getByTestId('contextAddEsqlSourceButton'));
};

describe('SourcePicker', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('adds a raw ES|QL query as a source from the ES|QL tab', () => {
    renderWithProviders(<Harness />);

    // The add button is disabled until a non-empty query is entered.
    expect(screen.getByTestId('contextAddEsqlSourceButton')).toBeDisabled();

    addEsqlSource('FROM logs-* | LIMIT 10');

    expect(screen.getByTestId('contextSelectedSource-FROM logs-* | LIMIT 10')).toBeInTheDocument();
  });

  it('does not add a duplicate ES|QL query', () => {
    renderWithProviders(<Harness />);

    addEsqlSource('FROM logs-* | LIMIT 10');
    addEsqlSource('FROM logs-* | LIMIT 10');

    expect(screen.getAllByTestId('contextSelectedSource-FROM logs-* | LIMIT 10')).toHaveLength(1);
  });

  it('removes a selected source when its chip is dismissed', () => {
    renderWithProviders(<Harness />);

    addEsqlSource('FROM logs-* | LIMIT 10');

    const chip = screen.getByTestId('contextSelectedSource-FROM logs-* | LIMIT 10');
    fireEvent.click(within(chip).getByRole('button'));

    expect(
      screen.queryByTestId('contextSelectedSource-FROM logs-* | LIMIT 10')
    ).not.toBeInTheDocument();
  });

  it('shows the connectors placeholder when its tab is selected', () => {
    renderWithProviders(<Harness />);

    fireEvent.click(screen.getByTestId('contextSourcePickerTab-connectors'));

    expect(screen.getByTestId('contextConnectorsPlaceholder')).toBeInTheDocument();
  });
});
