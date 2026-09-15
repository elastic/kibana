/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { AgentBuilderStorybookProvider } from '../../../../__storybook__/agent_builder_storybook_provider';
import { PromptResponseEvent } from './prompt_response_event';
import { createPromptResponseEvent } from './prompt_response_event.factory';

const meta: Meta<typeof PromptResponseEvent> = {
  title: 'Conversations/Timeline/Prompt Response',
  component: PromptResponseEvent,
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

type Story = StoryObj<typeof PromptResponseEvent>;

export const Default: Story = {
  args: {
    event: createPromptResponseEvent(),
  },
};
