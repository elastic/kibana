/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { HttpStart } from '@kbn/core-http-browser';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';
import { AlertEpisodeActionsCell } from './alert_episode_actions_cell';
import { useCreateAlertAction } from '../../../hooks/use_create_alert_action';

jest.mock('../../../hooks/use_create_alert_action');

const useCreateAlertActionMock = jest.mocked(useCreateAlertAction);

const mockHttp: HttpStart = httpServiceMock.createStartContract();

describe('AlertEpisodeActionsCell', () => {
  beforeEach(() => {
    useCreateAlertActionMock.mockReturnValue({
      mutate: jest.fn(),
      isLoading: false,
    } as unknown as ReturnType<typeof useCreateAlertAction>);
  });

  it('renders acknowledge, snooze, and more-actions controls', () => {
    render(<AlertEpisodeActionsCell http={mockHttp} />);
    expect(screen.getByTestId('alertEpisodeAcknowledgeActionButton')).toBeInTheDocument();
    expect(screen.getByTestId('alertEpisodeSnoozeActionButton')).toBeInTheDocument();
    expect(screen.getByTestId('alertingEpisodeActionsMoreButton')).toBeInTheDocument();
  });

  it('opens popover and shows Resolve when not deactivated', async () => {
    const user = userEvent.setup();
    render(
      <AlertEpisodeActionsCell
        http={mockHttp}
        groupAction={{
          groupHash: 'g1',
          ruleId: 'r1',
          lastDeactivateAction: null,
          lastSnoozeAction: null,
          snoozeExpiry: null,
          tags: [],
        }}
      />
    );
    await user.click(screen.getByTestId('alertingEpisodeActionsMoreButton'));
    expect(screen.getByText('Resolve')).toBeInTheDocument();
  });

  it('shows Unresolve in popover when group action is deactivated', async () => {
    const user = userEvent.setup();
    render(
      <AlertEpisodeActionsCell
        http={mockHttp}
        groupAction={{
          groupHash: 'g1',
          ruleId: 'r1',
          lastDeactivateAction: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
          lastSnoozeAction: null,
          snoozeExpiry: null,
          tags: [],
        }}
      />
    );
    await user.click(screen.getByTestId('alertingEpisodeActionsMoreButton'));
    expect(screen.getByText('Unresolve')).toBeInTheDocument();
  });
});
