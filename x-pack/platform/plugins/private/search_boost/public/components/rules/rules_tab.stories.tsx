/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { createMockRules, mockRules } from '../test_utils/mock_boost_data';
import { RulesTab } from './rules_tab';

const meta: Meta<typeof RulesTab> = {
  component: RulesTab,
  title: 'Search boost/Boost rules tab',
  args: {
    rules: mockRules,
    getRuleLinkProps: (ruleName) => ({
      href: '#',
      onClick: (event) => {
        event.preventDefault();
        action('onOpenRule')(ruleName);
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

type Story = StoryObj<typeof RulesTab>;

export const Default: Story = {};

export const FilteredByProfile: Story = {
  args: {
    initialProfileName: 'logs-recent-week',
  },
};

export const ManyRules: Story = {
  args: {
    rules: [...mockRules, ...createMockRules(23)],
  },
};

export const Empty: Story = {
  args: {
    rules: [],
  },
};
