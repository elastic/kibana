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
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import type { GetAiIndexResponse } from '../../../../common/http_api/ai_indices';
import { TracesPanel } from './traces_panel';

const mockUseAgentBuilderAgents = jest.fn();
const mockUseIndices = jest.fn();

jest.mock('../../hooks/use_agent_builder_agents', () => ({
  useAgentBuilderAgents: () => mockUseAgentBuilderAgents(),
}));

jest.mock('../../hooks/use_indices', () => ({
  useIndices: () => mockUseIndices(),
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
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={coreServices}>
          <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

const EMPTY_FALLBACK = /No agent traces configured/;
const PICK_HINT =
  /Point this index at an Elastic agent from Agent Builder, or a data stream carrying OTel GenAI spans/;

describe('TracesPanel', () => {
  beforeEach(() => {
    mockUseAgentBuilderAgents.mockReturnValue({
      agents: [{ id: 'agent-1', name: 'Loyalty Support Agent' }],
      isLoading: false,
      error: undefined,
    });
    mockUseIndices.mockReturnValue({
      indexNames: ['logs-genai-default'],
      isFetching: false,
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
    expect(screen.getByText(PICK_HINT)).toBeInTheDocument();
  });

  it('renders read-only empty fallback for managed AI indexes', () => {
    renderWithProviders(
      <TracesPanel isLoading={false} aiIndex={aiIndex} onSaved={jest.fn()} isManaged />
    );

    expect(screen.getByText(EMPTY_FALLBACK)).toBeInTheDocument();
    expect(screen.queryByText(PICK_HINT)).not.toBeInTheDocument();
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
      'Loyalty Support Agent'
    );
    expect(screen.getByTestId('contextSourceTypeBadge')).toHaveTextContent('Elastic agent');
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
      'logs-genai-default'
    );
    expect(screen.getByTestId('contextSourceTypeBadge')).toHaveTextContent('Data stream');
  });

  it('does not render the edit button while loading', () => {
    renderWithProviders(
      <TracesPanel isLoading aiIndex={aiIndex} onSaved={jest.fn()} isManaged={false} />
    );

    expect(screen.queryByTestId('contextEditTracesButton')).not.toBeInTheDocument();
  });

  it('does not render the read-only value while loading', () => {
    renderWithProviders(
      <TracesPanel
        isLoading
        aiIndex={{
          ...aiIndex,
          traces: [{ type: 'elastic_agent', value: 'agent-1', query: 'FROM traces' }],
        }}
        onSaved={jest.fn()}
        isManaged={false}
      />
    );

    expect(screen.queryByTestId('contextTracesReadOnlyValue')).not.toBeInTheDocument();
    expect(screen.queryByText(EMPTY_FALLBACK)).not.toBeInTheDocument();
  });

  it('hides the edit button for managed AI indexes', () => {
    renderWithProviders(
      <TracesPanel isLoading={false} aiIndex={aiIndex} onSaved={jest.fn()} isManaged />
    );

    expect(screen.queryByTestId('contextEditTracesButton')).not.toBeInTheDocument();
  });

  it('treats an esql trace as empty, shows Edit, and replaces it on save', async () => {
    const onSaved = jest.fn();
    const testServices = coreMock.createStart();
    testServices.http.put.mockResolvedValue({ status: 'updated' });

    renderWithProviders(
      <TracesPanel
        isLoading={false}
        aiIndex={{
          ...aiIndex,
          traces: [{ type: 'esql', value: 'FROM traces | LIMIT 10', query: 'FROM traces' }],
        }}
        onSaved={onSaved}
        isManaged={false}
      />,
      testServices
    );

    expect(screen.getByText(EMPTY_FALLBACK)).toBeInTheDocument();
    expect(screen.getByTestId('contextEditTracesButton')).toBeInTheDocument();

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

  it('drops additional traces beyond the first when saving', async () => {
    const onSaved = jest.fn();
    const testServices = coreMock.createStart();
    testServices.http.put.mockResolvedValue({ status: 'updated' });

    renderWithProviders(
      <TracesPanel
        isLoading={false}
        aiIndex={{
          ...aiIndex,
          traces: [
            { type: 'index', value: 'logs-original', query: 'FROM logs-original' },
            { type: 'index', value: 'logs-second', query: 'FROM logs-second' },
          ],
        }}
        onSaved={onSaved}
        isManaged={false}
      />,
      testServices
    );

    fireEvent.click(screen.getByTestId('contextEditTracesButton'));

    const comboBox = screen.getByTestId('contextTraceDataStreamComboBox');
    const input = comboBox.querySelector('input')!;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'logs-genai' } });

    await waitFor(() => {
      expect(screen.getByText('logs-genai-default')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('logs-genai-default'));
    fireEvent.click(screen.getByTestId('contextTracesSaveButton'));

    await waitFor(() => {
      expect(testServices.http.put).toHaveBeenCalledWith(
        '/api/context_engine/ai_index/my-ai-index',
        expect.objectContaining({
          body: JSON.stringify({
            dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
            automations: [],
            sources: [],
            traces: [{ type: 'index', value: 'logs-genai-default' }],
          }),
        })
      );
    });
  });

  it('keeps the editor open and does not call onSaved when the save fails', async () => {
    const onSaved = jest.fn();
    const testServices = coreMock.createStart();
    testServices.http.put.mockRejectedValue(new Error('save failed'));

    renderWithProviders(
      <TracesPanel
        isLoading={false}
        aiIndex={{
          ...aiIndex,
          traces: [{ type: 'elastic_agent', value: 'agent-1', query: 'FROM traces' }],
        }}
        onSaved={onSaved}
        isManaged={false}
      />,
      testServices
    );

    fireEvent.click(screen.getByTestId('contextEditTracesButton'));
    fireEvent.click(screen.getByTestId('contextTraceToggle-index'));
    fireEvent.click(screen.getByTestId('contextTraceToggle-elastic_agent'));

    fireEvent.change(screen.getByTestId('contextTraceAgentComboBox').querySelector('input')!, {
      target: { value: 'Loyalty' },
    });

    await waitFor(() => {
      expect(screen.getByText('Loyalty Support Agent')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Loyalty Support Agent'));
    fireEvent.click(screen.getByTestId('contextTracesSaveButton'));

    await waitFor(() => {
      expect(testServices.http.put).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByTestId('contextTraceAgentComboBox')).toBeInTheDocument();
    expect(onSaved).not.toHaveBeenCalled();
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
      'Loyalty Support Agent'
    );
    expect(screen.getByTestId('contextSourceTypeBadge')).toHaveTextContent('Elastic agent');
  });

  it('re-opens the editor with the original trace after cancel', async () => {
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

    fireEvent.click(screen.getByTestId('contextEditTracesButton'));

    expect(screen.getByTestId('contextTraceAgentComboBox')).toBeInTheDocument();
    expect(screen.queryByTestId('contextTraceDataStreamComboBox')).not.toBeInTheDocument();
  });

  it('shows a loading state on the Save button while the PUT is in flight', async () => {
    const testServices = coreMock.createStart();
    testServices.http.put.mockImplementation(() => new Promise(() => {}));

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
    fireEvent.click(screen.getByTestId('contextTracesSaveButton'));

    await waitFor(() => {
      expect(screen.getByTestId('contextTracesSaveButton')).toBeDisabled();
    });
  });

  it('clears the trace when saving an empty draft', async () => {
    const onSaved = jest.fn();
    const testServices = coreMock.createStart();
    testServices.http.put.mockResolvedValue({ status: 'updated' });

    renderWithProviders(
      <TracesPanel
        isLoading={false}
        aiIndex={{
          ...aiIndex,
          traces: [{ type: 'elastic_agent', value: 'agent-1', query: 'FROM traces' }],
        }}
        onSaved={onSaved}
        isManaged={false}
      />,
      testServices
    );

    fireEvent.click(screen.getByTestId('contextEditTracesButton'));
    fireEvent.click(screen.getByTestId('contextTraceToggle-index'));
    fireEvent.click(screen.getByTestId('contextTracesSaveButton'));

    await waitFor(() => {
      expect(testServices.http.put).toHaveBeenCalledWith(
        '/api/context_engine/ai_index/my-ai-index',
        expect.objectContaining({
          body: JSON.stringify({
            dest: { type: 'data_stream', value: 'ai-index-ds-my-ai-index' },
            automations: [],
            sources: [],
            traces: [],
          }),
        })
      );
    });
  });

  it('enables Save immediately when opening the editor with no traces', () => {
    renderWithProviders(
      <TracesPanel isLoading={false} aiIndex={aiIndex} onSaved={jest.fn()} isManaged={false} />
    );

    fireEvent.click(screen.getByTestId('contextEditTracesButton'));

    expect(screen.getByTestId('contextTracesSaveButton')).not.toBeDisabled();
  });

  it('returns to the read-only view showing the saved trace', async () => {
    const testServices = coreMock.createStart();
    testServices.http.put.mockResolvedValue({ status: 'updated' });

    const PanelWithRefetch = () => {
      const [currentAiIndex, setCurrentAiIndex] = useState(aiIndex);
      return (
        <TracesPanel
          isLoading={false}
          aiIndex={currentAiIndex}
          onSaved={() => {
            setCurrentAiIndex({
              ...aiIndex,
              traces: [{ type: 'elastic_agent', value: 'agent-1', query: 'FROM traces' }],
            });
          }}
          isManaged={false}
        />
      );
    };

    renderWithProviders(<PanelWithRefetch />, testServices);

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
      expect(screen.queryByTestId('contextTraceAgentComboBox')).not.toBeInTheDocument();
      expect(screen.getByTestId('contextTracesReadOnlyValue')).toHaveTextContent(
        'Loyalty Support Agent'
      );
      expect(screen.getByTestId('contextSourceTypeBadge')).toHaveTextContent('Elastic agent');
    });
  });
});
