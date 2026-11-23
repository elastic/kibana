/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import type { DataStreamsBoostProfile } from '../../../common/types';
import { BoostTimeline } from './boost_timeline';

const profile: DataStreamsBoostProfile = {
  name: 'logs-recent-week',
  is_builtin: false,
  type: 'data_streams',
  recent: { min_boost: 2, max_boost: 5000, max_age: '7d' },
  standard: { min_boost: 1, max_boost: 10, max_age: '30d' },
  background: { min_boost: 0, max_boost: 1 },
};

const meta: Meta<typeof BoostTimeline> = {
  component: BoostTimeline,
  title: 'Search boost/Boost timeline',
  args: { profile },
  decorators: [
    (Story) => (
      <div css={{ maxWidth: 640 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof BoostTimeline>;

export const Default: Story = {};

export const SkippedPeriod: Story = {
  args: { profile: { ...profile, standard: { ...profile.standard, max_age: '7d' } } },
};
