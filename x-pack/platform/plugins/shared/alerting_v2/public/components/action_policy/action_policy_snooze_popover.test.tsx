/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { ActionPolicySnoozePopover } from './action_policy_snooze_popover';

const createPolicy = (overrides: Partial<ActionPolicyResponse> = {}): ActionPolicyResponse => {
  const { createdByUsername = null, updatedByUsername = null, ...restOverrides } = overrides;

  return {
    id: 'policy-1',
    name: 'Test policy',
    description: '',
    type: 'global',
    ruleId: null,
    enabled: true,
    matcher: null,
    groupBy: null,
    tags: null,
    groupingMode: null,
    throttle: null,
    snoozedUntil: null,
    destinations: [],
    auth: { owner: 'elastic', createdByUser: true },
    createdBy: 'elastic',
    createdByUsername,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedBy: 'elastic',
    updatedByUsername,
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...restOverrides,
  };
};

const defaultProps = {
  onSnooze: jest.fn(),
  onCancelSnooze: jest.fn(),
  isLoading: false,
};

describe('ActionPolicySnoozePopover', () => {
  it('renders a bell icon when snoozedUntil is null (not snoozed)', () => {
    render(
      <ActionPolicySnoozePopover {...defaultProps} policy={createPolicy({ snoozedUntil: null })} />
    );

    expect(screen.getByLabelText('Snooze action policy')).toBeInTheDocument();
    expect(screen.queryByText(/Snoozed until/)).not.toBeInTheDocument();
  });

  it('renders a bell icon when snoozedUntil is in the past (expired snooze)', () => {
    const pastDate = new Date(Date.now() - 3_600_000).toISOString();
    render(
      <ActionPolicySnoozePopover
        {...defaultProps}
        policy={createPolicy({ snoozedUntil: pastDate })}
      />
    );

    expect(screen.getByLabelText('Snooze action policy')).toBeInTheDocument();
    expect(screen.queryByText(/Snoozed until/)).not.toBeInTheDocument();
  });

  it('renders a snoozed button when snoozedUntil is in the future', () => {
    const futureDate = new Date(Date.now() + 86_400_000).toISOString();
    const formattedDate = new Date(futureDate).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
    });
    render(
      <ActionPolicySnoozePopover
        {...defaultProps}
        policy={createPolicy({ snoozedUntil: futureDate })}
      />
    );

    // Bell icon should not be present when snoozed
    expect(screen.queryByLabelText('Snooze action policy')).not.toBeInTheDocument();
    // The accent button should display the formatted snooze date
    expect(screen.getByText(formattedDate)).toBeInTheDocument();
  });
});
