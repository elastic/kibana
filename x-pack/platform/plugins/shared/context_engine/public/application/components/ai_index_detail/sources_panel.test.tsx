/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { triggersActionsUiMock } from '@kbn/triggers-actions-ui-plugin/public/mocks';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { I18nProvider } from '@kbn/i18n-react';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import type { AiIndexSource, GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import type {
  UseDataConnectorsOptions,
  UseDataConnectorsResult,
} from '../../hooks/use_data_connectors';
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

const mockUseDataConnectors = jest.fn(
  (_options?: UseDataConnectorsOptions): UseDataConnectorsResult => ({
    connectors: [{ id: 'connector-gdrive', name: 'Google Drive', actionTypeId: '.google_drive' }],
    connectorNameById: new Map([['connector-gdrive', 'Google Drive']]),
    connectorActionTypeById: new Map([['connector-gdrive', '.google_drive']]),
    isLoading: false,
    isError: false,
    error: undefined,
  })
);

jest.mock('../../hooks/use_data_connectors', () => ({
  useDataConnectors: (options?: UseDataConnectorsOptions) => mockUseDataConnectors(options),
}));

const baseAiIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  managed: false,
  memory_enabled: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [],
  sources: [],
  traces: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const sources: AiIndexSource[] = [
  { type: 'esql', value: 'FROM a' },
  { type: 'esql', value: 'FROM b' },
  { type: 'esql', value: 'FROM c' },
];

const createServices = (canReadConnectors = true) => {
  const services = coreMock.createStart();
  services.application.capabilities = {
    ...services.application.capabilities,
    actions: {
      ...services.application.capabilities.actions,
      show: canReadConnectors,
    },
  };
  return services;
};

const renderWithProviders = (ui: React.ReactElement, services = createServices()) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider
          services={{
            ...services,
            triggersActionsUi: triggersActionsUiMock.createStart(),
          }}
        >
          <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

const saveButton = () => screen.getByTestId('contextEditSourcesDoneButton');

const addEsqlSource = (query: string) => {
  fireEvent.change(screen.getByTestId('mockEsqlEditor'), { target: { value: query } });
  fireEvent.click(screen.getByTestId('contextAddEsqlSourceButton'));
};

describe('SourcesPanel', () => {
  beforeEach(() => {
    mockUseDataConnectors.mockClear();
  });

  it('shows the loading skeleton while loading and no rows', () => {
    renderWithProviders(
      <SourcesPanel isLoading aiIndex={undefined} onSaved={jest.fn()} isManaged={false} />
    );

    expect(screen.getByTestId('contextAiIndexSourcesLoading')).toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexSourceRow')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexSourcesEmpty')).not.toBeInTheDocument();
  });

  it('shows the inline editor immediately when not loading and there are no sources', async () => {
    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{ ...baseAiIndex, sources: [] }}
        onSaved={jest.fn()}
        isManaged={false}
      />
    );

    expect(await screen.findByTestId('contextEditSourcesInlineEditor')).toBeInTheDocument();
    expect(screen.getByTestId('contextSourcePicker')).toBeInTheDocument();
    expect(screen.getAllByTestId('contextElasticsearchDataPanel')).toHaveLength(1);
    expect(screen.getAllByTestId('contextConnectorsPanel')).toHaveLength(1);
    expect(screen.queryByTestId('contextAiIndexSourcesEmpty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextEditSourcesButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextAddSourcesButton')).not.toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
    expect(
      screen.getByText('Data that automations should analyze when generating Knowledge Indicators.')
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
    expect(screen.queryByTestId('contextAiIndexSourcesEmpty')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextEditSourcesInlineEditor')).not.toBeInTheDocument();
  });

  it('renders selected source rows in the inline editor for non-managed indexes', async () => {
    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{ ...baseAiIndex, sources }}
        onSaved={jest.fn()}
        isManaged={false}
      />
    );

    expect(await screen.findByTestId('contextEditSourcesInlineEditor')).toBeInTheDocument();
    expect(screen.getAllByTestId(/^contextSelectedSource-esql-/)).toHaveLength(sources.length);
    expect(screen.queryByTestId('contextAiIndexSourceRow')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexSourcesEmpty')).not.toBeInTheDocument();
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

    expect(screen.getByTestId('contextElasticsearchDataPanel')).toBeInTheDocument();
    expect(screen.getByTestId('contextConnectorsPanel')).toBeInTheDocument();
    expect(screen.getAllByTestId('contextAiIndexSourceRow')).toHaveLength(2);
    expect(screen.queryByTestId('contextEditSourcesInlineEditor')).not.toBeInTheDocument();
  });

  it('does not enable connector fetch from SourcesPanel for non-managed indexes', () => {
    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{ ...baseAiIndex, sources }}
        onSaved={jest.fn()}
        isManaged={false}
      />
    );

    expect(mockUseDataConnectors).toHaveBeenCalledWith({ enabled: false });
  });

  it('fetches connectors from SourcePicker when a non-managed index has connector sources', () => {
    renderWithProviders(
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

    expect(mockUseDataConnectors).toHaveBeenCalledWith({ enabled: false });
    expect(mockUseDataConnectors).toHaveBeenCalledWith({ enabled: true });
  });

  it('does not fetch connectors from SourcePicker without Actions read', () => {
    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{
          ...baseAiIndex,
          sources: [{ type: 'connector', value: 'connector-gdrive' }],
        }}
        onSaved={jest.fn()}
        isManaged={false}
      />,
      createServices(false)
    );

    expect(mockUseDataConnectors).toHaveBeenCalledWith({ enabled: false });
    expect(mockUseDataConnectors).not.toHaveBeenCalledWith({ enabled: true });
  });

  it('fetches connectors for managed indexes with connector sources', () => {
    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{
          ...baseAiIndex,
          managed: true,
          sources: [{ type: 'connector', value: 'connector-gdrive' }],
        }}
        onSaved={jest.fn()}
        isManaged
      />
    );

    expect(mockUseDataConnectors).toHaveBeenCalledWith({ enabled: true });
  });

  it('does not fetch connectors for managed connector sources without Actions read', () => {
    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{
          ...baseAiIndex,
          managed: true,
          sources: [{ type: 'connector', value: 'connector-gdrive' }],
        }}
        onSaved={jest.fn()}
        isManaged
      />,
      createServices(false)
    );

    expect(mockUseDataConnectors).toHaveBeenCalledWith({ enabled: false });
  });

  it('resolves the connector name for connector sources in the inline editor', async () => {
    renderWithProviders(
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

    expect(await screen.findByTestId('contextSelectedSource-connector-0')).toHaveTextContent(
      'Google Drive'
    );
    expect(screen.queryByTestId('contextAiIndexSourceRow')).not.toBeInTheDocument();
  });

  it('hides header actions for managed AI indexes', () => {
    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{ ...baseAiIndex, sources, managed: true }}
        onSaved={jest.fn()}
        isManaged
      />
    );

    expect(screen.queryByTestId('contextEditSourcesButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextAddSourcesButton')).not.toBeInTheDocument();
  });

  it('disables Save when the current selection matches the sources loaded on open', async () => {
    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{ ...baseAiIndex, sources: [{ type: 'esql', value: 'FROM My view' }] }}
        onSaved={jest.fn()}
        isManaged={false}
      />
    );

    expect(await screen.findByTestId('contextSelectedSource-esql-0')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('keeps the inline editor open and reverts the draft when Cancel is clicked', async () => {
    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{ ...baseAiIndex, sources: [] }}
        onSaved={jest.fn()}
        isManaged={false}
      />
    );

    expect(await screen.findByTestId('contextEditSourcesInlineEditor')).toBeInTheDocument();

    addEsqlSource('FROM logs-* | LIMIT 10');
    expect(screen.getByTestId('contextSelectedSource-esql-0')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('contextEditSourcesCancelButton'));

    expect(screen.getByTestId('contextEditSourcesInlineEditor')).toBeInTheDocument();
    expect(screen.queryByTestId('contextSelectedSource-esql-0')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexSourcesEmpty')).not.toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('enables Save after adding a source and disables it again when the selection is reverted', async () => {
    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{ ...baseAiIndex, sources: [] }}
        onSaved={jest.fn()}
        isManaged={false}
      />
    );

    expect(await screen.findByTestId('contextEditSourcesInlineEditor')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();

    addEsqlSource('FROM logs-* | LIMIT 10');
    expect(saveButton()).toBeEnabled();

    const row = screen.getByTestId('contextSelectedSource-esql-0');
    fireEvent.click(within(row).getByTestId('contextRemoveSourceButton'));

    expect(screen.queryByTestId('contextSelectedSource-esql-0')).not.toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('keeps the inline editor open and shows Save loading while sources are saving', async () => {
    const testServices = coreMock.createStart();
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

    expect(await screen.findByTestId('contextEditSourcesInlineEditor')).toBeInTheDocument();
    addEsqlSource('FROM logs-* | LIMIT 10');
    fireEvent.click(saveButton());

    await waitFor(() => {
      expect(screen.getByTestId('contextEditSourcesInlineEditor')).toBeInTheDocument();
      expect(saveButton()).toBeDisabled();
    });
  });
});
