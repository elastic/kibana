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
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

const CONNECTORS = [
  { id: 'connector-gdrive', name: 'Google Drive', connector_type_id: '.google_drive' },
  { id: 'connector-github', name: 'GitHub', connector_type_id: '.github' },
  { id: 'connector-slack', name: 'Slack', connector_type_id: '.slack' },
];

const createServices = () => {
  const services = coreMock.createStart();
  services.http.get.mockResolvedValue(CONNECTORS);
  return services;
};

const Harness = ({ initialSources = [] }: { initialSources?: SelectedSource[] }) => {
  const [selectedSources, setSelectedSources] = useState<SelectedSource[]>(initialSources);
  return <SourcePicker selectedSources={selectedSources} onChange={setSelectedSources} />;
};

const renderWithProviders = (ui: React.ReactElement, services = createServices()) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return {
    services,
    ...render(
      <I18nProvider>
        <EuiProvider>
          <KibanaContextProvider services={services}>
            <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
          </KibanaContextProvider>
        </EuiProvider>
      </I18nProvider>
    ),
  };
};

const addEsqlSource = (query: string) => {
  fireEvent.change(screen.getByTestId('mockEsqlEditor'), { target: { value: query } });
  fireEvent.click(screen.getByTestId('contextAddEsqlSourceButton'));
};

const openConnectorsTab = () => {
  fireEvent.click(screen.getByTestId('contextSourcePickerTab-connectors'));
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

    expect(screen.getByTestId('contextSelectedSource-esql-0')).toBeInTheDocument();
  });

  it('does not add a duplicate ES|QL query', () => {
    renderWithProviders(<Harness />);

    addEsqlSource('FROM logs-* | LIMIT 10');
    addEsqlSource('FROM logs-* | LIMIT 10');

    expect(screen.getAllByTestId('contextSelectedSource-esql-0')).toHaveLength(1);
  });

  it('removes a selected source when its remove button is clicked', () => {
    renderWithProviders(<Harness />);

    addEsqlSource('FROM logs-* | LIMIT 10');

    const row = screen.getByTestId('contextSelectedSource-esql-0');
    fireEvent.click(within(row).getByTestId('contextRemoveSourceButton'));

    expect(screen.queryByTestId('contextSelectedSource-esql-0')).not.toBeInTheDocument();
  });

  it('does not fetch connectors on mount when only the ES|QL tab is shown', () => {
    const { services } = renderWithProviders(<Harness />);

    expect(services.http.get).not.toHaveBeenCalled();
  });

  it('lists only the data-retrieval connectors in the connectors tab', async () => {
    const { services } = renderWithProviders(<Harness />);

    openConnectorsTab();

    await waitFor(() => expect(services.http.get).toHaveBeenCalled());
    expect(await screen.findByText('Google Drive')).toBeInTheDocument();
    expect(screen.getByText('GitHub')).toBeInTheDocument();
    // Slack is not a data-retrieval connector, so it must be filtered out.
    expect(screen.queryByText('Slack')).not.toBeInTheDocument();
  });

  it('adds a connector as a source when selected', async () => {
    renderWithProviders(<Harness />);

    openConnectorsTab();

    fireEvent.click(await screen.findByText('Google Drive'));

    const row = await screen.findByTestId('contextSelectedSource-connector-gdrive');
    expect(row).toHaveTextContent('Google Drive');
  });

  it('resolves connector names for restored connector sources', async () => {
    const { services } = renderWithProviders(
      <Harness
        initialSources={[
          {
            type: 'connector',
            id: 'connector-github',
            label: 'connector-github',
            value: 'connector-github',
          },
        ]}
      />
    );

    await waitFor(() => expect(services.http.get).toHaveBeenCalled());

    await waitFor(() =>
      expect(screen.getByTestId('contextSelectedSource-connector-github')).toHaveTextContent(
        'GitHub'
      )
    );
  });

  it('shows an error prompt in the connectors tab when the connector request fails', async () => {
    const services = createServices();
    services.http.get.mockRejectedValue(new Error('Network error'));

    renderWithProviders(<Harness />, services);

    openConnectorsTab();

    expect(await screen.findByTestId('contextConnectorsError')).toBeInTheDocument();
    expect(screen.queryByTestId('contextConnectorsEmpty')).not.toBeInTheDocument();
  });
});
