/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { SnoozeActionButton } from './snooze_action_button';
import { useCreateAlertAction } from '../../../hooks/use_create_alert_action';

jest.mock('../../../hooks/use_create_alert_action');

const useCreateAlertActionMock = jest.mocked(useCreateAlertAction);
const mockServices = { http: {} as any };

describe('SnoozeActionButton', () => {
  const mutate = jest.fn();

  beforeEach(() => {
    mutate.mockReset();
    useCreateAlertActionMock.mockReturnValue({
      mutate,
      isLoading: false,
    } as any);
  });

  it('renders Snooze with bell when not snoozed (after unsnooze)', () => {
    render(
      <SnoozeActionButton
        lastSnoozeAction={ALERT_EPISODE_ACTION_TYPE.UNSNOOZE}
        http={mockServices.http}
      />
    );
    expect(screen.getByTestId('alertEpisodeSnoozeActionButton')).toHaveTextContent('Snooze');
    expect(
      screen
        .getByTestId('alertEpisodeSnoozeActionButton')
        .querySelector('[data-euiicon-type="bell"]')
    ).toBeInTheDocument();
  });

  it('renders Snooze with bell when previous action is undefined', () => {
    render(<SnoozeActionButton lastSnoozeAction={undefined} http={mockServices.http} />);
    expect(screen.getByTestId('alertEpisodeSnoozeActionButton')).toHaveTextContent('Snooze');
    expect(
      screen
        .getByTestId('alertEpisodeSnoozeActionButton')
        .querySelector('[data-euiicon-type="bell"]')
    ).toBeInTheDocument();
  });

  it('renders Unsnooze with bellSlash when snoozed', () => {
    render(
      <SnoozeActionButton
        lastSnoozeAction={ALERT_EPISODE_ACTION_TYPE.SNOOZE}
        http={mockServices.http}
      />
    );
    expect(screen.getByTestId('alertEpisodeUnsnoozeActionButton')).toHaveTextContent('Unsnooze');
    expect(
      screen
        .getByTestId('alertEpisodeUnsnoozeActionButton')
        .querySelector('[data-euiicon-type="bellSlash"]')
    ).toBeInTheDocument();
  });

  it('opens popover with snooze form content on click', async () => {
    const user = userEvent.setup();
    render(
      <SnoozeActionButton lastSnoozeAction={null} groupHash="gh-1" http={mockServices.http} />
    );

    await user.click(screen.getByTestId('alertEpisodeSnoozeActionButton'));

    expect(await screen.findByTestId('alertEpisodeSnoozeForm')).toBeInTheDocument();
    expect(screen.getByLabelText('Snooze duration value')).toBeInTheDocument();
    expect(screen.getByLabelText('Snooze duration unit')).toBeInTheDocument();
  });

  it('closes popover after clicking Apply', async () => {
    const user = userEvent.setup();
    render(
      <SnoozeActionButton lastSnoozeAction={null} groupHash="gh-1" http={mockServices.http} />
    );

    await user.click(screen.getByTestId('alertEpisodeSnoozeActionButton'));
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() =>
      expect(screen.queryByTestId('alertEpisodeSnoozeForm')).not.toBeInTheDocument()
    );
  });

  it('calls unsnooze mutation when Unsnooze is clicked', async () => {
    const user = userEvent.setup();
    render(
      <SnoozeActionButton
        lastSnoozeAction={ALERT_EPISODE_ACTION_TYPE.SNOOZE}
        groupHash="gh-1"
        http={mockServices.http}
      />
    );

    await user.click(screen.getByTestId('alertEpisodeUnsnoozeActionButton'));

    expect(mutate).toHaveBeenCalledWith({
      groupHash: 'gh-1',
      actionType: ALERT_EPISODE_ACTION_TYPE.UNSNOOZE,
    });
  });

  it('calls snooze route mutation when applying from popover', async () => {
    const user = userEvent.setup();
    render(
      <SnoozeActionButton lastSnoozeAction={null} groupHash="gh-1" http={mockServices.http} />
    );

    await user.click(screen.getByTestId('alertEpisodeSnoozeActionButton'));
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(mutate).toHaveBeenCalledWith({
      groupHash: 'gh-1',
      actionType: ALERT_EPISODE_ACTION_TYPE.SNOOZE,
      body: { expiry: expect.any(String) },
    });
  });
});
