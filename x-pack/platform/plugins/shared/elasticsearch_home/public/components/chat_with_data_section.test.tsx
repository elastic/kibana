/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, screen } from '@testing-library/react';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/public/mocks';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { renderWithHomeContext } from '../test_utils';
import { ChatWithYourDataSection } from './chat_with_data_section';

describe('ChatWithYourDataSection', () => {
  const agentBuilder = agentBuilderMocks.createStart();
  const { openChat } = agentBuilder;

  const renderSection = ({
    config = {},
    canShowAgentBuilder = true,
    isAgentBuilderEnabled = true,
  }: { config?: object; canShowAgentBuilder?: boolean; isAgentBuilderEnabled?: boolean } = {}) => {
    const application = applicationServiceMock.createStartContract();
    application.capabilities = {
      ...application.capabilities,
      agentBuilder: { show: canShowAgentBuilder },
    };

    return renderWithHomeContext(<ChatWithYourDataSection />, {
      services: { agentBuilder: isAgentBuilderEnabled ? agentBuilder : undefined, application },
      config,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    agentBuilder.getAgentBuilderAccess.mockResolvedValue({
      hasRequiredLicense: true,
      hasLlmConnector: true,
    });
  });

  it('opens the agent with the host-supplied onboarding message and session tag', async () => {
    renderSection({
      config: {
        ideSetup: {
          prompt: 'Install the Elastic skills',
          agentInitialMessage: '/elasticsearch-onboarding',
          agentSessionTag: 'testHost-home',
        },
      },
    });

    fireEvent.click(await screen.findByTestId('openElasticAgentButton'));

    expect(openChat).toHaveBeenCalledWith({
      initialMessage: '/elasticsearch-onboarding',
      autoSendInitialMessage: true,
      newConversation: true,
      sessionTag: 'testHost-home',
    });
  });

  it('withholds the agent from a user without the Agent Builder privilege', async () => {
    renderSection({ canShowAgentBuilder: false });

    expect(await screen.findByTestId('viewPromptButton')).toBeInTheDocument();
    expect(screen.queryByTestId('openElasticAgentButton')).not.toBeInTheDocument();
    expect(agentBuilder.getAgentBuilderAccess).not.toHaveBeenCalled();
  });

  it('withholds the agent when Agent Builder is disabled', async () => {
    renderSection({ isAgentBuilderEnabled: false });

    expect(await screen.findByTestId('viewPromptButton')).toBeInTheDocument();
    expect(screen.queryByTestId('openElasticAgentButton')).not.toBeInTheDocument();
  });

  it('withholds the agent without the license Agent Builder requires', async () => {
    agentBuilder.getAgentBuilderAccess.mockResolvedValue({
      hasRequiredLicense: false,
      hasLlmConnector: true,
    });

    renderSection();

    await act(() => agentBuilder.getAgentBuilderAccess.mock.results[0].value);

    expect(screen.queryByTestId('openElasticAgentButton')).not.toBeInTheDocument();
  });

  it('shows the host-supplied prompt in the modal', async () => {
    renderSection({
      config: {
        ideSetup: {
          prompt: 'npx skills add elastic/agent-skills',
          agentInitialMessage: '/elasticsearch-onboarding',
          agentSessionTag: 'testHost-home',
        },
      },
    });

    await screen.findByTestId('openElasticAgentButton');
    fireEvent.click(screen.getByTestId('viewPromptButton'));

    expect(screen.getByTestId('elasticsearchHomePromptModalCode')).toHaveTextContent(
      'npx skills add elastic/agent-skills'
    );
  });
});
