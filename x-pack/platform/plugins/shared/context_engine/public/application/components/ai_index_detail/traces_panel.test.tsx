/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { coreMock } from '@kbn/core/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { I18nProvider } from '@kbn/i18n-react';
import { KibanaContextProvider } from '@kbn/kibana-react-plugin/public';
import { QueryClient, QueryClientProvider } from '@kbn/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { TracesPanel } from './traces_panel';

const mockUseAgentBuilderAgents = jest.fn();

jest.mock('../../hooks/use_agent_builder_agents', () => ({
  useAgentBuilderAgents: () => mockUseAgentBuilderAgents(),
}));

const aiIndex: GetAiIndexResponse = {
  id: 'my-ai-index',
  managed: false,
  dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
  automations: [],
  sources: [],
  traces: [],
  date_created: '2026-01-01T00:00:00.000Z',
  date_modified: '2026-01-01T00:00:00.000Z',
};

const renderWithProviders = (
  ui: React.ReactElement,
  coreServices: ReturnType<typeof coreMock.createStart> = coreMock.createStart()
) => {
  const data = dataPluginMock.createStartContract();
  data.dataViews.getIndices = jest.fn().mockResolvedValue([]);
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={{ ...coreServices, data }}>
          <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

const EMPTY_FALLBACK = /No agent traces configured/;
const ADD_ONE_HINT = /Add one to tune Knowledge Indicators against real agent questions/;

describe('TracesPanel', () => {
  beforeEach(() => {
    mockUseAgentBuilderAgents.mockReturnValue({
      agents: [{ id: 'agent-1', name: 'Loyalty Support Agent' }],
      isLoading: false,
      error: undefined,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the empty fallback when no trace is configured', () => {
    renderWithProviders(
      <TracesPanel isLoading={false} aiIndex={aiIndex} onSaved={jest.fn()} isManaged={false} />
    );

    expect(screen.getByText(EMPTY_FALLBACK)).toBeInTheDocument();
    expect(screen.getByText(ADD_ONE_HINT)).toBeInTheDocument();
  });

  it('renders read-only empty fallback for managed AI indexes', () => {
    renderWithProviders(
      <TracesPanel isLoading={false} aiIndex={aiIndex} onSaved={jest.fn()} isManaged />
    );

    expect(screen.getByText(EMPTY_FALLBACK)).toBeInTheDocument();
    expect(screen.queryByText(ADD_ONE_HINT)).not.toBeInTheDocument();
  });

  it('renders the configured elastic agent trace in read-only mode', () => {
    renderWithProviders(
      <TracesPanel
        isLoading={false}
        aiIndex={{
          ...aiIndex,
          traces: [{ type: 'elastic_agent', value: 'agent-1', query: 'FROM traces' }],
        }}
        onSaved={jest.fn()}
        isManaged={false}
      />
    );

    expect(screen.getByTestId('contextTracesReadOnlyValue')).toHaveTextContent(
      'Elastic agent: Loyalty Support Agent'
    );
  });

  it('renders the configured data stream trace in read-only mode', () => {
    renderWithProviders(
      <TracesPanel
        isLoading={false}
        aiIndex={{
          ...aiIndex,
          traces: [{ type: 'index', value: 'logs-genai-default', query: 'FROM logs' }],
        }}
        onSaved={jest.fn()}
        isManaged={false}
      />
    );

    expect(screen.getByTestId('contextTracesReadOnlyValue')).toHaveTextContent(
      'Data stream: logs-genai-default'
    );
  });

  it('saves the edited trace, exits edit mode, and calls onSaved', async () => {
    const onSaved = jest.fn();
    const testServices = coreMock.createStart();
    testServices.http.put.mockResolvedValue({ status: 'updated' });

    renderWithProviders(
      <TracesPanel isLoading={false} aiIndex={aiIndex} onSaved={onSaved} isManaged={false} />,
      testServices
    );

    fireEvent.click(screen.getByTestId('contextEditTracesButton'));

    fireEvent.change(screen.getByTestId('contextTraceAgentComboBox').querySelector('input')!, {
      target: { value: 'Loyalty' },
    });

    await waitFor(() => {
      expect(screen.getByText('Loyalty Support Agent')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Loyalty Support Agent'));
    fireEvent.click(screen.getByTestId('contextTracesSaveButton'));

    await waitFor(() => {
      expect(testServices.http.put).toHaveBeenCalledWith(
        '/api/context_engine/ai_index/my-ai-index',
        expect.objectContaining({
          body: JSON.stringify({
            dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
            automations: [],
            sources: [],
            traces: [{ type: 'elastic_agent', value: 'agent-1' }],
          }),
        })
      );
    });

    expect(screen.queryByTestId('contextTraceAgentComboBox')).not.toBeInTheDocument();
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('discards draft changes when editing is cancelled', async () => {
    const testServices = coreMock.createStart();

    renderWithProviders(
      <TracesPanel
        isLoading={false}
        aiIndex={{
          ...aiIndex,
          traces: [{ type: 'elastic_agent', value: 'agent-1', query: 'FROM traces' }],
        }}
        onSaved={jest.fn()}
        isManaged={false}
      />,
      testServices
    );

    fireEvent.click(screen.getByTestId('contextEditTracesButton'));
    fireEvent.click(screen.getByTestId('contextTraceToggle-index'));
    fireEvent.click(screen.getByTestId('contextTracesCancelButton'));

    expect(screen.queryByTestId('contextTraceDataStreamComboBox')).not.toBeInTheDocument();
    expect(testServices.http.put).not.toHaveBeenCalled();
    expect(screen.getByTestId('contextTracesReadOnlyValue')).toHaveTextContent(
      'Elastic agent: Loyalty Support Agent'
    );
  });
});
