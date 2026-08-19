/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { useNavigation } from '../../hooks/use_navigation';
import { useTracingEnabled } from '../../hooks/use_tracing_enabled';
import { useExperimentalFeatures } from '../../hooks/use_experimental_features';
import { appPaths } from '../../utils/app_paths';
import { buildDebugTracePrompt, DebugTraceButton } from './debug_trace_button';

jest.mock('../../hooks/use_navigation', () => ({
  useNavigation: jest.fn(),
}));

jest.mock('../../hooks/use_tracing_enabled', () => ({
  useTracingEnabled: jest.fn(),
}));

jest.mock('../../hooks/use_experimental_features', () => ({
  useExperimentalFeatures: jest.fn(),
}));

const mockUseNavigation = jest.mocked(useNavigation);
const mockUseTracingEnabled = jest.mocked(useTracingEnabled);
const mockUseExperimentalFeatures = jest.mocked(useExperimentalFeatures);

const renderButton = (traceId: string) =>
  render(
    <IntlProvider locale="en">
      <DebugTraceButton traceId={traceId} />
    </IntlProvider>
  );

describe('DebugTraceButton', () => {
  let navigateToAgentBuilderUrl: jest.Mock;

  beforeEach(() => {
    navigateToAgentBuilderUrl = jest.fn();
    mockUseNavigation.mockReturnValue({
      navigateToAgentBuilderUrl,
    } as unknown as ReturnType<typeof useNavigation>);
    mockUseTracingEnabled.mockReturnValue(true);
    mockUseExperimentalFeatures.mockReturnValue(true);
  });

  it('navigates to a new conversation with the default Elastic AI Agent', () => {
    renderButton('abc-123');
    fireEvent.click(screen.getByTestId('agentBuilderDebugTraceButton'));

    expect(navigateToAgentBuilderUrl).toHaveBeenCalledTimes(1);
    const [path, params, state] = navigateToAgentBuilderUrl.mock.calls[0];
    expect(path).toBe(appPaths.agent.conversations.new({ agentId: agentBuilderDefaultAgentId }));
    expect(params).toBeUndefined();
    expect(state).toEqual({
      initialMessage: buildDebugTracePrompt('abc-123'),
      autoSendInitialMessage: false,
    });
  });

  it('embeds the trace ID in the debug prompt', () => {
    const prompt = buildDebugTracePrompt('trace-xyz');
    expect(prompt).toContain('trace-xyz');
    expect(prompt).toContain('agent-builder-traces');
  });

  it('renders nothing when tracing is disabled', () => {
    mockUseTracingEnabled.mockReturnValue(false);
    renderButton('abc-123');
    expect(screen.queryByTestId('agentBuilderDebugTraceButton')).not.toBeInTheDocument();
  });

  it('renders nothing when experimental features are disabled', () => {
    mockUseExperimentalFeatures.mockReturnValue(false);
    renderButton('abc-123');
    expect(screen.queryByTestId('agentBuilderDebugTraceButton')).not.toBeInTheDocument();
  });
});
