/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import { CreateClassicStreamFlyout } from './create_classic_stream_flyout';

const meta: Meta<typeof CreateClassicStreamFlyout> = {
  component: CreateClassicStreamFlyout,
  title: 'Create Classic Stream Flyout',
};

export default meta;
type Story = StoryObj<typeof CreateClassicStreamFlyout>;

export const Primary: Story = {
  args: {
    onClose: action('onClose'),
    onCreate: action('onCreate'),
  },
};
