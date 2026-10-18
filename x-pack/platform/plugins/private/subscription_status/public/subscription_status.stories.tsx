/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { EuiText } from '@elastic/eui';

import { SubscriptionBadge } from './components/subscription_badge';
import type { ProjectType, ServerlessCloud } from './status/resolve_serverless';
import { resolveServerlessStatus } from './status/resolve_serverless';
import type { SubscriptionStatus } from './status/types';

interface ScenarioProps {
  projectType?: ProjectType;
  organizationInTrial: boolean;
  isBillingAdmin: boolean;
  csp?: string;
  region?: string;
  baseUrl?: string;
}

const PROJECT_TYPES: ProjectType[] = ['search', 'observability', 'security', 'vectordb'];

const SubscriptionStatusScenario = ({
  projectType,
  organizationInTrial,
  isBillingAdmin,
  csp,
  region,
  baseUrl,
}: ScenarioProps) => {
  const [status, setStatus] = useState<SubscriptionStatus>();

  useEffect(() => {
    let isCurrent = true;
    const cloud: ServerlessCloud = {
      isServerlessEnabled: true,
      serverless: { projectType, organizationInTrial },
      getPrivilegedUrls: async () => ({
        billingUrl: isBillingAdmin ? `${baseUrl}/billing` : undefined,
      }),
      getUrls: () => ({ baseUrl }),
    };
    resolveServerlessStatus({ cloud, csp, region }).then((resolved) => {
      if (isCurrent) setStatus(resolved);
    });
    return () => {
      isCurrent = false;
    };
  }, [projectType, organizationInTrial, isBillingAdmin, csp, region, baseUrl]);

  if (!status) {
    return (
      <EuiText size="s" color="subdued">
        No badge for this scenario.
      </EuiText>
    );
  }

  return (
    <SubscriptionBadge status={status} onOpen={action('onOpen')} onAction={action('onAction')} />
  );
};

const meta: Meta<typeof SubscriptionStatusScenario> = {
  component: SubscriptionStatusScenario,
  title: 'Subscription Status/Serverless',
  args: {
    projectType: 'search',
    organizationInTrial: true,
    isBillingAdmin: true,
    csp: 'aws',
    region: 'us-east-1',
    baseUrl: 'https://cloud.elastic.co',
  },
  argTypes: {
    projectType: { control: 'select', options: PROJECT_TYPES },
    csp: { control: 'select', options: ['aws', 'gcp', 'azure'] },
  },
};

export default meta;

type Story = StoryObj<typeof SubscriptionStatusScenario>;

export const BillingAdmin: Story = {};

export const WithoutBillingAccess: Story = {
  args: { isBillingAdmin: false },
};

export const ObservabilityOnGcp: Story = {
  args: { projectType: 'observability', csp: 'gcp', region: 'europe-west1' },
};

export const VectorDbOnAzure: Story = {
  args: { projectType: 'vectordb', csp: 'azure', region: 'eastus2' },
};

export const UnknownRegion: Story = {
  args: { csp: undefined, region: undefined },
};

export const NotInTrial: Story = {
  args: { organizationInTrial: false },
};
