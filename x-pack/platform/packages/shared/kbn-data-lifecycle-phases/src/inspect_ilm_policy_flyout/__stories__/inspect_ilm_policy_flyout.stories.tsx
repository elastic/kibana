/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import type { SerializedPolicy } from '@kbn/index-lifecycle-management-common-shared';
import { InspectIlmPolicyFlyout } from '../inspect_ilm_policy_flyout';

const FULL_POLICY: SerializedPolicy = {
  name: 'alerts-ilm-policy',
  phases: {
    hot: {
      min_age: '0ms',
      actions: {
        rollover: { max_primary_shard_size: '50gb', max_age: '30d' },
        readonly: {},
        shrink: { number_of_shards: 1, allow_write_after_shrink: true },
        forcemerge: { max_num_segments: 1, index_codec: 'best_compression' },
        downsample: { fixed_interval: '1h' },
        set_priority: { priority: 100 },
      },
    },
    warm: {
      min_age: '7d',
      actions: {
        readonly: {},
        allocate: { number_of_replicas: 1 },
        downsample: { fixed_interval: '1d' },
        set_priority: { priority: 50 },
      },
    },
    cold: {
      min_age: '30d',
      actions: {
        freeze: {},
        downsample: { fixed_interval: '7d' },
        searchable_snapshot: { snapshot_repository: 'found-snapshots' },
        set_priority: { priority: 0 },
      },
    },
    frozen: {
      min_age: '60d',
      actions: {
        searchable_snapshot: { snapshot_repository: 'found-snapshots' },
      },
    },
    delete: {
      min_age: '90d',
      actions: {
        delete: { delete_searchable_snapshot: true },
        wait_for_snapshot: { policy: 'external-snapshots' },
      },
    },
  },
  _meta: {
    managed: true,
  },
};

/** Hot phase only, with every rollover trigger and restrict condition populated. */
const HOT_ALL_ROLLOVER_POLICY: SerializedPolicy = {
  name: 'all-rollover-thresholds',
  phases: {
    hot: {
      min_age: '0ms',
      actions: {
        rollover: {
          max_age: '30d',
          max_primary_shard_size: '50gb',
          max_size: '100gb',
          max_docs: 1_000_000,
          max_primary_shard_docs: 200_000,
          min_age: '1d',
          min_docs: 100,
          min_primary_shard_size: '10gb',
          min_size: '20gb',
          min_primary_shard_docs: 50,
        },
      },
    },
  },
};

const meta: Meta<typeof InspectIlmPolicyFlyout> = {
  component: InspectIlmPolicyFlyout,
  title: 'Inspect ILM policy flyout',
};

export default meta;
type Story = StoryObj<typeof InspectIlmPolicyFlyout>;

export const FullPolicy: Story = {
  render: () => (
    <InspectIlmPolicyFlyout
      policyName="alerts-ilm-policy"
      policy={FULL_POLICY}
      onBack={action('onBack')}
      onEditPolicy={action('onEditPolicy')}
      onSelectAndApply={action('onSelectAndApply')}
    />
  ),
};

export const HotPhaseAllRolloverOptions: Story = {
  render: () => (
    <InspectIlmPolicyFlyout
      policyName="all-rollover-thresholds"
      policy={HOT_ALL_ROLLOVER_POLICY}
      onBack={action('onBack')}
      onEditPolicy={action('onEditPolicy')}
      onSelectAndApply={action('onSelectAndApply')}
    />
  ),
};
