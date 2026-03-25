/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
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
});
