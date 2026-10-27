/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { agentBuilderDefaultAgentId } from '@kbn/agent-builder-common';
import { AgentBuilderStorybookProvider } from '../../../../__storybook__/agent_builder_storybook_provider';
import { SidebarHeader } from './sidebar_header';

const meta: Meta<typeof SidebarHeader> = {
  title: 'Sidebar/Header',
  component: SidebarHeader,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <AgentBuilderStorybookProvider>
          <div style={{ width: 320 }}>
            <Story />
          </div>
        </AgentBuilderStorybookProvider>
      </MemoryRouter>
    ),
  ],
  args: {
    agentId: agentBuilderDefaultAgentId,
    getNavigationPath: (newAgentId: string) => `/agents/${newAgentId}`,
    isCondensed: false,
    onToggleCondensed: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof SidebarHeader>;

export const ConversationView: Story = {
  args: { sidebarView: 'conversation' },
};

export const ManageView: Story = {
  args: { sidebarView: 'manage' },
};

export const Condensed: Story = {
  args: { sidebarView: 'conversation', isCondensed: true },
};
