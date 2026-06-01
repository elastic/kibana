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
import { usePhaseColors } from '@kbn/data-lifecycle-phases';
import { LifecyclePhase } from './lifecycle_phase';

const meta: Meta<typeof LifecyclePhase> = {
  component: LifecyclePhase,
  title: 'streams/LifecyclePhase',
};

export default meta;
type Story = StoryObj<typeof LifecyclePhase>;

const Centered = ({ children }: { children: React.ReactNode }) => {
  return (
    <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 240 }}>
      <EuiFlexItem grow={false} style={{ width: 520 }}>
        {children}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const HotPhase: Story = {
  render: () => {
    const StoryComponent = () => {
      const phaseColors = usePhaseColors();
      return (
        <Centered>
          <LifecyclePhase
            label="hot"
            color={phaseColors.hot}
            description="Use for frequently searched, actively updated data optimized for indexing and search performance."
            minAge="0d"
            sizeInBytes={9_800_000_000}
            docsCount={983_112}
            isReadOnly={false}
            showActions={true}
            onEditPhase={(phaseName) => action('onEditPhase')(phaseName)}
            onRemovePhase={(phaseName) => action('onRemovePhase')(phaseName)}
            canManageLifecycle={true}
          />
        </Centered>
      );
    };
    return <StoryComponent />;
  },
};

export const WarmPhase: Story = {
  render: () => {
    const StoryComponent = () => {
      const phaseColors = usePhaseColors();
      return (
        <Centered>
          <LifecyclePhase
            label="warm"
            color={phaseColors.warm}
            description="Use for data that is searched occasionally but rarely updated, optimized for search over indexing."
            minAge="30d"
            sizeInBytes={35_100_000_000}
            docsCount={825_123}
            isReadOnly={false}
            showActions={true}
            onEditPhase={(phaseName) => action('onEditPhase')(phaseName)}
            onRemovePhase={(phaseName) => action('onRemovePhase')(phaseName)}
            canManageLifecycle={true}
          />
        </Centered>
      );
    };
    return <StoryComponent />;
  },
};

export const ColdPhase: Story = {
  render: () => {
    const StoryComponent = () => {
      const phaseColors = usePhaseColors();
      return (
        <Centered>
          <LifecyclePhase
            label="cold"
            color={phaseColors.cold}
            description="Use for infrequently searched, read-only data where cost savings are prioritized over performance."
            minAge="30d"
            sizeInBytes={75_100_000_000}
            docsCount={1_651_698}
            isReadOnly={true}
            searchableSnapshot="found-snapshots"
            showActions={true}
            onEditPhase={(phaseName) => action('onEditPhase')(phaseName)}
            onRemovePhase={(phaseName) => action('onRemovePhase')(phaseName)}
            canManageLifecycle={true}
          />
        </Centered>
      );
    };
    return <StoryComponent />;
  },
};

export const FrozenPhase: Story = {
  render: () => {
    const StoryComponent = () => {
      const phaseColors = usePhaseColors();
      return (
        <Centered>
          <LifecyclePhase
            label="frozen"
            color={phaseColors.frozen}
            description="Use for infrequently searched, read-only data where cost savings are prioritized over performance."
            minAge="40d"
            sizeInBytes={75_100_000_000}
            docsCount={1_651_698}
            isReadOnly={false}
            searchableSnapshot="found-snapshots"
            showActions={true}
            onEditPhase={(phaseName) => action('onEditPhase')(phaseName)}
            onRemovePhase={(phaseName) => action('onRemovePhase')(phaseName)}
            canManageLifecycle={true}
          />
        </Centered>
      );
    };
    return <StoryComponent />;
  },
};

export const FrozenPhaseEnterpriseCallout: Story = {
  render: () => {
    const StoryComponent = () => {
      const phaseColors = usePhaseColors();
      return (
        <Centered>
          <LifecyclePhase
            label="frozen"
            color={phaseColors.frozen}
            description="Use for infrequently searched, read-only data where cost savings are prioritized over performance."
            minAge="40d"
            sizeInBytes={75_100_000_000}
            docsCount={1_651_698}
            isReadOnly={false}
            searchableSnapshot="found-snapshots"
            showEnterpriseCallout={true}
            onUpgradeEnterprise={() => action('onUpgradeEnterprise')()}
            showActions={true}
            onEditPhase={(phaseName) => action('onEditPhase')(phaseName)}
            onRemovePhase={(phaseName) => action('onRemovePhase')(phaseName)}
            canManageLifecycle={true}
          />
        </Centered>
      );
    };
    return <StoryComponent />;
  },
};

export const FrozenPhaseDefaultRepositoryCallout: Story = {
  render: () => {
    const StoryComponent = () => {
      const phaseColors = usePhaseColors();
      return (
        <Centered>
          <LifecyclePhase
            label="frozen"
            color={phaseColors.frozen}
            description="Use for infrequently searched, read-only data where cost savings are prioritized over performance."
            minAge="40d"
            sizeInBytes={75_100_000_000}
            docsCount={1_651_698}
            isReadOnly={false}
            showDefaultRepositoryCallout={true}
            onCreateDefaultRepository={() => action('onCreateDefaultRepository')()}
            onRefreshDefaultRepository={() => action('onRefreshDefaultRepository')()}
            isRefreshingDefaultRepository={false}
            showActions={true}
            onEditPhase={(phaseName) => action('onEditPhase')(phaseName)}
            onRemovePhase={(phaseName) => action('onRemovePhase')(phaseName)}
            canManageLifecycle={true}
          />
        </Centered>
      );
    };
    return <StoryComponent />;
  },
};

export const DeletePhase: Story = {
  render: () => (
    <Centered>
      <LifecyclePhase
        isDelete={true}
        label="delete"
        description="Use to delete your data once it has reached a specified age."
        minAge="60d"
        showActions={true}
        onEditPhase={(phaseName) => action('onEditPhase')(phaseName)}
        onRemovePhase={(phaseName) => action('onRemovePhase')(phaseName)}
        canManageLifecycle={true}
      />
    </Centered>
  ),
};
