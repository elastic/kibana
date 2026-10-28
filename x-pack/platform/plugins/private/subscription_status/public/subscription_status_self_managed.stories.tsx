/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useRef } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { action } from '@storybook/addon-actions';
import { EuiHeader, EuiSpacer, EuiText } from '@elastic/eui';
import type { LicenseStatus, LicenseType } from '@kbn/licensing-types';

import { SubscriptionBadge } from './components/subscription_badge';
import { resolveSelfManagedStatus } from './status/resolve_self_managed';

const DAY_IN_MILLIS = 24 * 60 * 60 * 1000;

interface ScenarioProps {
  type: LicenseType;
  status: LicenseStatus;
  /** Negative values mean the license expired that many days ago. */
  daysLeft: number;
  canManageLicense: boolean;
  /** Renders the badge on the classic header's dark first bar. */
  inClassicHeader: boolean;
}

const SelfManagedScenario = ({
  type,
  status,
  daysLeft,
  canManageLicense,
  inClassicHeader,
}: ScenarioProps) => {
  const resolved = resolveSelfManagedStatus({
    license: {
      isAvailable: true,
      type,
      status,
      expiryDateInMillis: Date.now() + daysLeft * DAY_IN_MILLIS,
    },
    canManageLicense,
    urls: {
      compareFeatures: 'https://www.elastic.co/subscriptions',
      manageLicense: '/app/management/stack/license_management',
    },
  });

  if (!resolved) {
    return (
      <EuiText size="s" color="subdued">
        No badge for this scenario.
      </EuiText>
    );
  }

  const badge = (
    <SubscriptionBadge status={resolved} onOpen={action('onOpen')} onAction={action('onAction')} />
  );

  return inClassicHeader ? (
    <EuiHeader theme="dark" position="static" sections={[{ items: [badge] }]} />
  ) : (
    badge
  );
};

const meta: Meta<typeof SelfManagedScenario> = {
  component: SelfManagedScenario,
  title: 'Subscription Status/Self-managed',
  args: {
    type: 'trial',
    status: 'active',
    daysLeft: 18,
    canManageLicense: true,
    inClassicHeader: false,
  },
  argTypes: {
    type: {
      control: 'select',
      options: ['basic', 'standard', 'gold', 'platinum', 'enterprise', 'trial'],
    },
    status: { control: 'select', options: ['active', 'expired', 'invalid'] },
  },
};

export default meta;

type Story = StoryObj<typeof SelfManagedScenario>;

export const Trial: Story = {};

export const TrialNonAdmin: Story = {
  args: { canManageLicense: false },
};

export const TrialEnding: Story = {
  args: { daysLeft: 2 },
};

export const TrialExpiredAdmin: Story = {
  args: { status: 'expired', daysLeft: -3 },
};

export const TrialExpiredNonAdmin: Story = {
  args: { status: 'expired', daysLeft: -3, canManageLicense: false },
};

export const Basic: Story = {
  args: { type: 'basic' },
};

export const BasicInClassicHeader: Story = {
  args: { type: 'basic', inClassicHeader: true },
};

export const Platinum: Story = {
  args: { type: 'platinum' },
};

const ALL_STATES: ReadonlyArray<[title: string, story: Story]> = [
  ['Trial, admin', Trial],
  ['Trial, non-admin', TrialNonAdmin],
  ['Trial ending, admin', TrialEnding],
  ['Trial expired, admin', TrialExpiredAdmin],
  ['Trial expired, non-admin', TrialExpiredNonAdmin],
  ['Basic', Basic],
];

const AllStatesGrid = (props: ScenarioProps) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current
      ?.querySelectorAll<HTMLElement>('[data-test-subj="subscriptionStatusBadge"]')
      .forEach((badge) => badge.click());
  }, []);

  return (
    <div
      ref={ref}
      css={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 420px)',
        gridAutoRows: 240,
        gap: 24,
        padding: 24,
      }}
    >
      {ALL_STATES.map(([title, { args }]) => (
        <div key={title}>
          <EuiText size="xs" color="subdued">
            <strong>{title}</strong>
          </EuiText>
          <EuiSpacer size="s" />
          <SelfManagedScenario {...props} {...args} />
        </div>
      ))}
    </div>
  );
};

/** Every state with its popover open, for design review screenshots. */
export const AllStates: Story = {
  render: (args) => <AllStatesGrid {...args} />,
};
