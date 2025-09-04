/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';

import { DeprecationBadge } from './deprecation_badge';

const meta: Meta<typeof DeprecationBadge> = {
  component: DeprecationBadge,
  title: 'Upgrade Assistant/Deprecation Badge',
  argTypes: {
    level: {
      name: 'Deprecation is critical?',
      control: { type: 'boolean' },
    },
    isResolved: {
      name: 'Deprecation is resolved?',
      control: { type: 'select', options: ['none', 'info', 'warning', 'critical', 'fetch_error'] },
    },
  },
};

export default meta;
type Story = StoryObj<typeof DeprecationBadge>;

export const Primary: Story = {
  args: {
    level: 'info',
    isResolved: false,
  },
};
