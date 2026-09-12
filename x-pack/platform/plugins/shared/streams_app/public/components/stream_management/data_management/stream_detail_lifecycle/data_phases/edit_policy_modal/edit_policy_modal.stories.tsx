/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React from 'react';
import { EuiOverlayMask } from '@elastic/eui';
import type { AffectedResource } from './edit_policy_modal';
import { EditPolicyModal } from './edit_policy_modal';

interface StoryArgs {
  policyName: string;
  affectedResources: AffectedResource[];
  isManaged?: boolean;
  isProcessing?: boolean;
}

const baseResources: AffectedResource[] = [
  { name: 'logs-apache', type: 'stream' },
  { name: 'logs-nginx', type: 'stream' },
  { name: 'logs-auth', type: 'stream' },
  { name: 'logs-audit', type: 'stream' },
  { name: 'logs-nginx-access', type: 'stream' },
  { name: 'logs-nginx-error', type: 'stream' },
  { name: 'logs-apache-000001', type: 'index' },
  { name: 'logs-nginx-000002', type: 'index' },
  { name: 'logs-auth-000003', type: 'index' },
  { name: 'logs-audit-000004', type: 'index' },
];

const meta: Meta<StoryArgs> = {
  component: EditPolicyModal,
  title: 'streams/EditPolicyModal',
  args: {
    policyName: '.monitoring-8-ilm-policy',
    affectedResources: baseResources,
  },
};

export default meta;
type Story = StoryObj<StoryArgs>;

const render = (args: StoryArgs) => {
  return (
    <EuiOverlayMask>
      <EditPolicyModal
        policyName={args.policyName}
        affectedResources={args.affectedResources}
        isManaged={args.isManaged}
        isProcessing={args.isProcessing}
        onCancel={action('onCancel')}
        onOverwrite={action('onOverwrite')}
        onSaveAsNew={action('onSaveAsNew')}
      />
    </EuiOverlayMask>
  );
};

// Managed policy that is also used by multiple data sources.
export const Both: Story = {
  render,
  args: {
    isManaged: true,
    affectedResources: baseResources,
  },
};

// Policy used by multiple data sources but not managed.
export const MultipleDataSourcesOnly: Story = {
  render,
  args: {
    isManaged: false,
    affectedResources: baseResources,
  },
};

// Managed policy that is not in use by other data sources.
export const ManagedOnly: Story = {
  render,
  args: {
    isManaged: true,
    affectedResources: [],
  },
};

export const ProcessingState: Story = {
  render,
  args: {
    isProcessing: true,
  },
};
