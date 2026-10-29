/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ThumbButton } from './thumb_button';

const meta: Meta<typeof ThumbButton> = {
  title: 'Conversations/Feedback/ThumbButton',
  component: ThumbButton,
  decorators: [
    (Story) => (
      <div style={{ padding: 24 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    onClick: () => {},
  },
};
export default meta;

type Story = StoryObj<typeof ThumbButton>;

export const UpIdle: Story = {
  args: { direction: 'up', isActive: false },
};

export const UpActive: Story = {
  args: { direction: 'up', isActive: true },
};

export const DownIdle: Story = {
  args: { direction: 'down', isActive: false },
};

export const DownActive: Story = {
  args: { direction: 'down', isActive: true },
};

export const Disabled: Story = {
  args: { direction: 'up', isActive: false, isDisabled: true },
};

export const Pair: Story = {
  render: (args) => (
    <EuiFlexGroup gutterSize="xs" alignItems="center">
      <EuiFlexItem grow={false}>
        <ThumbButton {...args} direction="up" isActive={false} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <ThumbButton {...args} direction="down" isActive={false} />
      </EuiFlexItem>
    </EuiFlexGroup>
  ),
};
