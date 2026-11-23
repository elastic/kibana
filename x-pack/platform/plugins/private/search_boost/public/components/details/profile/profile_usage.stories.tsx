/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { getMockProfile, getMockRulesUsing } from '../../test_utils/mock_details_data';
import { ProfileUsage } from './profile_usage';

const meta: Meta<typeof ProfileUsage> = {
  component: ProfileUsage,
  title: 'Search boost/Details/Profile usage',
  args: {
    profile: getMockProfile('logs-recent-week'),
    rules: getMockRulesUsing('logs-recent-week'),
    getRulesListLinkProps: (profileName) => ({
      href: '#',
      onClick: action(`navigate to the rules using ${profileName}`),
    }),
  },
};

export default meta;

type Story = StoryObj<typeof ProfileUsage>;

export const Default: Story = {};

export const NotInUse: Story = {
  args: { profile: getMockProfile('archive-cheap'), rules: [] },
};
