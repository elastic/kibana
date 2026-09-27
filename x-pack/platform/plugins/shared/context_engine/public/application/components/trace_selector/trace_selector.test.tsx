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
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { CONTEXT_ENGINE_UI_EBT } from '../../../../common/telemetry';
import { TraceSelector } from './trace_selector';

const mockUseAgentBuilderAgents = jest.fn();
const mockUseIndices = jest.fn();

jest.mock('../../hooks/use_agent_builder_agents', () => ({
  useAgentBuilderAgents: () => mockUseAgentBuilderAgents(),
}));

jest.mock('../../hooks/use_indices', () => ({
  useIndices: () => mockUseIndices(),
}));

const defaultEbtElement = CONTEXT_ENGINE_UI_EBT.element.aiIndexCreatePageTraceSelector;

const withDefaultEbt = (
  props: Omit<React.ComponentProps<typeof TraceSelector>, 'ebtElement'>
): React.ComponentProps<typeof TraceSelector> => ({
  ebtElement: defaultEbtElement,
  ...props,
});

const renderWithProps = (props: React.ComponentProps<typeof TraceSelector>) => {
  const services = coreMock.createStart();
  return render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <TraceSelector {...props} />
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

const renderSelector = (props: Omit<React.ComponentProps<typeof TraceSelector>, 'ebtElement'>) =>
  renderWithProps(withDefaultEbt(props));

describe('TraceSelector', () => {
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

  it('selecting an agent calls onChange with an elastic_agent trace', async () => {
    const onChange = jest.fn();
    renderSelector({ value: undefined, onChange });

    fireEvent.change(screen.getByTestId('contextTraceAgentComboBox').querySelector('input')!, {
      target: { value: 'Loyalty' },
    });

    await waitFor(() => {
      expect(screen.getByText('Loyalty Support Agent')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Loyalty Support Agent'));

    expect(onChange).toHaveBeenCalledWith({ type: 'elastic_agent', value: 'agent-1' });
  });

  it('switching to GenAI Libraries clears the current trace and shows the data stream field', () => {
    const onChange = jest.fn();
    renderSelector({
      value: { type: 'elastic_agent', value: 'agent-1' },
      onChange,
    });

    fireEvent.click(screen.getByTestId('contextTraceToggle-index'));

    expect(onChange).toHaveBeenCalledWith(undefined);
    expect(screen.getByTestId('contextTraceDataStreamComboBox')).toBeInTheDocument();
    expect(screen.queryByTestId('contextTraceAgentComboBox')).not.toBeInTheDocument();
  });

  it('selecting a data stream calls onChange with an index trace', () => {
    const onChange = jest.fn();
    renderSelector({
      value: { type: 'index', value: 'logs-original' },
      onChange,
    });

    const comboBox = screen.getByTestId('contextTraceDataStreamComboBox');
    const input = comboBox.querySelector('input')!;
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'logs' } });
    fireEvent.click(screen.getByText('logs-genai-default'));

    expect(onChange).toHaveBeenCalledWith({ type: 'index', value: 'logs-genai-default' });
  });

  it('propagates the given ebtElement to the toggle buttons', () => {
    const nonDefaultEbtElement = CONTEXT_ENGINE_UI_EBT.element.aiIndexDetailPageTracesPanel;
    renderWithProps({
      value: undefined,
      onChange: jest.fn(),
      ebtElement: nonDefaultEbtElement,
    });

    const elasticAgentToggle = screen.getByTestId('contextTraceToggle-elastic_agent');
    expect(elasticAgentToggle).toHaveAttribute('data-ebt-element', nonDefaultEbtElement);
    expect(elasticAgentToggle).toHaveAttribute(
      'data-ebt-action',
      CONTEXT_ENGINE_UI_EBT.action.traces.TOGGLE_ELASTIC_AGENT
    );

    const indexToggle = screen.getByTestId('contextTraceToggle-index');
    expect(indexToggle).toHaveAttribute('data-ebt-element', nonDefaultEbtElement);
    expect(indexToggle).toHaveAttribute(
      'data-ebt-action',
      CONTEXT_ENGINE_UI_EBT.action.traces.TOGGLE_DATA_STREAM
    );
  });
});
