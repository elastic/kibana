/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { DefaultSnapshotRepositoryRequiredModal } from './default_snapshot_repository_required_modal';

const meta: Meta<typeof DefaultSnapshotRepositoryRequiredModal> = {
  component: DefaultSnapshotRepositoryRequiredModal,
  title: 'Data Lifecycle Phases / Default Snapshot Repository Required Modal',
  argTypes: {
    onCancel: { control: false },
    onRefresh: { control: false },
    'data-test-subj': { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof DefaultSnapshotRepositoryRequiredModal>;

export const Default: Story = {
  args: {
    createDefaultRepositoryUrl: '/app/management/data/snapshot_restore/add_repository',
    manageRepositoriesUrl: '/app/management/data/snapshot_restore/repositories',
    hasExistingRepositories: false,
    isRefreshing: false,
  },
  render: (args) => (
    <DefaultSnapshotRepositoryRequiredModal
      {...args}
      onCancel={() => action('onCancel')()}
      onRefresh={() => action('onRefresh')()}
    />
  ),
};

export const WithExistingRepositories: Story = {
  args: {
    createDefaultRepositoryUrl: '/app/management/data/snapshot_restore/add_repository',
    manageRepositoriesUrl: '/app/management/data/snapshot_restore/repositories',
    hasExistingRepositories: true,
    isRefreshing: false,
  },
  render: (args) => (
    <DefaultSnapshotRepositoryRequiredModal
      {...args}
      onCancel={() => action('onCancel')()}
      onRefresh={() => action('onRefresh')()}
    />
  ),
};

export const Refreshing: Story = {
  args: {
    createDefaultRepositoryUrl: '/app/management/data/snapshot_restore/add_repository',
    manageRepositoriesUrl: '/app/management/data/snapshot_restore/repositories',
    hasExistingRepositories: false,
    isRefreshing: true,
  },
  render: (args) => (
    <DefaultSnapshotRepositoryRequiredModal
      {...args}
      onCancel={() => action('onCancel')()}
      onRefresh={() => action('onRefresh')()}
    />
  ),
};
