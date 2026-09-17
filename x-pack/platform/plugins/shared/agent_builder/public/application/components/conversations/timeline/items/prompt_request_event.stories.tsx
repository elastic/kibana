/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AgentBuilderStorybookProvider } from '../../../../__storybook__/agent_builder_storybook_provider';
import { PromptRequestEvent } from './prompt_request_event';
import {
  createAskUserQuestionPrompt,
  createAuthorizationPrompt,
  createConfirmationPrompt,
} from './prompt_request_event.factory';

const noop = () => {};

const meta: Meta<typeof PromptRequestEvent> = {
  title: 'Conversations/Timeline/Prompt Request',
  component: PromptRequestEvent,
  args: {
    onResume: noop,
  },
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
    prompts: [createAuthorizationPrompt()],
  },
};

export const AskUserQuestion: Story = {
  args: {
    prompts: [createAskUserQuestionPrompt()],
  },
};

export const Resuming: Story = {
  args: {
    prompts: [createConfirmationPrompt()],
    isResuming: true,
  },
};
