/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { SnoozeActionButton } from './snooze_action_button';

describe('SnoozeActionButton', () => {
  it('renders Snooze with bellSlash when not snoozed', () => {
    render(<SnoozeActionButton lastSnoozeAction={null} />);
    expect(screen.getByTestId('alertEpisodeSnoozeActionButton')).toHaveTextContent('Snooze');
    expect(
      screen
        .getByTestId('alertEpisodeSnoozeActionButton')
        .querySelector('[data-euiicon-type="bellSlash"]')
    ).toBeInTheDocument();
  });

  it('renders Unsnooze with bell when snoozed', () => {
    render(<SnoozeActionButton lastSnoozeAction="snooze" />);
    expect(screen.getByTestId('alertEpisodeSnoozeActionButton')).toHaveTextContent('Unsnooze');
    expect(
      screen
        .getByTestId('alertEpisodeSnoozeActionButton')
        .querySelector('[data-euiicon-type="bell"]')
    ).toBeInTheDocument();
  });

  it('opens popover with snooze form content on click', async () => {
    const user = userEvent.setup();
    render(<SnoozeActionButton lastSnoozeAction={null} />);

    await user.click(screen.getByTestId('alertEpisodeSnoozeActionButton'));

    expect(screen.getByTestId('alertEpisodeSnoozeForm')).toBeInTheDocument();
    expect(screen.getByLabelText('Snooze duration value')).toBeInTheDocument();
    expect(screen.getByLabelText('Snooze duration unit')).toBeInTheDocument();
  });

  it('closes popover after clicking Apply', async () => {
    const user = userEvent.setup();
    render(<SnoozeActionButton lastSnoozeAction={null} />);

    await user.click(screen.getByTestId('alertEpisodeSnoozeActionButton'));
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() =>
      expect(screen.queryByTestId('alertEpisodeSnoozeForm')).not.toBeInTheDocument()
    );
  });

  it('shows cancel snooze and closes popover after click when snoozed', async () => {
    const user = userEvent.setup();
    render(<SnoozeActionButton lastSnoozeAction="snooze" />);

    await user.click(screen.getByTestId('alertEpisodeSnoozeActionButton'));

    const cancelButton = screen.getByRole('button', { name: 'Cancel snooze' });
    expect(cancelButton).toBeInTheDocument();

    await user.click(cancelButton);

    await waitFor(() =>
      expect(screen.queryByTestId('alertEpisodeSnoozeForm')).not.toBeInTheDocument()
    );
  });
});
