/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AlertEpisodeActionsCell } from './alert_episode_actions_cell';

describe('AlertEpisodeActionsCell', () => {
  it('renders acknowledge, snooze, and more-actions controls', () => {
    render(<AlertEpisodeActionsCell />);
    expect(screen.getByTestId('alertEpisodeAcknowledgeActionButton')).toBeInTheDocument();
    expect(screen.getByTestId('alertEpisodeSnoozeActionButton')).toBeInTheDocument();
    expect(screen.getByTestId('alertingEpisodeActionsMoreButton')).toBeInTheDocument();
  });

  it('opens popover and shows Deactivate from episode action state', async () => {
    const user = userEvent.setup();
    render(
      <AlertEpisodeActionsCell
        episodeAction={{
          episodeId: 'e1',
          ruleId: 'r1',
          groupHash: 'g1',
          lastAckAction: null,
          lastDeactivateAction: null,
          lastSnoozeAction: null,
          tags: [],
        }}
      />
    );
    await user.click(screen.getByTestId('alertingEpisodeActionsMoreButton'));
    expect(
      await screen.findByTestId('alertingEpisodeActionsResolveActionButton')
    ).toHaveTextContent('Deactivate');
  });

  it('shows Activate in popover when episode is deactivated', async () => {
    const user = userEvent.setup();
    render(
      <AlertEpisodeActionsCell
        episodeAction={{
          episodeId: 'e1',
          ruleId: 'r1',
          groupHash: 'g1',
          lastAckAction: null,
          lastDeactivateAction: 'deactivate',
          lastSnoozeAction: null,
          tags: [],
        }}
      />
    );
    await user.click(screen.getByTestId('alertingEpisodeActionsMoreButton'));
    expect(
      await screen.findByTestId('alertingEpisodeActionsResolveActionButton')
    ).toHaveTextContent('Activate');
  });
});
