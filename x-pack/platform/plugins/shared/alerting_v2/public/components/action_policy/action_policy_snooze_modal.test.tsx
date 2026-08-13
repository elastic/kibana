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
import { ActionPolicySnoozeModal } from './action_policy_snooze_modal';

describe('ActionPolicySnoozeModal', () => {
  const onApplySnooze = jest.fn();
  const onCancel = jest.fn();

  const renderModal = () =>
    render(
      <I18nProvider>
        <ActionPolicySnoozeModal
          title="Snooze notifications"
          onApplySnooze={onApplySnooze}
          onCancel={onCancel}
        />
      </I18nProvider>
    );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the duration options without the indefinite option', () => {
    renderModal();

    expect(screen.getByTestId('quickSnoozeDurationOptions')).toBeInTheDocument();
    expect(screen.queryByText('Indefinitely')).not.toBeInTheDocument();
  });

  it('words the helper copy for notifications rather than alerts', async () => {
    renderModal();

    expect(screen.getByText('How long should notifications be snoozed?')).toBeInTheDocument();

    await userEvent.click(screen.getByText('8h'));

    expect(screen.getByTestId('quickSnoozeUnsnoozeTime')).toHaveTextContent(
      /Notifications will resume on/
    );
  });

  it('applies the selected duration as an ISO date string', async () => {
    renderModal();

    await userEvent.click(screen.getByText('8h'));
    await userEvent.click(screen.getByTestId('actionPolicySnoozeModalApply'));

    expect(onApplySnooze).toHaveBeenCalledTimes(1);
    const [snoozedUntil] = onApplySnooze.mock.calls[0];
    expect(new Date(snoozedUntil).getTime()).toBeGreaterThan(Date.now());
  });

  it('disables apply while the custom duration is invalid', async () => {
    renderModal();

    await userEvent.click(screen.getByText('Custom'));
    await userEvent.clear(screen.getByTestId('durationValue'));

    expect(screen.getByTestId('actionPolicySnoozeModalApply')).toBeDisabled();
  });
});
