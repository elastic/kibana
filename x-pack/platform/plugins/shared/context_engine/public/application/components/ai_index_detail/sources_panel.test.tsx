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

  it('shows the empty message when not loading and there are no sources', () => {
    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{ ...baseAiIndex, sources: [] }}
        onSaved={jest.fn()}
        isManaged={false}
      />
    );

    expect(screen.getByTestId('contextAiIndexSourcesEmpty')).toBeInTheDocument();
    expect(screen.getByText('No sources configured.')).toBeInTheDocument();
    expect(screen.queryByTestId('contextAiIndexSourceRow')).not.toBeInTheDocument();
    expect(screen.getByTestId('contextAddSourcesButton')).toBeInTheDocument();
    expect(screen.queryByTestId('contextEditSourcesButton')).not.toBeInTheDocument();
    expect(
      screen.getByText('Data that automations should analyze when generating Knowledge Indicators.')
    ).toBeInTheDocument();
  });

  it('shows read-only empty copy for managed AI indexes with no sources', () => {
    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{ ...baseAiIndex, sources: [], managed: true }}
        onSaved={jest.fn()}
        isManaged
      />
    );

    expect(screen.getByTestId('contextAiIndexSourcesEmpty')).toBeInTheDocument();
    expect(screen.getByText('No sources configured.')).toBeInTheDocument();
  });

  it('renders one row per source', () => {
    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{ ...baseAiIndex, sources }}
        onSaved={jest.fn()}
        isManaged={false}
      />
    );

    expect(screen.getAllByTestId('contextAiIndexSourceRow')).toHaveLength(sources.length);
    expect(screen.queryByTestId('contextAiIndexSourcesEmpty')).not.toBeInTheDocument();
    expect(screen.getByTestId('contextEditSourcesButton')).toBeInTheDocument();
  });

  it('does not fetch connectors when there are no connector sources', () => {
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

  it('fetches connectors when at least one source is a connector', () => {
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

    expect(mockUseDataConnectors).toHaveBeenCalledWith({ enabled: true });
  });

  it('does not fetch connectors for connector sources without Actions read', () => {
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
  });

  it('resolves the connector name for connector sources', () => {
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

    expect(screen.getByTestId('contextAiIndexSourceRow')).toHaveTextContent('Google Drive');
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

  it('opens the inline editor when Add sources is clicked', async () => {
    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{ ...baseAiIndex, sources: [] }}
        onSaved={jest.fn()}
        isManaged={false}
      />
    );

    fireEvent.click(screen.getByTestId('contextAddSourcesButton'));

    expect(await screen.findByTestId('contextEditSourcesInlineEditor')).toBeInTheDocument();
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

    fireEvent.click(screen.getByTestId('contextEditSourcesButton'));

    expect(await screen.findByTestId('contextSelectedSource-esql-0')).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('closes the inline editor and restores the empty state when Cancel is clicked', async () => {
    renderWithProviders(
      <SourcesPanel
        isLoading={false}
        aiIndex={{ ...baseAiIndex, sources: [] }}
        onSaved={jest.fn()}
        isManaged={false}
      />
    );

    fireEvent.click(screen.getByTestId('contextAddSourcesButton'));
    expect(await screen.findByTestId('contextEditSourcesInlineEditor')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('contextEditSourcesCancelButton'));

    expect(screen.queryByTestId('contextEditSourcesInlineEditor')).not.toBeInTheDocument();
    expect(screen.getByTestId('contextAiIndexSourcesEmpty')).toBeInTheDocument();
    expect(screen.getByTestId('contextAddSourcesButton')).toBeInTheDocument();
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

    fireEvent.click(screen.getByTestId('contextAddSourcesButton'));

    expect(saveButton()).toBeDisabled();

    addEsqlSource('FROM logs-* | LIMIT 10');
    expect(saveButton()).toBeEnabled();

    const row = screen.getByTestId('contextSelectedSource-esql-0');
    fireEvent.click(within(row).getByTestId('contextRemoveSourceButton'));

    expect(screen.queryByTestId('contextSelectedSource-esql-0')).not.toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('shows a loading header action while sources are saving', async () => {
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

    fireEvent.click(screen.getByTestId('contextAddSourcesButton'));
    addEsqlSource('FROM logs-* | LIMIT 10');
    fireEvent.click(saveButton());

    await waitFor(() => {
      expect(screen.queryByTestId('contextEditSourcesInlineEditor')).not.toBeInTheDocument();
      expect(screen.getByTestId('contextAddSourcesButton')).toBeDisabled();
    });
  });
});
