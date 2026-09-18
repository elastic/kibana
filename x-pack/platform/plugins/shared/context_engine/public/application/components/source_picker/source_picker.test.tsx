/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MatchedItem } from '@kbn/data-views-plugin/public';
import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
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

const SUPPORTED_TYPES = [
  { id: '.google_drive', name: 'Google Drive', supported_feature_ids: ['contextEngine'] },
  { id: '.github', name: 'GitHub', supported_feature_ids: ['contextEngine'] },
];

const buildMatchedItem = (name: string): MatchedItem => ({
  name,
  tags: [],
  item: { name },
});

const INDEX_MATCHES = [
  buildMatchedItem('logs-*'),
  buildMatchedItem('metrics-*'),
  buildMatchedItem('.ds-traces-default'),
];

const createServices = ({
  indices = INDEX_MATCHES,
  indicesError,
}: {
  indices?: MatchedItem[];
  indicesError?: Error;
} = {}) => {
  const services = coreMock.createStart();
  const data = dataPluginMock.createStartContract();
  data.dataViews.getIndices = indicesError
    ? jest.fn().mockRejectedValue(indicesError)
    : jest.fn().mockResolvedValue(indices);

  (services.http.get as jest.Mock).mockImplementation((path: string) => {
    if (path === '/api/actions/connector_types') return Promise.resolve(SUPPORTED_TYPES);
    if (path === '/api/actions/connectors') return Promise.resolve(CONNECTORS);
    return Promise.resolve(undefined);
  });

  return { ...services, data, triggersActionsUi: triggersActionsUiMock.createStart() };
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

const openAdvancedTab = async () => {
  fireEvent.click(screen.getByTestId('contextSourcePickerTab-esql'));
  await screen.findByTestId('contextEsqlTab');
};

const addEsqlSource = async (query: string) => {
  await openAdvancedTab();
  fireEvent.change(screen.getByTestId('mockEsqlEditor'), { target: { value: query } });
  fireEvent.click(screen.getByTestId('contextAddEsqlSourceButton'));
};

const openConnectorsTab = () => {
  fireEvent.click(screen.getByTestId('contextSourcePickerTab-connectors'));
};

const selectIndexSource = async (indexName: string) => {
  const comboBox = screen.getByTestId('contextIndexComboBox');
  const input = within(comboBox).getByRole('combobox');

  fireEvent.focus(input);
  fireEvent.click(input);
  fireEvent.click(await screen.findByText(indexName));
  fireEvent.click(screen.getByTestId('contextAddIndexSourceButton'));
};

describe('SourcePicker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('selects the Index tab by default', () => {
    renderWithProviders(<Harness />);

    expect(screen.getByTestId('contextIndexTab')).toBeInTheDocument();
    expect(screen.queryByTestId('contextEsqlTab')).not.toBeInTheDocument();
  });

  it('adds an index selection as an ES|QL source from the Index tab', async () => {
    const { services } = renderWithProviders(<Harness />);

    await waitFor(() => expect(services.data.dataViews.getIndices).toHaveBeenCalled());

    await selectIndexSource('logs-*');

    const row = screen.getByTestId('contextSelectedSource-esql-0');
    expect(row).toHaveTextContent('FROM logs-*');
  });

  it('does not add a duplicate index source', async () => {
    renderWithProviders(<Harness />);

    await selectIndexSource('logs-*');
    await selectIndexSource('logs-*');

    expect(screen.getAllByTestId('contextSelectedSource-esql-0')).toHaveLength(1);
  });

  it('shows an error prompt in the Index tab when the indices request fails', async () => {
    renderWithProviders(<Harness />, createServices({ indicesError: new Error('Network error') }));

    expect(await screen.findByTestId('contextIndexTabError')).toBeInTheDocument();
  });

  it('adds a raw ES|QL query as a source from the Advanced tab', async () => {
    renderWithProviders(<Harness />);

    await openAdvancedTab();

    // The add button is disabled until a non-empty query is entered.
    expect(screen.getByTestId('contextAddEsqlSourceButton')).toBeDisabled();

    await addEsqlSource('FROM logs-* | LIMIT 10');

    expect(screen.getByTestId('contextSelectedSource-esql-0')).toBeInTheDocument();
  });

  it('does not add a duplicate ES|QL query', async () => {
    renderWithProviders(<Harness />);

    await addEsqlSource('FROM logs-* | LIMIT 10');
    await addEsqlSource('FROM logs-* | LIMIT 10');

    expect(screen.getAllByTestId('contextSelectedSource-esql-0')).toHaveLength(1);
  });

  it('removes a selected source when its remove button is clicked', async () => {
    renderWithProviders(<Harness />);

    await addEsqlSource('FROM logs-* | LIMIT 10');

    const row = screen.getByTestId('contextSelectedSource-esql-0');
    fireEvent.click(within(row).getByTestId('contextRemoveSourceButton'));

    expect(screen.queryByTestId('contextSelectedSource-esql-0')).not.toBeInTheDocument();
  });

  it('does not fetch connectors on mount when only the Index tab is shown', () => {
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

    const row = await screen.findByTestId('contextSelectedSource-connector-0');
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
      expect(screen.getByTestId('contextSelectedSource-connector-0')).toHaveTextContent('GitHub')
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
