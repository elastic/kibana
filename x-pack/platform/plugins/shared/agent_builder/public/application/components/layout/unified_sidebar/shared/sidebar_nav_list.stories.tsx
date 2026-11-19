/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MemoryRouter } from 'react-router-dom';
import type { Meta, StoryObj } from '@storybook/react';
import { SidebarNavList } from './sidebar_nav_list';

const meta: Meta<typeof SidebarNavList> = {
  title: 'Sidebar/Nav List',
  component: SidebarNavList,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div style={{ width: 320 }}>
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  args: {
    items: [
      { label: 'Overview', path: '/agents/elastic-ai-agent/overview' },
      { label: 'Skills', path: '/agents/elastic-ai-agent/skills' },
      { label: 'Connectors', path: '/agents/elastic-ai-agent/connectors' },
      { label: 'Tools', path: '/agents/elastic-ai-agent/tools' },
    ],
    isActive: (path: string) => path.endsWith('/overview'),
  },
};
export default meta;

type Story = StoryObj<typeof SidebarNavList>;

export const Default: Story = {};
