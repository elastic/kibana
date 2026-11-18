/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { EuiPanel } from '@elastic/eui';

import type { BoostProfileType, BoostRuleMatch } from '../../../common/types';
import type { ProjectDefaultCardProps } from './project_default_card';
import { ProjectDefaultCard } from './project_default_card';
import { ProjectDefaults } from './project_defaults';

type CardData = Pick<ProjectDefaultCardProps, 'ruleName' | 'profile' | 'matches'>;

const match = (name: string, overrides: Partial<BoostRuleMatch> = {}): BoostRuleMatch => ({
  name,
  isHidden: false,
  ...overrides,
});

/** Sample data per type, so switching the `type` control shows realistic content. */
const CARD_DATA: Readonly<Record<BoostProfileType, CardData>> = {
  indices: {
    ruleName: '_default_indices',
    profile: { name: '_performant_indices', is_builtin: true },
    matches: [
      match('archive-2024', { outrankedByRuleName: 'Product catalog' }),
      match('archive-2025', { outrankedByRuleName: 'Product catalog' }),
      match('kibana_sample_data_ecommerce'),
      match('synonyms'),
      match('users'),
      match('.hidden-1', { isHidden: true }),
      match('.hidden-2', { isHidden: true }),
    ],
  },
  data_streams: {
    ruleName: '_default_data_streams',
    profile: { name: '_last_7_days_data_streams', is_builtin: true },
    matches: [
      match('logs-nginx-default', { outrankedByRuleName: 'web-logs' }),
      match('metrics-system-default'),
      match('traces-apm-default'),
    ],
  },
};

const withCardData = (args: ProjectDefaultCardProps): ProjectDefaultCardProps => ({
  ...CARD_DATA[args.type],
  ...args,
});

const meta: Meta<ProjectDefaultCardProps> = {
  title: 'Search boost/Project default card',
  component: ProjectDefaultCard,
  render: (args) => <ProjectDefaultCard {...withCardData(args)} />,
  args: {
    type: 'indices',
    canEdit: true,
    onEdit: action('onEdit'),
    onViewProfile: action('onViewProfile'),
  },
  argTypes: {
    type: { control: 'radio', options: ['indices', 'data_streams'] },
    onEdit: { table: { disable: true } },
    onViewProfile: { table: { disable: true } },
  },
};

export default meta;

type Story = StoryObj<ProjectDefaultCardProps>;

export const Default: Story = {};

export const CustomProfile: Story = {
  args: {
    profile: { name: 'catalog-fast', is_builtin: false },
  },
};

export const NoMatches: Story = {
  args: {
    matches: [],
  },
};

export const ProjectDefaultsSection: Story = {
  render: ({ canEdit, onViewProfile }) => (
    <ProjectDefaults
      canEdit={canEdit}
      indices={CARD_DATA.indices}
      dataStreams={CARD_DATA.data_streams}
      onEdit={action('onEdit')}
      onViewProfile={onViewProfile}
    />
  ),
  argTypes: {
    type: { table: { disable: true } },
  },
  decorators: [
    (Story) => (
      <EuiPanel color="plain" hasShadow={false} borderRadius="none" paddingSize="l">
        <Story />
      </EuiPanel>
    ),
  ],
};
