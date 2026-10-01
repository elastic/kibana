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
import { ElasticAgentField } from './elastic_agent_field';

const mockUseAgentBuilderAgents = jest.fn();

jest.mock('../../hooks/use_agent_builder_agents', () => ({
  useAgentBuilderAgents: () => mockUseAgentBuilderAgents(),
}));

const renderField = (props: React.ComponentProps<typeof ElasticAgentField>) => {
  const services = coreMock.createStart();
  const view = render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={services}>
          <ElasticAgentField {...props} />
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
  return { ...view, services };
};

describe('ElasticAgentField', () => {
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

  it('calls onChange with an elastic_agent trace when an agent is selected', async () => {
    const onChange = jest.fn();
    renderField({ value: undefined, onChange });

    fireEvent.change(screen.getByTestId('contextTraceAgentComboBox').querySelector('input')!, {
      target: { value: 'Loyalty' },
    });

    await waitFor(() => {
      expect(screen.getByText('Loyalty Support Agent')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Loyalty Support Agent'));

    expect(onChange).toHaveBeenCalledWith({ type: 'elastic_agent', value: 'agent-1' });
  });

  it('shows the selected agent name when a value is provided', () => {
    renderField({
      value: { type: 'elastic_agent', value: 'agent-1' },
      onChange: jest.fn(),
    });

    expect(screen.getByTestId('contextTraceAgentComboBox').querySelector('input')).toHaveValue(
      'Loyalty Support Agent'
    );
  });

  it('shows a toast warning on load error instead of rendering the raw error message', () => {
    mockUseAgentBuilderAgents.mockReturnValue({
      agents: [],
      isLoading: false,
      error: new Error('upstream exploded with secrets'),
    });

    const { services } = renderField({ value: undefined, onChange: jest.fn() });

    expect(services.notifications.toasts.addWarning).toHaveBeenCalledWith({
      title: 'Unable to load Agent Builder agents.',
    });
    expect(screen.queryByText('upstream exploded with secrets')).not.toBeInTheDocument();
    expect(screen.queryByText('Unable to load Agent Builder agents.')).not.toBeInTheDocument();
  });

  it('renders an empty agent list without crashing', () => {
    mockUseAgentBuilderAgents.mockReturnValue({
      agents: [],
      isLoading: false,
      error: undefined,
    });

    renderField({ value: undefined, onChange: jest.fn() });

    expect(screen.getByTestId('contextTraceAgentComboBox')).toBeInTheDocument();
  });

  it('calls onChange(undefined) when the selection is cleared', () => {
    const onChange = jest.fn();
    renderField({
      value: { type: 'elastic_agent', value: 'agent-1' },
      onChange,
    });

    fireEvent.click(screen.getByTestId('comboBoxClearButton'));

    expect(onChange).toHaveBeenCalledWith(undefined);
  });
});
