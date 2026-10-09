/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nProvider } from '@kbn/i18n-react';
import type { ActionPolicyResponse } from '@kbn/alerting-v2-schemas';
import { ActionPolicySnoozeButton } from './action_policy_snooze_button';

const createPolicy = (overrides: Partial<ActionPolicyResponse> = {}): ActionPolicyResponse => ({
  id: 'policy-1',
  name: 'Test policy',
  description: '',
  enabled: true,
  matcher: null,
  group_by: null,
  tags: null,
  grouping_mode: null,
  throttle: null,
  snoozed_until: null,
  destinations: [],
  auth: { owner: 'elastic', created_by_user: true },
  created_by: 'elastic',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_by: 'elastic',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('ActionPolicySnoozeButton', () => {
  const onSnooze = jest.fn();
  const onCancelSnooze = jest.fn();

  const renderButton = (policy: ActionPolicyResponse) =>
    render(
      <I18nProvider>
        <ActionPolicySnoozeButton
          policy={policy}
          onSnooze={onSnooze}
          onCancelSnooze={onCancelSnooze}
          isLoading={false}
        />
      </I18nProvider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a bell icon when snoozedUntil is null (not snoozed)', () => {
    renderButton(createPolicy({ snoozed_until: null }));

    expect(screen.getByTestId('actionPolicySnoozeButton')).toBeInTheDocument();
    expect(screen.queryByTestId('actionPolicyUnsnoozeButton')).not.toBeInTheDocument();
  });

  it('renders a bell icon when snoozedUntil is in the past (expired snooze)', () => {
    renderButton(createPolicy({ snoozed_until: new Date(Date.now() - 3_600_000).toISOString() }));

    expect(screen.getByTestId('actionPolicySnoozeButton')).toBeInTheDocument();
    expect(screen.queryByTestId('actionPolicyUnsnoozeButton')).not.toBeInTheDocument();
  });

  it('renders the snoozed date when snoozedUntil is in the future', () => {
    const snoozedUntil = new Date(Date.now() + 86_400_000).toISOString();
    const formattedDate = new Date(snoozedUntil).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
    });

    renderButton(createPolicy({ snoozed_until: snoozedUntil }));

    expect(screen.queryByTestId('actionPolicySnoozeButton')).not.toBeInTheDocument();
    expect(screen.getByTestId('actionPolicyUnsnoozeButton')).toHaveTextContent(formattedDate);
  });

  it('unsnoozes directly when the snoozed button is clicked', async () => {
    renderButton(createPolicy({ snoozed_until: new Date(Date.now() + 86_400_000).toISOString() }));

    await userEvent.click(screen.getByTestId('actionPolicyUnsnoozeButton'));

    expect(onCancelSnooze).toHaveBeenCalledWith('policy-1');
    expect(onSnooze).not.toHaveBeenCalled();
  });

  it('opens the snooze modal and applies the selected duration', async () => {
    renderButton(createPolicy());

    await userEvent.click(screen.getByTestId('actionPolicySnoozeButton'));
    expect(screen.getByTestId('actionPolicySnoozeModal')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('actionPolicySnoozeModalApply'));

    expect(onSnooze).toHaveBeenCalledTimes(1);
    const [id, snoozedUntil] = onSnooze.mock.calls[0];
    expect(id).toBe('policy-1');
    expect(new Date(snoozedUntil).getTime()).toBeGreaterThan(Date.now());
    expect(screen.queryByTestId('actionPolicySnoozeModal')).not.toBeInTheDocument();
  });
});
