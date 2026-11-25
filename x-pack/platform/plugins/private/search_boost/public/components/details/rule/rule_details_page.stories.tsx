/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { createMockMatches } from '../../test_utils/mock_boost_data';
import { getMockProfile, getMockRule } from '../../test_utils/mock_details_data';
import { RuleDetailsPage } from './rule_details_page';

const linkProps = (name: string) => ({ href: '#', onClick: action(`navigate to ${name}`) });

const catalogRule = getMockRule('catalog');

const meta: Meta<typeof RuleDetailsPage> = {
  component: RuleDetailsPage,
  title: 'Search boost/Details/Rule details page',
  args: {
    rule: catalogRule,
    profile: getMockProfile(catalogRule.boost_profile),
    backLinkProps: linkProps('boost rules'),
    getProfileLinkProps: linkProps,
    getRuleLinkProps: linkProps,
    getMatchLinkProps: linkProps,
  },
};

export default meta;

type Story = StoryObj<typeof RuleDetailsPage>;

export const IndicesRule: Story = {};

export const DataStreamsRule: Story = {
  args: {
    rule: getMockRule('web-logs'),
    profile: getMockProfile('logs-recent-week'),
  },
};

/** Each kind of data retention: a value, "Disabled", and kept indefinitely. */
export const DataStreamsRetention: Story = {
  args: {
    rule: { ...getMockRule('web-logs'), matches: createMockMatches('data_streams', 14) },
    profile: getMockProfile('logs-recent-week'),
  },
};

export const DefaultRule: Story = {
  args: {
    rule: getMockRule('default_indices'),
    profile: getMockProfile('default_indices'),
    isOutrankingComputed: true,
  },
};

export const ManyMatches: Story = {
  args: {
    rule: { ...catalogRule, matches: createMockMatches('indices', 40) },
  },
};

export const NoMatches: Story = {
  args: {
    rule: getMockRule('old-archives'),
    profile: getMockProfile('archive-cheap'),
  },
};

export const Loading: Story = {
  args: { isLoading: true },
};

export const NotFound: Story = {
  args: { rule: undefined, profile: undefined },
};
