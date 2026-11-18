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
import React from 'react';
import type { GetAiIndexResponse } from '../../../../../common/http_api/ai_indices';
import { createConnectorHttpGetMock, expectConnectorQueriesLoaded } from './connector_test_helpers';
import { SourcesPanel } from './sources_panel';

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

const baseAiIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [],
  sources: [],
  traces: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const createServices = ({
  canReadConnectors = true,
  indices = INDEX_MATCHES,
}: {
  canReadConnectors?: boolean;
  indices?: MatchedItem[];
} = {}) => {
  const services = coreMock.createStart();
  services.application.capabilities = {
    ...services.application.capabilities,
    actions: {
      ...services.application.capabilities.actions,
      save: canReadConnectors,
      show: canReadConnectors,
    },
  };

  const data = dataPluginMock.createStartContract();
  data.dataViews.getIndices = jest.fn().mockResolvedValue(indices);

  (services.http.get as jest.Mock).mockImplementation(createConnectorHttpGetMock());

  return {
    ...services,
    data,
    triggersActionsUi: triggersActionsUiMock.createStart(),
  };
};

const renderWithProviders = (
  ui: React.ReactElement,
  services = createServices()
): { services: ReturnType<typeof createServices>; queryClient: QueryClient } => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
  return { services, queryClient };
};

const clickIndexOption = async (indexName: string) => {
  fireEvent.click(await screen.findByTestId(`contextIndexOption-${indexName}`));
};

const openElasticsearchAddPanel = () => {
  fireEvent.click(screen.getByTestId('contextAddElasticsearchDataCard'));
};

const openConnectorsAddPanel = () => {
  fireEvent.click(screen.getByTestId('contextAddConnectorsCard'));
};

const propertiesBody = (sources: GetAiIndexResponse['sources']) =>
  JSON.stringify({
    dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
    automations: [],
    sources,
    traces: [],
  });

