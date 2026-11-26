/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { mockProfiles, mockRules } from '../test_utils/mock_boost_data';
import { ProfilesTab } from './profiles_tab';

const meta: Meta<typeof ProfilesTab> = {
  component: ProfilesTab,
  title: 'Search boost/Tables/Boost profiles tab',
  args: {
    profiles: mockProfiles,
    rules: mockRules,
    getProfileLinkProps: (profileName) => ({
      href: '#',
      onClick: (event) => {
        event.preventDefault();
        action('onOpenProfile')(profileName);
      },
    }),
    getProfileRulesLinkProps: (profileName) => ({
      href: '#',
      onClick: (event) => {
        event.preventDefault();
        action('onViewRules')(profileName);
      },
    }),
    canEdit: true,
    onCreate: action('onCreate'),
    onEdit: action('onEdit'),
    onDuplicate: action('onDuplicate'),
    onDelete: action('onDelete'),
  },
};

export default meta;

type Story = StoryObj<typeof ProfilesTab>;

export const Default: Story = {};

export const Empty: Story = {
  args: {
    profiles: [],
    rules: [],
  },
};
