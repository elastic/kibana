/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { LoadError } from './load_error';

const meta: Meta<typeof LoadError> = {
  component: LoadError,
  title: 'Search boost/Load error',
  args: {
    error: { message: 'Request failed with status code 502' },
    onRetry: action('onRetry'),
  },
};

export default meta;

type Story = StoryObj<typeof LoadError>;

export const Default: Story = {};
