/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React, { useState } from 'react';
import type { EditDeletePhaseFlyoutValue } from './types';
import { EditDeletePhaseFlyout } from './edit_delete_phase_flyout';

const meta: Meta<typeof EditDeletePhaseFlyout> = {
  component: EditDeletePhaseFlyout,
  title: 'streams/EditDeletePhaseFlyout',
  argTypes: {
    initialValue: { control: 'object' },
    defaultRetentionPeriod: { control: 'text' },
    maximumRetentionPeriod: { control: 'text' },
    showRestoreDefaultButton: { control: 'boolean' },
    onChange: { control: false },
    onChangeDebounceMs: { control: 'number' },
    onSave: { control: false },
    onClose: { control: false },
    isSaving: { control: false },
    'data-test-subj': { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof EditDeletePhaseFlyout>;

const StatefulStory = ({
  initialValue,
  defaultRetentionPeriod,
  maximumRetentionPeriod,
  showRestoreDefaultButton,
  onChangeDebounceMs,
}: {
  initialValue: EditDeletePhaseFlyoutValue;
  defaultRetentionPeriod?: string;
  maximumRetentionPeriod?: string;
  showRestoreDefaultButton?: boolean;
  onChangeDebounceMs?: number;
}) => {
  const [value, setValue] = useState(initialValue);

  return (
    <EditDeletePhaseFlyout
      initialValue={value}
      defaultRetentionPeriod={defaultRetentionPeriod}
      maximumRetentionPeriod={maximumRetentionPeriod}
      showRestoreDefaultButton={showRestoreDefaultButton}
      onChangeDebounceMs={onChangeDebounceMs}
      onChange={(next) => {
        action('onChange')(next);
      }}
      onSave={(next) => {
        action('onSave')(next);
        setValue(next);
      }}
      onClose={() => {
        action('onClose')();
      }}
    />
  );
};

export const FailedIngestDefaultRetention: Story = {
  args: {
    initialValue: {
      deletePhaseEnabled: true,
      dataRetention: '60d',
      isDefaultRetention: true,
    },
    defaultRetentionPeriod: '60d',
    showRestoreDefaultButton: true,
  },
  render: (args) => (
    <StatefulStory
      initialValue={args.initialValue}
      defaultRetentionPeriod={args.defaultRetentionPeriod}
      maximumRetentionPeriod={args.maximumRetentionPeriod}
      showRestoreDefaultButton={args.showRestoreDefaultButton}
      onChangeDebounceMs={args.onChangeDebounceMs}
    />
  ),
};

export const CustomRetention: Story = {
  args: {
    initialValue: {
      deletePhaseEnabled: true,
      dataRetention: '14d',
      isDefaultRetention: false,
    },
    defaultRetentionPeriod: '60d',
    showRestoreDefaultButton: true,
  },
  render: (args) => (
    <StatefulStory
      initialValue={args.initialValue}
      defaultRetentionPeriod={args.defaultRetentionPeriod}
      maximumRetentionPeriod={args.maximumRetentionPeriod}
      showRestoreDefaultButton={args.showRestoreDefaultButton}
      onChangeDebounceMs={args.onChangeDebounceMs}
    />
  ),
};

export const WithoutDefaultRetention: Story = {
  args: {
    initialValue: {
      deletePhaseEnabled: true,
      dataRetention: '30d',
      isDefaultRetention: false,
    },
    showRestoreDefaultButton: false,
  },
  render: (args) => (
    <StatefulStory
      initialValue={args.initialValue}
      defaultRetentionPeriod={args.defaultRetentionPeriod}
      maximumRetentionPeriod={args.maximumRetentionPeriod}
      showRestoreDefaultButton={args.showRestoreDefaultButton}
      onChangeDebounceMs={args.onChangeDebounceMs}
    />
  ),
};

export const ServerlessClassicMaximumRetention: Story = {
  args: {
    initialValue: {
      deletePhaseEnabled: true,
      dataRetention: '80d',
      isDefaultRetention: false,
    },
    defaultRetentionPeriod: '90d',
    maximumRetentionPeriod: '365d',
    showRestoreDefaultButton: true,
  },
  render: (args) => (
    <StatefulStory
      initialValue={args.initialValue}
      defaultRetentionPeriod={args.defaultRetentionPeriod}
      maximumRetentionPeriod={args.maximumRetentionPeriod}
      showRestoreDefaultButton={args.showRestoreDefaultButton}
      onChangeDebounceMs={args.onChangeDebounceMs}
    />
  ),
};

export const SavingDisablesActions: Story = {
  args: {
    initialValue: {
      deletePhaseEnabled: true,
      dataRetention: '30d',
      isDefaultRetention: false,
    },
  },
  render: (args) => (
    <EditDeletePhaseFlyout
      initialValue={args.initialValue}
      onChangeDebounceMs={args.onChangeDebounceMs}
      onChange={(next) => action('onChange')(next)}
      onSave={(next) => action('onSave')(next)}
      onClose={() => action('onClose')()}
      isSaving={true}
    />
  ),
};
