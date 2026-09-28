/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { createToolCallStep } from '@kbn/agent-builder-common/chat/conversation';
import { AgentBuilderStorybookProvider } from '../../../__storybook__/agent_builder_storybook_provider';
import { storyAgent } from '../../../__storybook__/agent_builder_services';
import { AgentTurn } from './agent_turn';
import {
  createCompletedTurnItem,
  createRunningTurnItem,
  createStreamingTurnItem,
  createAwaitingPromptTurnItem,
  createFailedTurnItem,
  createAbortedTurnItem,
} from './items/timeline_item.factory';

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

// A single tool call that never returned inside a stopped turn. Reads "running…" before the fix,
// "stopped" after.
export const AbortedWithStoppedToolCall: Story = {
  args: {
    item: createAbortedTurnItem({
      steps: [
        createToolCallStep({ tool_call_id: 'tc-1', tool_id: 'search', params: {}, results: [] }),
      ],
    }),
  },
};

// A group of tool calls in flight when the turn was stopped. Reads "N tools running…" before the
// fix, "N tools stopped" after.
export const AbortedWithStoppedToolCallGroup: Story = {
  args: {
    item: createAbortedTurnItem({
      steps: [
        createToolCallStep({ tool_call_id: 'tc-1', tool_id: 'search', params: {}, results: [] }),
        createToolCallStep({
          tool_call_id: 'tc-2',
          tool_id: 'get_index_info',
          params: {},
          results: [],
        }),
      ],
    }),
  },
};

// Same stopped tool call inside a failed turn, to confirm both terminals share the treatment.
export const FailedWithStoppedToolCall: Story = {
  args: {
    item: createFailedTurnItem({
      steps: [
        createToolCallStep({ tool_call_id: 'tc-1', tool_id: 'search', params: {}, results: [] }),
      ],
    }),
  },
};
