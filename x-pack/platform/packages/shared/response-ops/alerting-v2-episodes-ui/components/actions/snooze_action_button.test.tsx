/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import type { HttpStart } from '@kbn/core-http-browser';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { AlertEpisodeSnoozeActionButton } from './snooze_action_button';
import { useCreateAlertAction } from '../../hooks/use_create_alert_action';

jest.mock('../../hooks/use_create_alert_action');

const useCreateAlertActionMock = jest.mocked(useCreateAlertAction);

const mockHttp: HttpStart = httpServiceMock.createStartContract();

describe('SnoozeActionButton', () => {
  const mutate = jest.fn();

  beforeEach(() => {
    mutate.mockReset();
    useCreateAlertActionMock.mockReturnValue({
      mutate,
      isLoading: false,
    } as unknown as ReturnType<typeof useCreateAlertAction>);
  });

  it('renders Snooze with bell when not snoozed (after unsnooze)', () => {
    render(
      <AlertEpisodeSnoozeActionButton
        lastSnoozeAction={ALERT_EPISODE_ACTION_TYPE.UNSNOOZE}
        http={mockHttp}
      />
    );
    expect(screen.getByText('Snooze')).toBeInTheDocument();
  });

  it('renders Snooze with bell when previous action is undefined', () => {
    render(<AlertEpisodeSnoozeActionButton lastSnoozeAction={undefined} http={mockHttp} />);
    expect(screen.getByTestId('alertEpisodeSnoozeActionButton')).toHaveTextContent('Snooze');
  });

  it('renders Unsnooze with bellSlash when snoozed', () => {
    render(
      <AlertEpisodeSnoozeActionButton
        lastSnoozeAction={ALERT_EPISODE_ACTION_TYPE.SNOOZE}
        http={mockHttp}
      />
    );
    expect(screen.getByText('Unsnooze')).toBeInTheDocument();
  });

  it('opens popover with snooze form content on click', async () => {
    const user = userEvent.setup();
    render(
      <AlertEpisodeSnoozeActionButton lastSnoozeAction={null} groupHash="gh-1" http={mockHttp} />
    );

    await user.click(screen.getByTestId('alertEpisodeSnoozeActionButton'));

    expect(await screen.findByTestId('alertEpisodeSnoozeForm')).toBeInTheDocument();
    expect(screen.getByText('Snooze notifications')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Apply' })).toBeInTheDocument();
  });

  it('closes popover after clicking Apply', async () => {
    const user = userEvent.setup();
    render(
      <AlertEpisodeSnoozeActionButton lastSnoozeAction={null} groupHash="gh-1" http={mockHttp} />
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
      <AlertEpisodeSnoozeActionButton
        lastSnoozeAction={ALERT_EPISODE_ACTION_TYPE.SNOOZE}
        groupHash="gh-1"
        http={mockHttp}
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
      <AlertEpisodeSnoozeActionButton lastSnoozeAction={null} groupHash="gh-1" http={mockHttp} />
    );

    await user.click(screen.getByTestId('alertEpisodeSnoozeActionButton'));
    await user.click(screen.getByRole('button', { name: 'Apply' }));

    expect(mutate).toHaveBeenCalledWith({
      groupHash: 'gh-1',
      actionType: ALERT_EPISODE_ACTION_TYPE.SNOOZE,
      body: {},
    });
  });
});
