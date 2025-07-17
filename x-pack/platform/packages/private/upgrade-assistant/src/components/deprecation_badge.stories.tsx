/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';

import { DeprecationBadge, WarningLevels } from './deprecation_badge';

const meta: Meta<typeof DeprecationBadge> = {
  component: DeprecationBadge,
  title: 'Upgrade Assistant/Deprecation Badge',
  argTypes: {
    level: {
      name: 'Deprecation level',
      options: Object.values(WarningLevels),

      control: { type: 'select' },
    },
    isResolved: {
      name: 'Deprecation is resolved?',
      control: { type: 'boolean' },
    },
  },
};

export default meta;
type Story = StoryObj<typeof DeprecationBadge>;

export const Primary: Story = {
  args: {
    level: WarningLevels.CRITICAL,
    isResolved: false,
  },
};
