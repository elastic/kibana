/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { AgentBuilderStorybookProvider } from '../../../__storybook__/agent_builder_storybook_provider';
import { ConversationInput } from './conversation_input';

const meta: Meta<typeof ConversationInput> = {
  title: 'Conversations/Input/Default',
  component: ConversationInput,
  args: {
    onSubmitOverride: fn(),
  },
  decorators: [
    (Story) => (
      <AgentBuilderStorybookProvider>
        <div style={{ maxWidth: 640, padding: 16 }}>
          <Story />
        </div>
      </AgentBuilderStorybookProvider>
    ),
  ],
};
export default meta;

type Story = StoryObj<typeof ConversationInput>;

export const Default: Story = {};
