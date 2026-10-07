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
import { DownsamplingPhase } from './downsampling_phase';

const meta: Meta<typeof DownsamplingPhase> = {
  component: DownsamplingPhase,
  title: 'streams/DownsamplingPhase',
};

export default meta;
type Story = StoryObj<typeof DownsamplingPhase>;

const Centered = ({ children }: { children: React.ReactNode }) => {
  return (
    <EuiFlexGroup justifyContent="center" alignItems="center" style={{ minHeight: 200 }}>
      <EuiFlexItem grow={false} style={{ width: 520 }}>
        {children}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

export const ILMStep: Story = {
  render: () => {
    const StoryComponent = () => {
      return (
        <Centered>
          <DownsamplingPhase
            downsample={{ after: '30d', fixed_interval: '3d' }}
            stepNumber={1}
            phaseName="hot"
            color="#ECE2FE"
            onEditStep={(stepNumber, phaseName) => action('onEditStep')({ stepNumber, phaseName })}
            onRemoveStep={(stepNumber) => action('onRemoveStep')(stepNumber)}
            canManageLifecycle={true}
          />
        </Centered>
      );
    };
    return <StoryComponent />;
  },
};

export const DLMStep: Story = {
  render: () => {
    const StoryComponent = () => {
      return (
        <Centered>
          <DownsamplingPhase
            downsample={{ after: '10d', fixed_interval: '1h' }}
            stepNumber={2}
            color="#ECE2FE"
            onEditStep={(stepNumber, phaseName) => action('onEditStep')({ stepNumber, phaseName })}
            onRemoveStep={(stepNumber) => action('onRemoveStep')(stepNumber)}
            canManageLifecycle={true}
          />
        </Centered>
      );
    };
    return <StoryComponent />;
  },
};
