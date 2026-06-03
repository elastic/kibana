/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { EnterpriseGatingModal } from '../enterprise_gating_modal';

const meta: Meta<typeof EnterpriseGatingModal> = {
  component: EnterpriseGatingModal,
  title: 'Data Lifecycle Phases / Enterprise gating modal',
  argTypes: {
    onCancel: { control: false },
    onPrimaryAction: { control: false },
    'data-test-subj': { control: false },
  },
};

export default meta;
type Story = StoryObj<typeof EnterpriseGatingModal>;

const renderModalStory: Story['render'] = (args) => (
  <EnterpriseGatingModal
    {...args}
    onCancel={() => action('onCancel')()}
    onPrimaryAction={(primaryAction) => action('onPrimaryAction')(primaryAction)}
  />
);

export const CloudTrialAvailable: Story = {
  args: {
    environment: 'cloud',
    hasManageSubscriptionPermission: true,
    trialStatus: 'notStarted',
  },
  render: renderModalStory,
};

export const CloudTrialExpired: Story = {
  args: {
    environment: 'cloud',
    hasManageSubscriptionPermission: true,
    trialStatus: 'expired',
  },
  render: renderModalStory,
};

export const CloudNoSubscriptionPermissions: Story = {
  args: {
    environment: 'cloud',
    hasManageSubscriptionPermission: false,
  },
  render: renderModalStory,
};

export const SelfManaged: Story = {
  args: {
    environment: 'selfManaged',
  },
  render: renderModalStory,
};

export const SelfManagedWithManagePermission: Story = {
  args: {
    environment: 'selfManaged',
    hasManageSubscriptionPermission: true,
  },
  render: renderModalStory,
};
