/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';

import type {
  BoostProfile,
  BoostProfileType,
  BoostRule,
  BoostRuleListItem,
  BoostRuleMatch,
} from '../../../common/types';
import type { RuleFlyoutProps } from './rule_flyout';
import { RuleFlyout } from './rule_flyout';

const GIB = 1024 ** 3;

const PROFILES: readonly BoostProfile[] = [
  {
    name: 'default_indices',
    is_builtin: true,
    type: 'indices',
    min_boost: 1,
    max_boost: 1,
    availability: 'base',
    prewarm: true,
    pinned: true,
  },
  {
    name: '_converted_indices',
    is_builtin: true,
    type: 'indices',
    min_boost: 1,
    max_boost: 1,
    availability: 'base',
    prewarm: false,
    pinned: false,
  },
  {
    name: 'storefront-search',
    is_builtin: false,
    type: 'indices',
    min_boost: 1,
    max_boost: 5000,
    availability: 'one_extra_copy',
    prewarm: true,
    pinned: false,
  },
  {
    name: 'default_data_streams_7d',
    is_builtin: true,
    type: 'data_streams',
    recent: { min_boost: 1, max_boost: 1, max_age: '1d' },
    standard: { min_boost: 0.5, max_boost: 1, max_age: '7d' },
    background: { min_boost: 0, max_boost: 0.1 },
  },
  {
    name: 'clickstream-recent',
    is_builtin: false,
    type: 'data_streams',
    recent: { min_boost: 2, max_boost: 5000, max_age: '12h' },
    standard: { min_boost: 1, max_boost: 100, max_age: '3d' },
    background: { min_boost: 0, max_boost: 1 },
  },
];

const ruleListItem = (
  name: string,
  indexPattern: string,
  profile: string,
  priority: number,
  type: BoostProfileType
): BoostRuleListItem => ({
  name,
  index_pattern: indexPattern,
  boost_profile: profile,
  priority,
  type,
  is_builtin: false,
  matches: [],
});

const RULES: readonly BoostRuleListItem[] = [
  ruleListItem('storefront-catalogs', 'catalog-2026-*', 'storefront-search', 10, 'indices'),
  ruleListItem('storefront-products', 'products', 'storefront-search', 10, 'indices'),
  ruleListItem('mobile-clicks-weekly', 'clicks-mobile', 'clickstream-recent', 20, 'data_streams'),
];

const target = (
  name: string,
  sizeInGib: number,
  overrides: Partial<BoostRuleMatch> = {}
): BoostRuleMatch => ({
  name,
  isHidden: false,
  storageSizeInBytes: sizeInGib * GIB,
  ...overrides,
});

const TARGETS: RuleFlyoutProps['targets'] = {
  indices: [
    target('archive-2024', 70),
    target('archive-2025', 70),
    target('catalog-2026-fall', 4, { outrankedByRuleName: 'storefront-catalogs' }),
    target('catalog-2026-spring', 4, { outrankedByRuleName: 'storefront-catalogs' }),
    target('kibana_sample_data_ecommerce', 0.1),
    target('kibana_sample_data_flights', 0.2),
    target('products', 12, { outrankedByRuleName: 'storefront-products' }),
    target('synonyms', 0.01),
    target('users', 1.5),
    target('.internal-alerts', 0.01, { isHidden: true }),
  ],
  data_streams: [
    target('clicks-mobile', 10, { outrankedByRuleName: 'mobile-clicks-weekly' }),
    target('clicks-web', 200),
    target('logs-nginx-default', 21),
    target('metrics-system-cpu', 3.4),
    target('.logs-elastic-agent', 1.2, { isHidden: true }),
  ],
};

const INDICES_RULE: BoostRule = {
  name: 'storefront-archive',
  index_pattern: 'archive-*',
  boost_profile: 'storefront-search',
  priority: 5,
  is_builtin: false,
};

const DATA_STREAMS_RULE: BoostRule = {
  name: 'clickstream',
  index_pattern: 'clicks-*',
  boost_profile: 'clickstream-recent',
  priority: 10,
  is_builtin: false,
};

const meta: Meta<RuleFlyoutProps> = {
  title: 'Search boost/Boost rule flyout',
  component: RuleFlyout,
  // Remount when the rule changes, so the form starts from it.
  render: (args) => <RuleFlyout key={args.rule?.name ?? 'new'} {...args} />,
  args: {
    profiles: PROFILES,
    rules: RULES,
    targets: TARGETS,
    isSaving: false,
    onCreateProfile: async (type) => {
      action('onCreateProfile')(type);
      return undefined;
    },
    onSave: action('onSave'),
    onClose: action('onClose'),
  },
  argTypes: {
    rule: { table: { disable: true } },
    profiles: { table: { disable: true } },
    rules: { table: { disable: true } },
    targets: { table: { disable: true } },
    onCreateProfile: { table: { disable: true } },
    onSave: { table: { disable: true } },
    onClose: { table: { disable: true } },
  },
};

export default meta;

type Story = StoryObj<RuleFlyoutProps>;

/** Select "storefront-search" and type `catalog-2026-*` to see a priority tie on save. */
export const Create: Story = {};

export const EditIndices: Story = {
  args: { rule: INDICES_RULE },
};

/** One of the matches is outranked, and the footer shows the profile's timeline. */
export const EditDataStreams: Story = {
  args: { rule: DATA_STREAMS_RULE },
};

export const Saving: Story = {
  args: { rule: INDICES_RULE, isSaving: true },
};
