/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { AgentDefinition } from '@kbn/agent-builder-common';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { AgentBuilderStorybookProvider } from '../../../__storybook__/agent_builder_storybook_provider';
import { AgentTurn } from './agent_turn';
import {
  createCompletedTurnItem,
  createRunningTurnItem,
  createStreamingTurnItem,
  createAwaitingPromptTurnItem,
  createFailedTurnItem,
  createAbortedTurnItem,
} from './items/timeline_item.factory';

const storyAgent: AgentDefinition = {
  id: agentBuilderDefaultAgentId,
  type: 'chat',
  name: 'Elastic AI Agent',
  description: '',
  readonly: true,
  configuration: {
    tools: [],
  },
};

const meta: Meta<typeof AgentTurn> = {
  title: 'Conversations/Timeline/Agent Turn',
  component: AgentTurn,
  decorators: [
    (Story) => (
      <AgentBuilderStorybookProvider conversationId="story-conversation-1">
        <div style={{ maxWidth: 600, padding: 24 }}>
          <Story />
        </div>
      </AgentBuilderStorybookProvider>
    ),
  ],
  args: {
    agent: storyAgent,
  },
};
export default meta;

type Story = StoryObj<typeof AgentTurn>;

export const Completed: Story = {
  args: {
    item: createCompletedTurnItem(),
  },
};

export const Running: Story = {
  args: {
    item: createRunningTurnItem(),
  },
};

export const Streaming: Story = {
  args: {
    item: createStreamingTurnItem(),
  },
};

export const AwaitingPrompt: Story = {
  args: {
    item: createAwaitingPromptTurnItem(),
  },
};

export const Failed: Story = {
  args: {
    item: createFailedTurnItem(),
  },
};

export const Aborted: Story = {
  args: {
    item: createAbortedTurnItem(),
  },
};