describe('SourcesPanel', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows the loading skeleton while loading and no rows', () => {
    renderWithProviders(
      <SourcesPanel isLoading aiIndex={undefined} onSaved={jest.fn()} isManaged={false} />
    );

    expect(screen.getByTestId('contextAiIndexSourcesLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('contextSelectedSource-esql-0')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextAddElasticsearchDataCard')).not.toBeInTheDocument();
  });

  it('shows type panels, empty copy, and add cards when not loading with no sources', () => {
    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{ ...baseAiIndex, sources: [] }}
        onSaved={jest.fn()}
        isManaged={false}
      />
    );

    expect(screen.getByTestId('contextSourcesPanel')).toBeInTheDocument();
    expect(screen.getByTestId('contextElasticsearchDataPanel')).toBeInTheDocument();
    expect(screen.getByTestId('contextConnectorsPanel')).toBeInTheDocument();
    expect(screen.getByText('No Elasticsearch data sources.')).toBeInTheDocument();
    expect(screen.getByText('No connectors.')).toBeInTheDocument();
    expect(screen.getByTestId('contextAddElasticsearchDataCard')).toBeInTheDocument();
    expect(screen.getByTestId('contextAddConnectorsCard')).toBeInTheDocument();
    expect(
      screen.getByText(/Context reads these sources to write knowledge documents/)
    ).toBeInTheDocument();
  });

  it('shows read-only type panels with per-type empty copy for managed AI indexes with no sources', () => {
    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{ ...baseAiIndex, sources: [], managed: true }}
        onSaved={jest.fn()}
        isManaged
      />
    );

    expect(screen.getByTestId('contextElasticsearchDataPanel')).toBeInTheDocument();
    expect(screen.getByTestId('contextConnectorsPanel')).toBeInTheDocument();
    expect(screen.getByText('No Elasticsearch data sources.')).toBeInTheDocument();
    expect(screen.getByText('No connectors.')).toBeInTheDocument();
    expect(screen.queryByTestId('contextAddElasticsearchDataCard')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextAddConnectorsCard')).not.toBeInTheDocument();
  });

  it('renders saved Elasticsearch sources for non-managed indexes', () => {
    const sources = [
      { type: 'esql' as const, value: 'FROM a' },
      { type: 'esql' as const, value: 'FROM b' },
    ];

    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{ ...baseAiIndex, sources }}
        onSaved={jest.fn()}
        isManaged={false}
      />
    );

    expect(screen.getAllByTestId(/^contextSelectedSource-esql-/)).toHaveLength(sources.length);
    expect(screen.getByTestId('contextAddElasticsearchDataCard')).toBeInTheDocument();
  });

  it('renders read-only rows split by type for managed AI indexes with sources', () => {
    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{
          ...baseAiIndex,
          managed: true,
          sources: [
            { type: 'esql', value: 'FROM a' },
            { type: 'connector', value: 'connector-gdrive' },
          ],
        }}
        onSaved={jest.fn()}
        isManaged
      />
    );

    expect(screen.getByTestId('contextSelectedSource-esql-0')).toBeInTheDocument();
    expect(screen.getByTestId('contextSelectedSource-connector-0')).toBeInTheDocument();
    expect(screen.queryByTestId('contextRemoveSourceButton')).not.toBeInTheDocument();
  });

  it('does not request connectors when there are no saved connector sources', () => {
    const { services } = renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{ ...baseAiIndex, sources: [{ type: 'esql', value: 'FROM a' }] }}
        onSaved={jest.fn()}
        isManaged={false}
      />
    );

    expect(services.http.get).not.toHaveBeenCalled();
  });

  it('requests connectors when saved connector sources need display metadata', async () => {
    const { services, queryClient } = renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{
          ...baseAiIndex,
          sources: [{ type: 'connector', value: 'connector-gdrive' }],
        }}
        onSaved={jest.fn()}
        isManaged={false}
      />
    );

    await waitFor(() => {
      expect(services.http.get).toHaveBeenCalledWith(
        '/api/actions/connector_types',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
      expect(services.http.get).toHaveBeenCalledWith(
        '/api/actions/connectors',
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      );
    });
    await waitFor(() => expectConnectorQueriesLoaded(queryClient));
    expect(await screen.findByTestId('contextSelectedSource-connector-0')).toHaveTextContent(
      'Google Drive'
    );
  });

  it('does not request connectors for saved connector sources without Actions read', () => {
    const { services } = renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{
          ...baseAiIndex,
          sources: [{ type: 'connector', value: 'connector-gdrive' }],
        }}
        onSaved={jest.fn()}
        isManaged={false}
      />,
      createServices({ canReadConnectors: false })
    );

    expect(services.http.get).not.toHaveBeenCalled();
  });

  it('hides the Elasticsearch add card while its add panel is open and keeps the connectors add card', () => {
    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{ ...baseAiIndex, sources: [] }}
        onSaved={jest.fn()}
        isManaged={false}
      />
    );

    openElasticsearchAddPanel();
    expect(screen.getByTestId('contextAddElasticsearchDataPanel')).toBeInTheDocument();
    expect(screen.queryByTestId('contextAddElasticsearchDataCard')).not.toBeInTheDocument();
    expect(screen.getByTestId('contextAddConnectorsCard')).toBeInTheDocument();
  });

  it('hides the connectors add card while its add panel is open and keeps the Elasticsearch add card', async () => {
    const { queryClient } = renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{ ...baseAiIndex, sources: [] }}
        onSaved={jest.fn()}
        isManaged={false}
      />
    );

    openConnectorsAddPanel();
    expect(screen.getByTestId('contextAddConnectorsPanel')).toBeInTheDocument();
    expect(screen.queryByTestId('contextAddConnectorsCard')).not.toBeInTheDocument();
    expect(screen.getByTestId('contextAddElasticsearchDataCard')).toBeInTheDocument();
    await waitFor(() => expectConnectorQueriesLoaded(queryClient));
  });

  it('opens the Elasticsearch add panel and disables confirm until a source is pending', async () => {
    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{ ...baseAiIndex, sources: [] }}
        onSaved={jest.fn()}
        isManaged={false}
      />
    );

    openElasticsearchAddPanel();
    expect(screen.getByTestId('contextAddElasticsearchDataPanel')).toBeInTheDocument();
    expect(screen.queryByTestId('contextAddElasticsearchDataCard')).not.toBeInTheDocument();
    expect(screen.getByTestId('contextAddSourcesConfirmButton')).toBeDisabled();

    await clickIndexOption('logs-*');
    expect(screen.getByTestId('contextAddSourcesConfirmButton')).toBeEnabled();
  });

  it('adds index sources on confirm via save', async () => {
    const onSaved = jest.fn();
    const testServices = createServices();
    testServices.http.put.mockResolvedValue({ status: 'updated' });

    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{ ...baseAiIndex, sources: [] }}
        onSaved={onSaved}
        isManaged={false}
      />,
      testServices
    );

    openElasticsearchAddPanel();
    await clickIndexOption('logs-*');
    fireEvent.click(screen.getByTestId('contextAddSourcesConfirmButton'));

    await waitFor(() => {
      expect(testServices.http.put).toHaveBeenCalledWith(
        '/api/context_engine/ai_index/my-ai-index',
        expect.objectContaining({
          body: propertiesBody([{ type: 'esql', value: 'FROM logs-*' }]),
        })
      );
    });
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('contextAddElasticsearchDataPanel')).not.toBeInTheDocument();
    expect(screen.getByTestId('contextAddElasticsearchDataCard')).toBeInTheDocument();
  });

  it('hides saved simple index sources from the index picker', async () => {
    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{ ...baseAiIndex, sources: [{ type: 'esql', value: 'FROM logs-*' }] }}
        onSaved={jest.fn()}
        isManaged={false}
      />
    );

    openElasticsearchAddPanel();
    await screen.findByTestId('contextIndexOption-metrics-*');
    expect(screen.queryByTestId('contextIndexOption-logs-*')).not.toBeInTheDocument();
  });

  it('adds multiple index sources on confirm and shows the plural confirm label', async () => {
    const onSaved = jest.fn();
    const testServices = createServices();
    testServices.http.put.mockResolvedValue({ status: 'updated' });

    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{ ...baseAiIndex, sources: [] }}
        onSaved={onSaved}
        isManaged={false}
      />,
      testServices
    );

    openElasticsearchAddPanel();
    await clickIndexOption('logs-*');
    await clickIndexOption('metrics-*');
    expect(screen.getByTestId('contextAddSourcesConfirmButton')).toHaveTextContent('Add 2 sources');
    fireEvent.click(screen.getByTestId('contextAddSourcesConfirmButton'));

    await waitFor(() => {
      expect(testServices.http.put).toHaveBeenCalledWith(
        '/api/context_engine/ai_index/my-ai-index',
        expect.objectContaining({
          body: propertiesBody([
            { type: 'esql', value: 'FROM logs-*' },
            { type: 'esql', value: 'FROM metrics-*' },
          ]),
        })
      );
    });
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('adds an ES|QL query source after switching modes and confirming', async () => {
    const onSaved = jest.fn();
    const testServices = createServices();
    testServices.http.put.mockResolvedValue({ status: 'updated' });

    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{ ...baseAiIndex, sources: [] }}
        onSaved={onSaved}
        isManaged={false}
      />,
      testServices
    );

    openElasticsearchAddPanel();
    fireEvent.click(screen.getByTestId('contextToggleEsqlModeButton'));
    expect(screen.getByTestId('contextAdvancedEsqlEditor')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('mockEsqlEditor'), {
      target: { value: 'FROM logs-* | LIMIT 10' },
    });
    fireEvent.click(screen.getByTestId('contextAddSourcesConfirmButton'));

    await waitFor(() => {
      expect(testServices.http.put).toHaveBeenCalledWith(
        '/api/context_engine/ai_index/my-ai-index',
        expect.objectContaining({
          body: propertiesBody([{ type: 'esql', value: 'FROM logs-* | LIMIT 10' }]),
        })
      );
    });
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('closes the add panel without saving when Cancel is clicked', async () => {
    const testServices = createServices();

    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{ ...baseAiIndex, sources: [] }}
        onSaved={jest.fn()}
        isManaged={false}
      />,
      testServices
    );

    openElasticsearchAddPanel();
    await clickIndexOption('logs-*');
    fireEvent.click(screen.getByTestId('contextAddSourcesCancelButton'));

    expect(screen.queryByTestId('contextAddElasticsearchDataPanel')).not.toBeInTheDocument();
    expect(screen.getByTestId('contextAddElasticsearchDataCard')).toBeInTheDocument();
    expect(testServices.http.put).not.toHaveBeenCalled();
  });

  it('adds connector sources from the connectors add panel', async () => {
    const onSaved = jest.fn();
    const testServices = createServices();
    testServices.http.put.mockResolvedValue({ status: 'updated' });

    const { queryClient } = renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{ ...baseAiIndex, sources: [] }}
        onSaved={onSaved}
        isManaged={false}
      />,
      testServices
    );

    fireEvent.click(screen.getByTestId('contextAddConnectorsCard'));
    expect(screen.getByTestId('contextAddConnectorsPanel')).toBeInTheDocument();

    await waitFor(() => expectConnectorQueriesLoaded(queryClient));
    const connectorCard = await screen.findByTestId('contextConnectorCard-connector-github');
    fireEvent.click(connectorCard);
    fireEvent.click(screen.getByTestId('contextAddSourcesConfirmButton'));

    await waitFor(() => {
      expect(testServices.http.put).toHaveBeenCalledWith(
        '/api/context_engine/ai_index/my-ai-index',
        expect.objectContaining({
          body: propertiesBody([{ type: 'connector', value: 'connector-github' }]),
        })
      );
    });
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('contextAddConnectorsPanel')).not.toBeInTheDocument();
    expect(screen.getByTestId('contextAddConnectorsCard')).toBeInTheDocument();
  });

  it('adds multiple connector sources on confirm and shows the plural confirm label', async () => {
    const onSaved = jest.fn();
    const testServices = createServices();
    testServices.http.put.mockResolvedValue({ status: 'updated' });

    const { queryClient } = renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{ ...baseAiIndex, sources: [] }}
        onSaved={onSaved}
        isManaged={false}
      />,
      testServices
    );

    openConnectorsAddPanel();
    await waitFor(() => expectConnectorQueriesLoaded(queryClient));
    fireEvent.click(await screen.findByTestId('contextConnectorCard-connector-github'));
    fireEvent.click(screen.getByTestId('contextConnectorCard-connector-gdrive'));
    expect(screen.getByTestId('contextAddSourcesConfirmButton')).toHaveTextContent('Add 2 sources');
    fireEvent.click(screen.getByTestId('contextAddSourcesConfirmButton'));

    await waitFor(() => {
      expect(testServices.http.put).toHaveBeenCalledWith(
        '/api/context_engine/ai_index/my-ai-index',
        expect.objectContaining({
          body: propertiesBody([
            { type: 'connector', value: 'connector-github' },
            { type: 'connector', value: 'connector-gdrive' },
          ]),
        })
      );
    });
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('shows a privilege callout and disables confirm in the connectors add panel without Actions read', async () => {
    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{ ...baseAiIndex, sources: [] }}
        onSaved={jest.fn()}
        isManaged={false}
      />,
      createServices({ canReadConnectors: false })
    );

    openConnectorsAddPanel();
    expect(screen.getByTestId('contextConnectorsMissingReadPrivilegeCallout')).toBeInTheDocument();
    expect(screen.getByTestId('contextAddSourcesConfirmButton')).toBeDisabled();
  });

  it('removes a saved source via save', async () => {
    const onSaved = jest.fn();
    const testServices = createServices();
    testServices.http.put.mockResolvedValue({ status: 'updated' });

    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{
          ...baseAiIndex,
          sources: [
            { type: 'esql', value: 'FROM a' },
            { type: 'esql', value: 'FROM b' },
          ],
        }}
        onSaved={onSaved}
        isManaged={false}
      />,
      testServices
    );

    const row = screen.getByTestId('contextSelectedSource-esql-0');
    fireEvent.click(within(row).getByTestId('contextRemoveSourceButton'));

    await waitFor(() => {
      expect(testServices.http.put).toHaveBeenCalledWith(
        '/api/context_engine/ai_index/my-ai-index',
        expect.objectContaining({
          body: propertiesBody([{ type: 'esql', value: 'FROM b' }]),
        })
      );
    });
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('removes a saved connector source via save', async () => {
    const onSaved = jest.fn();
    const testServices = createServices();
    testServices.http.put.mockResolvedValue({ status: 'updated' });

    const { queryClient } = renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{
          ...baseAiIndex,
          sources: [
            { type: 'connector', value: 'connector-gdrive' },
            { type: 'connector', value: 'connector-github' },
          ],
        }}
        onSaved={onSaved}
        isManaged={false}
      />,
      testServices
    );

    await waitFor(() => expectConnectorQueriesLoaded(queryClient));
    const row = await screen.findByTestId('contextSelectedSource-connector-0');
    fireEvent.click(within(row).getByTestId('contextRemoveSourceButton'));

    await waitFor(() => {
      expect(testServices.http.put).toHaveBeenCalledWith(
        '/api/context_engine/ai_index/my-ai-index',
        expect.objectContaining({
          body: propertiesBody([{ type: 'connector', value: 'connector-github' }]),
        })
      );
    });
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('shows confirm loading while sources are saving', async () => {
    const testServices = createServices();
    testServices.http.put.mockImplementation(() => new Promise(() => {}));

    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{ ...baseAiIndex, sources: [] }}
        onSaved={jest.fn()}
        isManaged={false}
      />,
      testServices
    );

    openElasticsearchAddPanel();
    await clickIndexOption('logs-*');
    fireEvent.click(screen.getByTestId('contextAddSourcesConfirmButton'));

    await waitFor(() => {
      expect(testServices.http.put).toHaveBeenCalled();
      expect(screen.getByTestId('contextAddElasticsearchDataPanel')).toBeInTheDocument();
      expect(screen.getByTestId('contextAddSourcesConfirmButton')).toBeDisabled();
      expect(screen.getByTestId('contextAddSourcesCancelButton')).toBeDisabled();
      expect(screen.getByTestId('contextIndexSearch')).toBeDisabled();
    });
  });

  it('keeps remaining remove buttons disabled until onSaved resolves after a remove', async () => {
    const testServices = createServices();
    testServices.http.put.mockResolvedValue({ status: 'updated' });

    let resolveOnSaved: (() => void) | undefined;
    const onSaved = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveOnSaved = resolve;
        })
    );

    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{
          ...baseAiIndex,
          sources: [
            { type: 'esql', value: 'FROM a' },
            { type: 'esql', value: 'FROM b' },
            { type: 'esql', value: 'FROM c' },
          ],
        }}
        onSaved={onSaved}
        isManaged={false}
      />,
      testServices
    );

    const firstRow = screen.getByTestId('contextSelectedSource-esql-0');
    fireEvent.click(within(firstRow).getByTestId('contextRemoveSourceButton'));

    await waitFor(() => {
      expect(testServices.http.put).toHaveBeenCalled();
      expect(onSaved).toHaveBeenCalledTimes(1);
    });

    const assertRemoveButtonsDisabled = () => {
      screen.getAllByTestId('contextRemoveSourceButton').forEach((button) => {
        expect(button).toBeDisabled();
      });
    };

    await waitFor(assertRemoveButtonsDisabled);

    resolveOnSaved?.();
    await waitFor(() => {
      screen.getAllByTestId('contextRemoveSourceButton').forEach((button) => {
        expect(button).toBeEnabled();
      });
    });
  });
});
