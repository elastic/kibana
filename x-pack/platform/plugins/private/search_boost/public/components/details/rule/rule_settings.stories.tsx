/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { getMockProfile, getMockRule } from '../../test_utils/mock_details_data';
import { RuleSettings } from './rule_settings';

const catalogRule = getMockRule('catalog');

const meta: Meta<typeof RuleSettings> = {
  component: RuleSettings,
  title: 'Search boost/Details/Rule settings',
  args: {
    rule: catalogRule,
    profile: getMockProfile(catalogRule.boost_profile),
    getProfileLinkProps: (profileName) => ({
      href: '#',
      onClick: action(`navigate to ${profileName}`),
    }),
  },
};

export default meta;

type Story = StoryObj<typeof RuleSettings>;

export const Default: Story = {};

export const ManagedProfile: Story = {
  args: {
    rule: getMockRule('default_indices'),
    profile: getMockProfile('default_indices'),
  },
};
