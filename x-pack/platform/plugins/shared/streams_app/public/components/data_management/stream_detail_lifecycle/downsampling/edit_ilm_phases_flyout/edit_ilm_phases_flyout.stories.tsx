/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { IlmPolicyPhases } from '@kbn/streams-schema';
import { EditIlmPhasesFlyout } from './edit_ilm_phases_flyout';

const meta: Meta<typeof EditIlmPhasesFlyout> = {
  component: EditIlmPhasesFlyout,
  title: 'streams/EditIlmPhasesFlyout',
};

export default meta;
type Story = StoryObj<typeof EditIlmPhasesFlyout>;

export const Default: Story = {
  render: () => {
    const StoryComponent = () => {
      const initialPhases: IlmPolicyPhases = {
        hot: {
          name: 'hot',
          size_in_bytes: 0,
          rollover: {
            max_age: '30d',
            max_primary_shard_size: '50gb',
          },
        },
        warm: {
          name: 'warm',
          size_in_bytes: 0,
          min_age: '30d',
          downsample: { after: '30d', fixed_interval: '1h' },
          readonly: true,
        },
        cold: {
          name: 'cold',
          size_in_bytes: 0,
          min_age: '40d',
          downsample: { after: '40d', fixed_interval: '5d' },
        },
        frozen: {
          name: 'frozen',
          size_in_bytes: 0,
          min_age: '50d',
          searchable_snapshot: 'found-snapshots',
        },
      };

      return (
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
          <EuiFlexItem grow={false}>
            <EditIlmPhasesFlyout
              initialPhases={initialPhases}
              searchableSnapshotRepositories={['found-snapshots', 'another-repo']}
              onRefreshSearchableSnapshotRepositories={() =>
                action('onRefreshSearchableSnapshots')()
              }
              onCreateSnapshotRepository={() => action('onCreateSnapshotRepository')()}
              onClose={() => {
                action('onClose')();
              }}
              onChange={(next) => {
                action('onChange')(next);
              }}
              onSave={(next) => {
                action('onSave')(next);
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    };
    return <StoryComponent />;
  },
};

export const WarmAndDeletePhases: Story = {
  render: () => {
    const StoryComponent = () => {
      const initialPhases: IlmPolicyPhases = {
        warm: {
          name: 'warm',
          size_in_bytes: 0,
          min_age: '30d',
          readonly: true,
        },
        delete: {
          name: 'delete',
          min_age: '60d',
          delete_searchable_snapshot: true,
        },
      };

      return (
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
          <EuiFlexItem grow={false}>
            <EditIlmPhasesFlyout
              initialPhases={initialPhases}
              searchableSnapshotRepositories={['found-snapshots', 'another-repo']}
              onRefreshSearchableSnapshotRepositories={() =>
                action('onRefreshSearchableSnapshots')()
              }
              onCreateSnapshotRepository={() => action('onCreateSnapshotRepository')()}
              onClose={() => {
                action('onClose')();
              }}
              onChange={(next) => {
                action('onChange')(next);
              }}
              onSave={(next) => {
                action('onSave')(next);
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    };
    return <StoryComponent />;
  },
};

export const OnlyDeletePhase: Story = {
  render: () => {
    const StoryComponent = () => {
      const initialPhases: IlmPolicyPhases = {
        delete: {
          name: 'delete',
          min_age: '60d',
          delete_searchable_snapshot: true,
        },
      };

      return (
        <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
          <EuiFlexItem grow={false}>
            <EditIlmPhasesFlyout
              initialPhases={initialPhases}
              searchableSnapshotRepositories={['found-snapshots', 'another-repo']}
              onRefreshSearchableSnapshotRepositories={() =>
                action('onRefreshSearchableSnapshots')()
              }
              onCreateSnapshotRepository={() => action('onCreateSnapshotRepository')()}
              onClose={() => {
                action('onClose')();
              }}
              onChange={(next) => {
                action('onChange')(next);
              }}
              onSave={(next) => {
                action('onSave')(next);
              }}
            />
          </EuiFlexItem>
        </EuiFlexGroup>
      );
    };
    return <StoryComponent />;
  },
};
