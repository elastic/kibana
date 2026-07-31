/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { MemoryRouter, Route } from '@kbn/shared-ux-router';
import {
  fireEvent,
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from '@testing-library/react';
import React from 'react';
import type { GetAiIndexResponse } from '../../../common/http_api/ai_indices';
import { CONTEXT_ENGINE_APP_ID } from '../../../common/features';
import { CONTEXT_ENGINE_PATHS, getAiIndexDetailPath } from '../paths';
import { AiIndexDetailPage } from './ai_index_detail_page';

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

jest.mock('../hooks/use_data_connectors', () => ({
  useDataConnectors: () => ({
    connectors: [],
    connectorNameById: new Map(),
    isLoading: false,
  }),
}));

const mockMgetWorkflows = jest.fn();
const mockCreateWorkflow = jest.fn();

jest.mock('@kbn/workflows-ui', () => ({
  useWorkflowsApi: () => ({
    mgetWorkflows: mockMgetWorkflows,
    createWorkflow: mockCreateWorkflow,
  }),
}));

const aiIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [],
  sources: [{ type: 'esql', value: 'FROM My view' }],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const renderWithProviders = (services: ReturnType<typeof coreMock.createStart>) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={[getAiIndexDetailPath(aiIndex.id)]}>
              <Route path={CONTEXT_ENGINE_PATHS.detail} component={AiIndexDetailPage} />
            </MemoryRouter>
          </QueryClientProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

describe('AiIndexDetailPage', () => {
  beforeEach(() => {
    mockMgetWorkflows.mockResolvedValue([]);
    mockCreateWorkflow.mockResolvedValue({ id: 'wf-created' });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('fetches the AI index and renders its id and sources', async () => {
    const services = coreMock.createStart();
    services.http.get.mockResolvedValue(aiIndex);

    renderWithProviders(services);

    await waitForElementToBeRemoved(() => screen.queryByTestId('contextAiIndexTitleLoading'));

    expect(services.http.get).toHaveBeenCalledWith(
      '/api/context_engine/ai_index/my-ai-index',
      expect.objectContaining({ version: expect.any(String) })
    );
    expect(screen.getByText('my-ai-index')).toBeInTheDocument();
    expect(screen.getByTestId('contextAiIndexSourceRow')).toHaveTextContent('FROM My view');
    // The non-editable detail list shows the generic ES|QL source type.
    expect(screen.getByTestId('contextSourceTypeBadge')).toHaveTextContent('ES|QL');
  });

  it('renders a back button linking to the AI indexes landing page', async () => {
    const services = coreMock.createStart();
    services.http.get.mockResolvedValue(aiIndex);
    services.application.getUrlForApp.mockImplementation(
      (appId, options) => `/app/${appId}${options?.path ?? ''}`
    );

    renderWithProviders(services);

    await waitForElementToBeRemoved(() => screen.queryByTestId('contextAiIndexTitleLoading'));

    expect(services.application.getUrlForApp).toHaveBeenCalledWith(
      CONTEXT_ENGINE_APP_ID,
      expect.objectContaining({ path: CONTEXT_ENGINE_PATHS.landing })
    );
    expect(screen.getByTestId('contextAiIndexBackToListButton')).toHaveAttribute(
      'href',
      '/app/context_engine/'
    );
  });

  it('renders an empty state when there are no sources', async () => {
    const services = coreMock.createStart();
    services.http.get.mockResolvedValue({ ...aiIndex, sources: [] });

    renderWithProviders(services);

    await waitForElementToBeRemoved(() => screen.queryByTestId('contextAiIndexTitleLoading'));

    expect(screen.getByTestId('contextAiIndexSourcesEmpty')).toBeInTheDocument();
  });

  it('renders an error state when the fetch fails', async () => {
    const services = coreMock.createStart();
    services.http.get.mockRejectedValue(new Error('boom'));

    renderWithProviders(services);

    expect(await screen.findByTestId('contextAiIndexDetailError')).toHaveTextContent('boom');
  });

  it('edits the description and refetches the AI index', async () => {
    const services = coreMock.createStart();
    services.http.get.mockResolvedValue(aiIndex);
    services.http.put.mockResolvedValue({ status: 'updated' });

    renderWithProviders(services);

    await waitForElementToBeRemoved(() => screen.queryByTestId('contextAiIndexTitleLoading'));
    expect(services.http.get).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('contextEditDescriptionButton'));

    const textArea = await screen.findByTestId('contextDescriptionTextArea');
    fireEvent.change(textArea, { target: { value: 'A brand new description' } });
    fireEvent.click(screen.getByTestId('contextDescriptionSaveButton'));

    await waitFor(() => {
      expect(services.http.put).toHaveBeenCalledWith(
        '/api/context_engine/ai_index/my-ai-index',
        expect.objectContaining({
          body: JSON.stringify({
            dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
            automations: [],
            sources: [{ type: 'esql', value: 'FROM My view' }],
            description: 'A brand new description',
          }),
        })
      );
    });

    // The editor closes and the detail data is refetched after a successful save.
    await waitFor(() => {
      expect(screen.queryByTestId('contextDescriptionTextArea')).not.toBeInTheDocument();
    });
    expect(services.http.get).toHaveBeenCalledTimes(2);
  });

  it('opens the edit sources flyout with the current sources selected', async () => {
    const services = coreMock.createStart();
    services.http.get.mockResolvedValue(aiIndex);

    renderWithProviders(services);

    await waitForElementToBeRemoved(() => screen.queryByTestId('contextAiIndexTitleLoading'));

    fireEvent.click(screen.getByTestId('contextEditSourcesButton'));

    expect(await screen.findByTestId('contextEditSourcesFlyout')).toBeInTheDocument();
    expect(await screen.findByTestId('contextSelectedSource-esql-0')).toBeInTheDocument();
  });

  it('saves edited sources and refetches the AI index', async () => {
    const services = coreMock.createStart();
    services.http.get.mockResolvedValue({ ...aiIndex, sources: [] });
    services.http.put.mockResolvedValue({ status: 'updated' });

    renderWithProviders(services);

    await waitForElementToBeRemoved(() => screen.queryByTestId('contextAiIndexTitleLoading'));
    expect(services.http.get).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('contextEditSourcesButton'));

    // The ES|QL tab is selected by default; author a raw query and add it.
    const editor = await screen.findByTestId('mockEsqlEditor');
    fireEvent.change(editor, { target: { value: 'FROM My view' } });
    fireEvent.click(screen.getByTestId('contextAddEsqlSourceButton'));
    fireEvent.click(screen.getByTestId('contextEditSourcesDoneButton'));

    await waitFor(() => {
      expect(services.http.put).toHaveBeenCalledWith(
        '/api/context_engine/ai_index/my-ai-index',
        expect.objectContaining({
          body: JSON.stringify({
            dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
            automations: [],
            sources: [{ type: 'esql', value: 'FROM My view' }],
          }),
        })
      );
    });

    // Flyout closes and the detail data is refetched after a successful save.
    await waitFor(() => {
      expect(screen.queryByTestId('contextEditSourcesFlyout')).not.toBeInTheDocument();
    });
    expect(services.http.get).toHaveBeenCalledTimes(2);
  });

  it('renders an empty state when there are no automations', async () => {
    const services = coreMock.createStart();
    services.http.get.mockResolvedValue(aiIndex);

    renderWithProviders(services);

    await waitForElementToBeRemoved(() => screen.queryByTestId('contextAiIndexTitleLoading'));

    expect(screen.getByTestId('contextAiIndexAutomationsEmpty')).toBeInTheDocument();
    expect(mockMgetWorkflows).not.toHaveBeenCalled();
  });

  it('shows edit controls once the AI index has loaded', async () => {
    const services = coreMock.createStart();
    services.http.get.mockResolvedValue(aiIndex);

    renderWithProviders(services);

    expect(screen.queryByTestId('contextEditAutomationsButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextEditDescriptionButton')).not.toBeInTheDocument();

    await waitForElementToBeRemoved(() => screen.queryByTestId('contextAiIndexTitleLoading'));

    expect(screen.getByTestId('contextEditAutomationsButton')).toBeEnabled();
    expect(screen.getByTestId('contextEditDescriptionButton')).toBeEnabled();
  });

  it('discards the draft when editing is cancelled', async () => {
    const services = coreMock.createStart();
    services.http.get.mockResolvedValue({
      ...aiIndex,
      automations: [{ type: 'workflow', value: 'wf-1' }],
    });
    mockMgetWorkflows.mockResolvedValue([{ id: 'wf-1', name: 'My workflow', enabled: true }]);

    renderWithProviders(services);

    await waitForElementToBeRemoved(() => screen.queryByTestId('contextAiIndexTitleLoading'));

    fireEvent.click(screen.getByTestId('contextEditAutomationsButton'));
    fireEvent.click(await screen.findByTestId('contextRemoveAutomationButton'));
    expect(screen.queryByTestId('contextAiIndexAutomationRow')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('contextCancelEditingAutomationsButton'));

    expect(screen.getByTestId('contextAiIndexAutomationRow')).toHaveTextContent('My workflow');
    expect(services.http.put).not.toHaveBeenCalled();
  });

  it('keeps the rows rendered while the summaries for an edited list resolve', async () => {
    const services = coreMock.createStart();
    services.http.get.mockResolvedValue({
      ...aiIndex,
      automations: [
        { type: 'workflow', value: 'wf-1' },
        { type: 'workflow', value: 'wf-2' },
      ],
    });
    mockMgetWorkflows.mockResolvedValue([
      { id: 'wf-1', name: 'My workflow', enabled: true },
      { id: 'wf-2', name: 'Another workflow', enabled: false },
    ]);

    renderWithProviders(services);

    await waitForElementToBeRemoved(() => screen.queryByTestId('contextAiIndexTitleLoading'));
    expect(await screen.findAllByTestId('contextAiIndexAutomationRow')).toHaveLength(2);

    fireEvent.click(screen.getByTestId('contextEditAutomationsButton'));
    // Removing changes the summaries query key, which must not send the panel back to its loading state.
    fireEvent.click(screen.getAllByTestId('contextRemoveAutomationButton')[1]);

    expect(screen.queryByTestId('contextAiIndexAutomationsLoading')).not.toBeInTheDocument();
    expect(screen.getByTestId('contextAiIndexAutomationRow')).toHaveTextContent('My workflow');
  });

  it('lists existing automations with the resolved workflow name and status', async () => {
    const services = coreMock.createStart();
    services.http.get.mockResolvedValue({
      ...aiIndex,
      automations: [{ type: 'workflow', value: 'wf-1' }],
    });
    mockMgetWorkflows.mockResolvedValue([{ id: 'wf-1', name: 'My workflow', enabled: true }]);

    renderWithProviders(services);

    await waitForElementToBeRemoved(() => screen.queryByTestId('contextAiIndexTitleLoading'));

    expect(await screen.findByTestId('contextAiIndexAutomationRow')).toHaveTextContent(
      'My workflow'
    );
    expect(screen.getByTestId('contextAiIndexAutomationRow')).toHaveTextContent('Enabled');
    expect(mockMgetWorkflows).toHaveBeenCalledWith({ ids: ['wf-1'] });
  });

  it('creates a workflow, attaches it, and opens the editor', async () => {
    const services = coreMock.createStart();
    services.http.get.mockResolvedValue(aiIndex);
    services.http.put.mockResolvedValue({ status: 'updated' });

    renderWithProviders(services);

    await waitForElementToBeRemoved(() => screen.queryByTestId('contextAiIndexTitleLoading'));

    fireEvent.click(screen.getByTestId('contextEditAutomationsButton'));
    fireEvent.click(await screen.findByTestId('contextCreateAutomationButton'));

    await waitFor(() => {
      expect(mockCreateWorkflow).toHaveBeenCalledWith({
        yaml: expect.stringContaining('my-ai-index automation'),
      });
    });

    await waitFor(() => {
      expect(services.http.put).toHaveBeenCalledWith(
        '/api/context_engine/ai_index/my-ai-index',
        expect.objectContaining({
          body: JSON.stringify({
            dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
            automations: [{ type: 'workflow', value: 'wf-created' }],
            sources: [{ type: 'esql', value: 'FROM My view' }],
          }),
        })
      );
    });

    expect(services.application.navigateToApp).toHaveBeenCalledWith('workflows', {
      path: '/wf-created?returnApp=context_engine&returnPath=%2Fai_index%2Fmy-ai-index',
    });
  });

  it('hides edit controls and shows the managed badge for managed AI indexes', async () => {
    const services = coreMock.createStart();
    services.http.get.mockResolvedValue({ ...aiIndex, managed: true });

    renderWithProviders(services);

    await waitForElementToBeRemoved(() => screen.queryByTestId('contextAiIndexTitleLoading'));

    expect(screen.getByTestId('contextAiIndexDetailManagedBadge')).toHaveTextContent('Managed');
    expect(screen.queryByTestId('contextEditDescriptionButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextEditSourcesButton')).not.toBeInTheDocument();
    expect(screen.queryByTestId('contextEditAutomationsButton')).not.toBeInTheDocument();
  });

  it('shows edit controls and no managed badge for non-managed AI indexes', async () => {
    const services = coreMock.createStart();
    services.http.get.mockResolvedValue({ ...aiIndex, managed: false });

    renderWithProviders(services);

    await waitForElementToBeRemoved(() => screen.queryByTestId('contextAiIndexTitleLoading'));

    expect(screen.queryByTestId('contextAiIndexDetailManagedBadge')).not.toBeInTheDocument();
    expect(screen.getByTestId('contextEditDescriptionButton')).toBeInTheDocument();
    expect(screen.getByTestId('contextEditSourcesButton')).toBeInTheDocument();
    expect(screen.getByTestId('contextEditAutomationsButton')).toBeInTheDocument();
  });

  it('renders connector sources using the connector id when no name is resolved', async () => {
    const services = coreMock.createStart();
    services.http.get.mockResolvedValue({
      ...aiIndex,
      sources: [{ type: 'connector', value: 'connector-abc' }],
    });

    renderWithProviders(services);

    await waitForElementToBeRemoved(() => screen.queryByTestId('contextAiIndexTitleLoading'));

    expect(screen.getByTestId('contextAiIndexSourceRow')).toHaveTextContent('connector-abc');
    expect(screen.getByTestId('contextSourceTypeBadge')).toHaveTextContent('Connector');
  });

  it('removes an automation and refetches', async () => {
    const services = coreMock.createStart();
    services.http.get.mockResolvedValue({
      ...aiIndex,
      automations: [{ type: 'workflow', value: 'wf-1' }],
    });
    services.http.put.mockResolvedValue({ status: 'updated' });
    mockMgetWorkflows.mockResolvedValue([{ id: 'wf-1', name: 'My workflow', enabled: true }]);

    renderWithProviders(services);

    await waitForElementToBeRemoved(() => screen.queryByTestId('contextAiIndexTitleLoading'));
    expect(services.http.get).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByTestId('contextEditAutomationsButton'));
    fireEvent.click(await screen.findByTestId('contextRemoveAutomationButton'));
    fireEvent.click(screen.getByTestId('contextSaveAutomationsButton'));

    await waitFor(() => {
      expect(services.http.put).toHaveBeenCalledWith(
        '/api/context_engine/ai_index/my-ai-index',
        expect.objectContaining({
          body: JSON.stringify({
            dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
            automations: [],
            sources: [{ type: 'esql', value: 'FROM My view' }],
          }),
        })
      );
    });

    expect(services.http.get).toHaveBeenCalledTimes(2);
  });
});
