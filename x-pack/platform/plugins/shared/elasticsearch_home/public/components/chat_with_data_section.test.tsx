/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { agentBuilderMocks } from '@kbn/agent-builder-plugin/public/mocks';
import { renderWithHomeContext } from '../test_utils';
import { ChatWithYourDataSection } from './chat_with_data_section';

describe('ChatWithYourDataSection', () => {
  const agentBuilder = agentBuilderMocks.createStart();
  const { openChat } = agentBuilder;

  const renderSection = (config = {}) =>
    renderWithHomeContext(<ChatWithYourDataSection />, {
      services: { agentBuilder },
      config,
    });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('opens the agent with the host-supplied onboarding message and session tag', () => {
    renderSection({
      ideSetup: {
        prompt: 'Install the Elastic skills',
        agentInitialMessage: '/elasticsearch-onboarding',
        agentSessionTag: 'testHost-home',
      },
    });

    fireEvent.click(screen.getByTestId('openElasticAgentButton'));

    expect(openChat).toHaveBeenCalledWith({
      initialMessage: '/elasticsearch-onboarding',
      autoSendInitialMessage: true,
      newConversation: true,
      sessionTag: 'testHost-home',
    });
  });

  it('shows the host-supplied prompt in the modal', () => {
    renderSection({
      ideSetup: {
        prompt: 'npx skills add elastic/agent-skills',
        agentInitialMessage: '/elasticsearch-onboarding',
        agentSessionTag: 'testHost-home',
      },
    });

    fireEvent.click(screen.getByTestId('viewPromptButton'));

    expect(screen.getByTestId('elasticsearchHomePromptModalCode')).toHaveTextContent(
      'npx skills add elastic/agent-skills'
    );
  });
});
