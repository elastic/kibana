/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { getMockProfile } from '../../test_utils/mock_details_data';
import { ProfileSettings } from './profile_settings';

const meta: Meta<typeof ProfileSettings> = {
  component: ProfileSettings,
  title: 'Search boost/Details/Profile settings',
  args: { profile: getMockProfile('catalog-fast') },
};

export default meta;

type Story = StoryObj<typeof ProfileSettings>;

export const Indices: Story = {};

export const DataStreams: Story = {
  args: { profile: getMockProfile('logs-recent-week') },
};

export const SkippedPeriods: Story = {
  args: {
    profile: {
      name: 'logs-background-only',
      is_builtin: false,
      type: 'data_streams',
      recent: { min_boost: 2, max_boost: 10, max_age: '0d' },
      standard: { min_boost: 1, max_boost: 5, max_age: '0d' },
      background: { min_boost: 0, max_boost: 1 },
    },
  },
};
