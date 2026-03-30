/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AlertEpisodeStatusCell } from './alert_episode_status_cell';
import { ALERT_EPISODE_ACTION_TYPE } from '@kbn/alerting-v2-schemas';

describe('AlertEpisodeStatusCell', () => {
  it('renders status badge only when no action indicators', () => {
    render(<AlertEpisodeStatusCell status="active" />);
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByTestId('alertEpisodeStatusCell')).toBeInTheDocument();
    expect(screen.queryByTestId('alertEpisodeStatusCellSnoozeIndicator')).not.toBeInTheDocument();
    expect(screen.queryByTestId('alertEpisodeStatusCellAckIndicator')).not.toBeInTheDocument();
  });

  it('renders snoozed bellSlash badge when last snooze action is snooze', () => {
    render(
      <AlertEpisodeStatusCell
        status="active"
        episodeAction={{
          episodeId: '1',
          ruleId: '1',
          groupHash: '1',
          lastAckAction: null,
          lastSnoozeAction: ALERT_EPISODE_ACTION_TYPE.SNOOZE,
          lastDeactivateAction: null,
          tags: [],
        }}
      />
    );
    expect(screen.getByTestId('alertEpisodeStatusCellSnoozeIndicator')).toBeInTheDocument();
  });

  it('renders checkCircle badge when acknowledged', () => {
    render(
      <AlertEpisodeStatusCell
        status="active"
        episodeAction={{
          episodeId: '1',
          ruleId: '1',
          groupHash: '1',
          lastAckAction: ALERT_EPISODE_ACTION_TYPE.ACK,
          lastSnoozeAction: null,
          lastDeactivateAction: null,
          tags: [],
        }}
      />
    );
    expect(screen.getByTestId('alertEpisodeStatusCellAckIndicator')).toBeInTheDocument();
  });

  it('renders inactive badge when last deactivate action is deactivate', () => {
    render(
      <AlertEpisodeStatusCell
        status="active"
        episodeAction={{
          episodeId: '1',
          ruleId: '1',
          groupHash: '1',
          lastAckAction: null,
          lastSnoozeAction: null,
          lastDeactivateAction: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
          tags: [],
        }}
      />
    );
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });
});
