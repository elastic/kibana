/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { AlertEpisodeActionsCell } from './alert_episode_actions_cell';
import { useCreateAlertAction } from '../../../hooks/use_create_alert_action';

jest.mock('../../../hooks/use_create_alert_action');

const useCreateAlertActionMock = jest.mocked(useCreateAlertAction);
const mockServices = { http: {} as any };

describe('AlertEpisodeActionsCell', () => {
  beforeEach(() => {
    useCreateAlertActionMock.mockReturnValue({
      mutate: jest.fn(),
      isLoading: false,
    } as any);
  });

  it('renders acknowledge, snooze, and more-actions controls', () => {
    render(<AlertEpisodeActionsCell http={mockServices.http} />);
    expect(screen.getByTestId('alertEpisodeAcknowledgeActionButton')).toBeInTheDocument();
    expect(screen.getByTestId('alertEpisodeSnoozeActionButton')).toBeInTheDocument();
    expect(screen.getByTestId('alertingEpisodeActionsMoreButton')).toBeInTheDocument();
  });

  it('opens popover and shows Deactivate from episode action state', async () => {
    const user = userEvent.setup();
    render(
      <AlertEpisodeActionsCell
        http={mockServices.http}
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
    ).toHaveTextContent('Unresolve');
  });

  it('shows Activate in popover when episode is deactivated', async () => {
    const user = userEvent.setup();
    render(
      <AlertEpisodeActionsCell
        http={mockServices.http}
        episodeAction={{
          episodeId: 'e1',
          ruleId: 'r1',
          groupHash: 'g1',
          lastAckAction: null,
          lastDeactivateAction: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
          lastSnoozeAction: null,
          tags: [],
        }}
      />
    );
    await user.click(screen.getByTestId('alertingEpisodeActionsMoreButton'));
    expect(
      await screen.findByTestId('alertingEpisodeActionsResolveActionButton')
    ).toHaveTextContent('Resolve');
  });
});
