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
    affectedResources: baseResources,
  },
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const Default: Story = {
  render: (args) => {
    return (
      <EuiOverlayMask>
        <EditPolicyModal
          affectedResources={args.affectedResources}
          isManaged={args.isManaged}
          isProcessing={args.isProcessing}
          onCancel={action('onCancel')}
          onOverwrite={action('onOverwrite')}
          onSaveAsNew={action('onSaveAsNew')}
        />
      </EuiOverlayMask>
    );
  },
};

export const ManagedPolicy: Story = {
  args: {
    isManaged: true,
  },
};

export const ManagedPolicyNoAffectedResources: Story = {
  args: {
    isManaged: true,
    affectedResources: [],
  },
};

export const ProcessingState: Story = {
  args: {
    isProcessing: true,
  },
};
