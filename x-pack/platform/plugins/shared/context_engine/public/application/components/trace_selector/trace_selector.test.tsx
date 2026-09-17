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
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React, { useState } from 'react';
import type { AiIndexTrace } from '../../../../common/http_api/ai_indices';
import { TraceSelector } from './trace_selector';

const mockUseAgentBuilderAgents = jest.fn();

jest.mock('../../hooks/use_agent_builder_agents', () => ({
  useAgentBuilderAgents: () => mockUseAgentBuilderAgents(),
}));

const renderSelector = (props: React.ComponentProps<typeof TraceSelector>) => {
  const services = coreMock.createStart();
  const data = dataPluginMock.createStartContract();
  data.dataViews.getIndices = jest.fn().mockResolvedValue([]);
  return render(
    <I18nProvider>
      <EuiProvider>
        <KibanaContextProvider services={{ ...services, data }}>
          <TraceSelector {...props} />
        </KibanaContextProvider>
      </EuiProvider>
    </I18nProvider>
  );
};

const StatefulTraceSelector = ({ initialValue }: { initialValue: AiIndexTrace | undefined }) => {
  const [value, setValue] = useState<AiIndexTrace | undefined>(initialValue);
  return <TraceSelector value={value} onChange={setValue} />;
};

describe('TraceSelector', () => {
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
    const services = coreMock.createStart();
    const data = dataPluginMock.createStartContract();
    data.dataViews.getIndices = jest.fn().mockResolvedValue([]);

    render(
      <I18nProvider>
        <EuiProvider>
          <KibanaContextProvider services={{ ...services, data }}>
            <StatefulTraceSelector initialValue={{ type: 'elastic_agent', value: 'agent-1' }} />
          </KibanaContextProvider>
        </EuiProvider>
      </I18nProvider>
    );

    fireEvent.click(screen.getByTestId('contextTraceToggle-index'));

    expect(screen.getByTestId('contextTraceDataStreamComboBox')).toBeInTheDocument();
    expect(screen.queryByTestId('contextTraceAgentComboBox')).not.toBeInTheDocument();
  });

  it('renders toggle icons without unknown-icon warnings', () => {
    const { container } = renderSelector({ value: undefined, onChange: jest.fn() });

    expect(container.querySelector('[data-euiicon-type="productAgent"]')).toBeInTheDocument();
    expect(container.querySelector('[data-euiicon-type="listBullet"]')).toBeInTheDocument();
  });

  it('selecting a data stream calls onChange with an index trace', async () => {
    const services = coreMock.createStart();
    const data = dataPluginMock.createStartContract();
    data.dataViews.getIndices = jest.fn().mockResolvedValue([
      {
        name: 'logs-genai-default',
        tags: [{ key: 'data_stream', name: 'Data stream', color: 'default' }],
        item: { name: 'logs-genai-default' },
      },
    ]);
    const onChange = jest.fn();

    render(
      <I18nProvider>
        <EuiProvider>
          <KibanaContextProvider services={{ ...services, data }}>
            <TraceSelector
              value={{ type: 'index', value: 'logs-genai-default' }}
              onChange={onChange}
            />
          </KibanaContextProvider>
        </EuiProvider>
      </I18nProvider>
    );

    fireEvent.change(screen.getByTestId('contextTraceDataStreamComboBox').querySelector('input')!, {
      target: { value: 'logs' },
    });

    await waitFor(() => {
      expect(screen.getByText('logs-genai-default')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('logs-genai-default'));

    expect(onChange).toHaveBeenCalledWith({ type: 'index', value: 'logs-genai-default' });
  });
});
