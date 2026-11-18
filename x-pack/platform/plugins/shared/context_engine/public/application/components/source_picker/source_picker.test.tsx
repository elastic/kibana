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
import { contextEngineQueryKeys } from '../../hooks/query_keys';
import { SourcePicker } from './source_picker';
import type { SelectedSource } from './types';

const getHttpPath = (pathOrOptions: string | { path: string }): string =>
  typeof pathOrOptions === 'string' ? pathOrOptions : pathOrOptions.path;

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

const INDEX_SEARCH_DEBOUNCE_MS = 300;

const createServices = ({
  indices = INDEX_MATCHES,
  indicesError,
  canReadConnectors = true,
  resolveIndices,
}: {
  indices?: MatchedItem[];
  indicesError?: Error;
  canReadConnectors?: boolean;
  resolveIndices?: (pattern: string) => MatchedItem[] | Promise<MatchedItem[]>;
} = {}) => {
  const services = coreMock.createStart();
  services.application.capabilities = {
    ...services.application.capabilities,
    actions: {
      ...services.application.capabilities.actions,
      show: canReadConnectors,
      save: canReadConnectors,
    },
  };
  const data = dataPluginMock.createStartContract();
  if (resolveIndices) {
    data.dataViews.getIndices = jest.fn(({ pattern }: { pattern: string }) =>
      Promise.resolve(resolveIndices(pattern))
    );
  } else if (indicesError) {
    data.dataViews.getIndices = jest.fn().mockRejectedValue(indicesError);
  } else {
    data.dataViews.getIndices = jest.fn().mockResolvedValue(indices);
  }

  (services.http.get as jest.Mock).mockImplementation(
    (pathOrOptions: string | { path: string }) => {
      const path = getHttpPath(pathOrOptions);
      if (path === '/api/actions/connector_types') return Promise.resolve(SUPPORTED_TYPES);
      if (path === '/api/actions/connectors') return Promise.resolve(CONNECTORS);
      return Promise.resolve(undefined);
    }
  );

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
    queryClient,
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

const openAdvancedEsqlAccordion = async () => {
  fireEvent.click(screen.getByTestId('contextAdvancedEsqlAccordionButton'));
  await screen.findByTestId('mockEsqlEditor');
};

const addEsqlSource = async (query: string) => {
  await openAdvancedEsqlAccordion();
  fireEvent.change(screen.getByTestId('mockEsqlEditor'), { target: { value: query } });
  fireEvent.click(screen.getByTestId('contextAddEsqlSourceButton'));
};

const waitForConnectorQueries = async (queryClient: QueryClient) => {
  await waitFor(() => {
    const typesQuery = queryClient.getQueryState(contextEngineQueryKeys.connectors.types());
    const listQuery = queryClient.getQueryState(contextEngineQueryKeys.connectors.list());
    expect(typesQuery?.status).toBe('success');
    expect(listQuery?.status).toBe('success');
  });
};

const openConnectorOptions = async (
  services: ReturnType<typeof createServices>,
  queryClient: QueryClient
) => {
  const comboBox = await screen.findByTestId('contextConnectorComboBox');
  fireEvent.focus(within(comboBox).getByRole('combobox'));
  await waitFor(() => expect(services.http.get).toHaveBeenCalled());
  await waitForConnectorQueries(queryClient);
  const input = within(comboBox).getByRole('combobox');
  fireEvent.focus(input);
  fireEvent.click(input);
  await waitFor(() => {
    expect(screen.getByRole('option', { name: 'Google Drive' })).toBeInTheDocument();
  });
};

const getConnectorOptionByName = (name: string) => screen.getByRole('option', { name });

const selectIndexSource = async (indexName: string) => {
  fireEvent.click(await screen.findByTestId(`contextIndexOption-${indexName}`));
};

const typeIndexSearch = async (value: string) => {
  fireEvent.change(screen.getByTestId('contextIndexSearch'), { target: { value } });
  jest.advanceTimersByTime(INDEX_SEARCH_DEBOUNCE_MS);
  await waitFor(() => expect(screen.getByTestId('contextIndexSelectable')).toBeInTheDocument());
};

const resolveIndicesForSearchTests = (pattern: string): MatchedItem[] => {
  if (pattern === '*nginx*,-.*') {
    return [buildMatchedItem('logs-nginx')];
  }
  if (pattern === '*metrics*,-.*') {
    return [buildMatchedItem('metrics-*'), buildMatchedItem('logs-nginx')];
  }
  if (pattern === '*,-.*') {
    return INDEX_MATCHES;
  }
  return [];
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

  it('renders both Elasticsearch data and Connectors sections on mount', () => {
    renderWithProviders(<Harness />);

    expect(screen.getByTestId('contextElasticsearchDataPanel')).toBeInTheDocument();
    expect(screen.getByTestId('contextElasticsearchSourcesPanel')).toBeInTheDocument();
    expect(screen.getByTestId('contextConnectorsPanel')).toBeInTheDocument();
    expect(screen.getByTestId('contextConnectorsTab')).toBeInTheDocument();
    expect(screen.getByTestId('contextIndexSelectable')).toBeInTheDocument();
    expect(screen.getByTestId('contextAdvancedEsqlAccordion')).toBeInTheDocument();
    expect(screen.getByTestId('mockEsqlEditor')).not.toBeVisible();
  });

  it('adds an index selection as an ES|QL source from the index picker', async () => {
    renderWithProviders(<Harness />);

    await screen.findByTestId('contextIndexOption-logs-*');
    await selectIndexSource('logs-*');

    const row = screen.getByTestId('contextSelectedSource-esql-0');
    expect(row).toHaveTextContent('FROM logs-*');
    expect(screen.queryByTestId('contextIndexOption-logs-*')).not.toBeInTheDocument();
  });

  it('keeps previously picked indices when picking another one', async () => {
    renderWithProviders(<Harness />);

    await selectIndexSource('logs-*');
    await selectIndexSource('metrics-*');

    expect(screen.getAllByTestId(/^contextSelectedSource-esql-/)).toHaveLength(2);
    expect(screen.getByTestId('contextSelectedSource-esql-0')).toHaveTextContent('FROM metrics-*');
    expect(screen.getByTestId('contextSelectedSource-esql-1')).toHaveTextContent('FROM logs-*');
    expect(screen.queryByTestId('contextIndexOption-logs-*')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextIndexOption-metrics-*')).not.toBeInTheDocument();
  });

  it('does not add a duplicate index source', async () => {
    renderWithProviders(<Harness />);

    await selectIndexSource('logs-*');
    expect(screen.getAllByTestId(/^contextSelectedSource-esql-/)).toHaveLength(1);
    expect(screen.queryByTestId('contextIndexOption-logs-*')).not.toBeInTheDocument();
    expect(screen.getByTestId('contextIndexOption-metrics-*')).toBeInTheDocument();
  });

  it('removes a selected index from the list and shows the option again in the picker', async () => {
    renderWithProviders(<Harness />);

    await selectIndexSource('logs-*');
    expect(screen.queryByTestId('contextIndexOption-logs-*')).not.toBeInTheDocument();

    const row = screen.getByTestId('contextSelectedSource-esql-0');
    fireEvent.click(within(row).getByTestId('contextRemoveSourceButton'));

    expect(screen.queryByTestId('contextSelectedSource-esql-0')).not.toBeInTheDocument();
    expect(await screen.findByTestId('contextIndexOption-logs-*')).toBeInTheDocument();
  });

  it('hides index options only for simple FROM sources in the initial selection', async () => {
    const { unmount: unmountSimpleFrom } = renderWithProviders(
      <Harness
        initialSources={[
          { type: 'esql', id: 'FROM logs-*', label: 'FROM logs-*', value: 'FROM logs-*' },
        ]}
      />
    );

    await screen.findByTestId('contextIndexOption-metrics-*');
    expect(screen.queryByTestId('contextIndexOption-logs-*')).not.toBeInTheDocument();
    unmountSimpleFrom();

    renderWithProviders(
      <Harness
        initialSources={[
          {
            type: 'esql',
            id: 'FROM a,b',
            label: 'FROM a,b',
            value: 'FROM a,b',
          },
          {
            type: 'esql',
            id: 'FROM logs-* | LIMIT 1',
            label: 'FROM logs-* | LIMIT 1',
            value: 'FROM logs-* | LIMIT 1',
          },
        ]}
      />
    );

    expect(await screen.findByTestId('contextIndexOption-logs-*')).toBeInTheDocument();
    expect(screen.getByTestId('contextIndexOption-metrics-*')).toBeInTheDocument();
  });

  it('hides selected indices from search results while a search is active', async () => {
    renderWithProviders(
      <Harness />,
      createServices({ resolveIndices: resolveIndicesForSearchTests })
    );

    await screen.findByTestId('contextIndexOption-logs-*');

    await typeIndexSearch('nginx');
    await selectIndexSource('logs-nginx');
    expect(screen.queryByTestId('contextIndexOption-logs-nginx')).not.toBeInTheDocument();

    await typeIndexSearch('metrics');
    await waitFor(() => {
      expect(screen.getByTestId('contextIndexOption-metrics-*')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('contextIndexOption-logs-nginx')).not.toBeInTheDocument();
  });

  it('shows the loading spinner only while the first index list loads', async () => {
    let resolveIndices!: (value: MatchedItem[]) => void;
    const services = createServices();
    services.data.dataViews.getIndices = jest.fn(
      () =>
        new Promise<MatchedItem[]>((resolve) => {
          resolveIndices = resolve;
        })
    );
    renderWithProviders(<Harness />, services);

    expect(await screen.findAllByText('Loading options')).not.toHaveLength(0);
    expect(screen.getByTestId('contextIndexSelectableLoadingBar')).toHaveStyle({
      visibility: 'hidden',
    });

    resolveIndices(INDEX_MATCHES);

    expect(await screen.findByTestId('contextIndexOption-logs-*')).toBeInTheDocument();
    expect(screen.queryAllByText('Loading options')).toHaveLength(0);
  });

  it('keeps the previous index list under a loading bar while a search is pending', async () => {
    renderWithProviders(
      <Harness />,
      createServices({ resolveIndices: resolveIndicesForSearchTests })
    );

    await screen.findByTestId('contextIndexOption-logs-*');
    expect(screen.getByTestId('contextIndexSelectableLoadingBar')).toHaveStyle({
      visibility: 'hidden',
    });

    fireEvent.change(screen.getByTestId('contextIndexSearch'), { target: { value: 'nginx' } });

    expect(screen.getByTestId('contextIndexOption-logs-*')).toBeInTheDocument();
    expect(screen.queryAllByText('Loading options')).toHaveLength(0);
    expect(screen.getByTestId('contextIndexSelectableLoadingBar')).toHaveStyle({
      visibility: 'visible',
    });

    jest.advanceTimersByTime(INDEX_SEARCH_DEBOUNCE_MS);

    expect(await screen.findByTestId('contextIndexOption-logs-nginx')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByTestId('contextIndexSelectableLoadingBar')).toHaveStyle({
        visibility: 'hidden',
      })
    );
  });

  it('does not flash the empty list message when clearing a search without matches', async () => {
    renderWithProviders(
      <Harness />,
      createServices({ resolveIndices: resolveIndicesForSearchTests })
    );

    await screen.findByTestId('contextIndexOption-logs-*');
    await typeIndexSearch('nomatch');
    expect(await screen.findAllByText('No matches for this search.')).not.toHaveLength(0);

    fireEvent.change(screen.getByTestId('contextIndexSearch'), { target: { value: '' } });

    expect(screen.queryAllByText('No matches for this search.')).not.toHaveLength(0);
    expect(screen.queryAllByText('No indices, data streams or aliases found.')).toHaveLength(0);

    jest.advanceTimersByTime(INDEX_SEARCH_DEBOUNCE_MS);

    expect(await screen.findByTestId('contextIndexOption-logs-*')).toBeInTheDocument();
  });

  it('shows the empty list message when there are no indices at all', async () => {
    renderWithProviders(<Harness />, createServices({ indices: [] }));

    expect(
      await screen.findAllByText('No indices, data streams or aliases found.')
    ).not.toHaveLength(0);
  });

  it('adds a raw ES|QL query as a source from the advanced accordion', async () => {
    renderWithProviders(<Harness />);

    await openAdvancedEsqlAccordion();

    expect(screen.getByTestId('contextAddEsqlSourceButton')).toBeDisabled();

    fireEvent.change(screen.getByTestId('mockEsqlEditor'), {
      target: { value: 'FROM logs-* | LIMIT 10' },
    });
    fireEvent.click(screen.getByTestId('contextAddEsqlSourceButton'));

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

  it('lists indices on mount without fetching connectors', async () => {
    const { services } = renderWithProviders(<Harness />);

    await screen.findByTestId('contextIndexOption-logs-*');
    expect(services.http.get).not.toHaveBeenCalled();
    expect(services.data.dataViews.getIndices).toHaveBeenCalled();
  });

  it('lists only the data-retrieval connectors in the connectors tab', async () => {
    const { services, queryClient } = renderWithProviders(<Harness />);

    await openConnectorOptions(services, queryClient);

    expect(getConnectorOptionByName('Google Drive')).toHaveTextContent('Google Drive');
    expect(getConnectorOptionByName('GitHub')).toHaveTextContent('GitHub');
    // Slack is not a data-retrieval connector, so it must be filtered out.
    expect(screen.queryByRole('option', { name: 'Slack' })).not.toBeInTheDocument();
  });

  it('adds a connector as a source when selected', async () => {
    const { services, queryClient } = renderWithProviders(<Harness />);

    await openConnectorOptions(services, queryClient);
    fireEvent.click(getConnectorOptionByName('Google Drive'));

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

  it('does not fetch connectors for restored connector sources without Actions read', () => {
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
      />,
      createServices({ canReadConnectors: false })
    );

    expect(services.http.get).not.toHaveBeenCalled();
    expect(screen.getByTestId('contextSelectedSource-connector-0')).toHaveTextContent(
      'connector-github'
    );
  });

  it('shows an error prompt in the connectors tab when the connector request fails', async () => {
    const services = createServices();
    services.http.get.mockRejectedValue(new Error('Network error'));

    renderWithProviders(<Harness />, services);

    const comboBox = await screen.findByTestId('contextConnectorComboBox');
    fireEvent.focus(within(comboBox).getByRole('combobox'));

    expect(await screen.findByTestId('contextConnectorsError')).toBeInTheDocument();
    expect(screen.queryByTestId('contextConnectorsEmpty')).not.toBeInTheDocument();
  });
});
