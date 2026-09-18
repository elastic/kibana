/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AgentPromptType } from '@kbn/agent-builder-common/agents';
import { AgentBuilderStorybookProvider } from '../../../../__storybook__/agent_builder_storybook_provider';
import { PromptRequestEvent } from './prompt_request_event';
import { createConfirmationPrompt } from './execution_paused_event.factory';

const pauseEventId = 'round-1::execution_terminated';
const pausedExecutionId = 'round-1::execution';

const meta: Meta<typeof PromptRequestEvent> = {
  title: 'Conversations/Timeline/Prompt Request',
  component: PromptRequestEvent,
  args: { pauseEventId, pausedExecutionId },
  decorators: [
    (Story) => (
      <AgentBuilderStorybookProvider conversationId="story-conversation-1">
        <div style={{ maxWidth: 600, padding: 24 }}>
          <Story />
        </div>
      </AgentBuilderStorybookProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof PromptRequestEvent>;

export const Confirmation: Story = {
  args: {
    prompts: [createConfirmationPrompt()],
  },
};

export const Authorization: Story = {
  args: {
    prompts: [
      {
        type: AgentPromptType.authorization,
        id: 'prompt-auth-1',
        connector_id: 'connector-1',
        connector_name: 'GitHub',
        connector_type: 'github',
        auth_method: 'oauth_authorization_code',
      },
    ],
  },
};

export const AskUserQuestion: Story = {
  args: {
    prompts: [
      {
        type: AgentPromptType.ask_user_question,
        id: 'prompt-question-1',
        questions: [
          {
            question: 'Which environment should I check?',
            options: [
              { label: 'Production', description: 'The live cluster' },
              { label: 'Staging' },
            ],
            multi_select: false,
          },
        ],
      },
    ],
  },
};

export const SeveralPrompts: Story = {
  args: {
    prompts: [
      createConfirmationPrompt(),
      createConfirmationPrompt({
        id: 'prompt-2',
        title: 'Confirm second action',
        message: 'The agent also wants to reindex `logs-*`. Allow?',
      }),
    ],
  },
};

export const WaitingForTheSavedPause: Story = {
  args: {
    prompts: [createConfirmationPrompt()],
    pauseEventId: undefined,
    pausedExecutionId: undefined,
  },
};
