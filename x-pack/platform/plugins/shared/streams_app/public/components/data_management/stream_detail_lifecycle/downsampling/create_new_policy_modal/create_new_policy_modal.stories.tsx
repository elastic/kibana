/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import React, { useEffect } from 'react';
import { EuiOverlayMask } from '@elastic/eui';
import { CreatePolicyModal } from './create_new_policy_modal';

const meta: Meta<typeof CreatePolicyModal> = {
  component: CreatePolicyModal,
  title: 'streams/CreatePolicyModal',
};

export default meta;
type Story = StoryObj<typeof CreatePolicyModal>;

export const Default: Story = {
  args: {
    policyNames: ['logs-default', 'metrics-prod', 'my-policy'],
    originalPolicyName: 'my-policy',
  },
  render: (args) => {
    const Story = ({ policyNames }: { policyNames: string[] }) => {
      useEffect(() => {
        action('policyNames')(policyNames);
      }, [policyNames]);
      return (
        <EuiOverlayMask>
          <CreatePolicyModal
            policyNames={policyNames}
            onBack={action('onBack')}
            onSave={action('onSave')}
            originalPolicyName={args.originalPolicyName}
          />
        </EuiOverlayMask>
      );
    };
    return <Story policyNames={args.policyNames ?? []} />;
  },
};
export const WithExistingPolicyName: Story = {
  args: {
    policyNames: ['logs-default', 'metrics-prod', 'my-policy-2', 'my-policy-3'],
    originalPolicyName: 'my-policy',
  },
  render: (args) => {
    const Story = ({ policyNames }: { policyNames: string[] }) => {
      useEffect(() => {
        action('policyNames')(policyNames);
      }, [policyNames]);
      return (
        <EuiOverlayMask>
          <CreatePolicyModal
            policyNames={policyNames}
            onBack={action('onBack')}
            onSave={action('onSave')}
            originalPolicyName={args.originalPolicyName}
          />
        </EuiOverlayMask>
      );
    };
    return <Story policyNames={args.policyNames ?? []} />;
  },
};
