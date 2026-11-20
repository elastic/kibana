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
  BoostRuleMatch,
  DataStreamsBoostProfile,
  IndicesBoostProfile,
} from '../../../common/types';
import type { ProjectDefaultFlyoutProps } from './project_default_flyout';
import { ProjectDefaultFlyout } from './project_default_flyout';

const GIB = 1024 ** 3;

const indicesProfile = (
  name: string,
  overrides: Partial<IndicesBoostProfile> = {}
): IndicesBoostProfile => ({
  name,
  is_builtin: true,
  type: 'indices',
  min_boost: 1,
  max_boost: 1,
  availability: 'base',
  prewarm: true,
  pinned: true,
  ...overrides,
});

const dataStreamsProfile = (
  name: string,
  maxAge: string,
  overrides: Partial<DataStreamsBoostProfile> = {}
): DataStreamsBoostProfile => ({
  name,
  is_builtin: true,
  type: 'data_streams',
  recent: { min_boost: 1, max_boost: 1, max_age: '1d' },
  standard: { min_boost: 0.5, max_boost: 1, max_age: maxAge },
  background: { min_boost: 0, max_boost: 0.1 },
  ...overrides,
});

const MANAGED_INDICES_PROFILES: readonly BoostProfile[] = [indicesProfile('default_indices')];

const CUSTOM_INDICES_PROFILES: readonly BoostProfile[] = [
  indicesProfile('catalog-fast', { is_builtin: false, min_boost: 2, max_boost: 8.5 }),
  indicesProfile('archive-cheap', { is_builtin: false, min_boost: 0, max_boost: 0.25 }),
];

const MANAGED_DATA_STREAMS_PROFILES: readonly BoostProfile[] = [
  dataStreamsProfile('data_streams_1d', '1d'),
  dataStreamsProfile('data_streams_3d', '3d'),
  dataStreamsProfile('default_data_streams_7d', '7d'),
];

const CUSTOM_DATA_STREAMS_PROFILES: readonly BoostProfile[] = [
  dataStreamsProfile('logs-recent-week', '30d', {
    is_builtin: false,
    recent: { min_boost: 2, max_boost: 5000, max_age: '7d' },
    standard: { min_boost: 1, max_boost: 10, max_age: '30d' },
  }),
];

const match = (name: string, overrides: Partial<BoostRuleMatch> = {}): BoostRuleMatch => ({
  name,
  isHidden: false,
  ...overrides,
});

const INDICES_MATCHES: readonly BoostRuleMatch[] = [
  match('catalog-products', { outrankedByRuleName: 'catalog' }),
  match('catalog-reviews', { outrankedByRuleName: 'catalog' }),
  match('customers'),
  match('orders'),
  match('search-analytics'),
  match('synonyms'),
  match('users'),
  match('.internal-alerts', { isHidden: true }),
  match('.kibana-observability-ai-assistant', { isHidden: true }),
];

const DATA_STREAMS_MATCHES: readonly BoostRuleMatch[] = [
  match('logs-nginx-default', { outrankedByRuleName: 'web-logs' }),
  match('logs-nginx-error', { outrankedByRuleName: 'web-logs' }),
  match('logs-apache-default'),
  match('logs-app-default'),
  match('logs-system-auth'),
  match('logs-system-syslog'),
  match('metrics-system-cpu'),
  match('metrics-system-memory'),
  match('metrics-system-network'),
  match('metrics-kubernetes-pod'),
  match('traces-apm-default'),
  match('.logs-elastic-agent', { isHidden: true }),
  match('.metrics-elastic-agent', { isHidden: true }),
];

const INDICES_ARGS: Pick<
  ProjectDefaultFlyoutProps,
  'type' | 'ruleName' | 'profiles' | 'selectedProfileName' | 'matches' | 'storageSizeInBytes'
> = {
  type: 'indices',
  ruleName: 'default_indices',
  profiles: [...MANAGED_INDICES_PROFILES, ...CUSTOM_INDICES_PROFILES],
  selectedProfileName: 'default_indices',
  matches: INDICES_MATCHES,
  storageSizeInBytes: 2.1 * GIB,
};

const DATA_STREAMS_ARGS: typeof INDICES_ARGS = {
  type: 'data_streams',
  ruleName: 'default_data_streams',
  profiles: [...MANAGED_DATA_STREAMS_PROFILES, ...CUSTOM_DATA_STREAMS_PROFILES],
  selectedProfileName: 'default_data_streams_7d',
  matches: DATA_STREAMS_MATCHES,
  storageSizeInBytes: 310.1 * GIB,
};

const meta: Meta<ProjectDefaultFlyoutProps> = {
  title: 'Search boost/Project default flyout',
  component: ProjectDefaultFlyout,
  // Remount when the initial selection changes, so the controls take effect.
  render: (args) => (
    <ProjectDefaultFlyout key={`${args.type}-${args.selectedProfileName}`} {...args} />
  ),
  args: {
    ...INDICES_ARGS,
    onCreateProfile: action('onCreateProfile'),
    onSave: action('onSave'),
    onClose: action('onClose'),
  },
  argTypes: {
    type: { table: { disable: true } },
    profiles: { table: { disable: true } },
    onCreateProfile: { table: { disable: true } },
    onSave: { table: { disable: true } },
    onClose: { table: { disable: true } },
  },
};

export default meta;

type Story = StoryObj<ProjectDefaultFlyoutProps>;

export const Indices: Story = {};

export const IndicesNoCustomProfiles: Story = {
  args: { profiles: MANAGED_INDICES_PROFILES },
};

/**
 * A built-in profile with no label or description listed for it,
 * shows its name instead.
 */
export const IndicesUntrackedBuiltInProfile: Story = {
  args: {
    profiles: [indicesProfile('_converted_indices'), ...CUSTOM_INDICES_PROFILES],
    selectedProfileName: '_converted_indices',
  },
};

export const DataStreams: Story = {
  args: DATA_STREAMS_ARGS,
};

export const DataStreamsNoCustomProfiles: Story = {
  args: { ...DATA_STREAMS_ARGS, profiles: MANAGED_DATA_STREAMS_PROFILES },
};
