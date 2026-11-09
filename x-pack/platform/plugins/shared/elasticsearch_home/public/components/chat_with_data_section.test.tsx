/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { of } from 'rxjs';
import { AIChatExperience } from '@kbn/ai-assistant-common';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/public/mocks';
import { applicationServiceMock } from '@kbn/core-application-browser-mocks';
import { settingsServiceMock } from '@kbn/core-ui-settings-browser-mocks';
import { renderWithHomeContext } from '../test_utils';
import { ChatWithYourDataSection } from './chat_with_data_section';

describe('ChatWithYourDataSection', () => {
  const agentBuilder = agentBuilderMocks.createStart();
  const { openChat } = agentBuilder;

  const renderSection = ({
    config = {},
    canShowAgentBuilder = true,
    isAgentBuilderEnabled = true,
    chatExperience = AIChatExperience.Agent,
  }: {
    config?: object;
    canShowAgentBuilder?: boolean;
    isAgentBuilderEnabled?: boolean;
    chatExperience?: AIChatExperience;
  } = {}) => {
    const application = applicationServiceMock.createStartContract();
    application.capabilities = {
      ...application.capabilities,
      agentBuilder: { show: canShowAgentBuilder },
    };

    const settings = settingsServiceMock.createStartContract();
    settings.client.get$.mockReturnValue(of(chatExperience));

    return renderWithHomeContext(<ChatWithYourDataSection />, {
      services: {
        agentBuilder: isAgentBuilderEnabled ? agentBuilder : undefined,
        application,
        settings,
      },
      config,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
  });

  it('withholds the agent when Agent Builder is disabled', async () => {
    renderSection({ isAgentBuilderEnabled: false });

    expect(await screen.findByTestId('viewPromptButton')).toBeInTheDocument();
    expect(screen.queryByTestId('openElasticAgentButton')).not.toBeInTheDocument();
  });

  it('withholds the agent when the classic chat experience is selected', async () => {
    renderSection({ chatExperience: AIChatExperience.Classic });

    expect(await screen.findByTestId('viewPromptButton')).toBeInTheDocument();
    expect(screen.queryByTestId('openElasticAgentButton')).not.toBeInTheDocument();
  });

  it('offers the agent without checking the license, which the chat prompts for', async () => {
    renderSection();

    expect(await screen.findByTestId('openElasticAgentButton')).toBeInTheDocument();
    expect(agentBuilder.getAgentBuilderAccess).not.toHaveBeenCalled();
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
