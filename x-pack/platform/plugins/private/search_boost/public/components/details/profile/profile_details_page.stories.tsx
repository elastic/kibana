/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { getMockProfile, getMockRulesUsing } from '../../test_utils/mock_details_data';
import { ProfileDetailsPage } from './profile_details_page';

const linkProps = (name: string) => ({ href: '#', onClick: action(`navigate to ${name}`) });

const meta: Meta<typeof ProfileDetailsPage> = {
  component: ProfileDetailsPage,
  title: 'Search boost/Details/Profile details page',
  args: {
    profile: getMockProfile('catalog-fast'),
    rules: getMockRulesUsing('catalog-fast'),
    backLinkProps: linkProps('boost profiles'),
    getRuleLinkProps: linkProps,
    getRulesListLinkProps: linkProps,
    canEdit: true,
    onCreateRule: action('onCreateRule'),
    onEditRule: action('onEditRule'),
    onDuplicateRule: action('onDuplicateRule'),
    onDeleteRule: action('onDeleteRule'),
  },
};

export default meta;

type Story = StoryObj<typeof ProfileDetailsPage>;

export const IndicesProfile: Story = {};

export const DataStreamsProfile: Story = {
  args: {
    profile: getMockProfile('logs-recent-week'),
    rules: getMockRulesUsing('logs-recent-week'),
  },
};

export const NotInUse: Story = {
  args: {
    profile: getMockProfile('archive-cheap'),
    rules: [],
  },
};

export const NotInUseReadOnly: Story = {
  args: { ...NotInUse.args, canEdit: false },
};

export const ReadOnly: Story = {
  args: { canEdit: false },
};

export const Loading: Story = {
  args: { isLoading: true },
};

export const NotFound: Story = {
  args: { profile: undefined, rules: [] },
};
