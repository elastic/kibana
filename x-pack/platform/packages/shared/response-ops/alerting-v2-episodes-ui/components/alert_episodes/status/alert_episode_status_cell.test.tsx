/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { AlertEpisodeStatusCell } from './alert_episode_status_cell';
import { ALERT_EPISODE_ACTION_TYPE, ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';

const renderWithI18n = (ui: React.ReactElement) => render(<I18nProvider>{ui}</I18nProvider>);

describe('AlertEpisodeStatusCell', () => {
  it('renders status badge only when no action indicators', () => {
    renderWithI18n(<AlertEpisodeStatusCell status={ALERT_EPISODE_STATUS.ACTIVE} />);
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByTestId('alertEpisodeStatusCell')).toBeInTheDocument();
    expect(screen.queryByTestId('alertEpisodeStatusCellSnoozeIndicator')).not.toBeInTheDocument();
    expect(screen.queryByTestId('alertEpisodeStatusCellAckIndicator')).not.toBeInTheDocument();
  });

  it('renders snoozed bellSlash badge when group action has snooze', () => {
    renderWithI18n(
      <AlertEpisodeStatusCell
        status={ALERT_EPISODE_STATUS.ACTIVE}
        groupAction={{
          groupHash: '1',
          ruleId: '1',
          lastSnoozeAction: ALERT_EPISODE_ACTION_TYPE.SNOOZE,
          lastDeactivateAction: null,
          snoozeExpiry: null,
          tags: [],
        }}
      />
    );
    expect(screen.getByTestId('alertEpisodeStatusCellSnoozeIndicator')).toBeInTheDocument();
  });

  it('shows snooze expiry in tooltip on hover when snoozeExpiry is set', async () => {
    const user = userEvent.setup();
    renderWithI18n(
      <AlertEpisodeStatusCell
        status={ALERT_EPISODE_STATUS.ACTIVE}
        groupAction={{
          groupHash: '1',
          ruleId: '1',
          lastSnoozeAction: ALERT_EPISODE_ACTION_TYPE.SNOOZE,
          lastDeactivateAction: null,
          snoozeExpiry: '2035-06-15T14:30:00.000Z',
          tags: [],
        }}
      />
    );
    await user.hover(screen.getByTestId('alertEpisodeStatusCellSnoozeIndicator'));
    const tooltip = await screen.findByRole('tooltip');
    expect(tooltip).toHaveTextContent(/snoozed until/i);
    expect(tooltip).toHaveTextContent(/2035/);
  });

  it('shows generic snooze tooltip when snoozeExpiry is missing', async () => {
    const user = userEvent.setup();
    renderWithI18n(
      <AlertEpisodeStatusCell
        status={ALERT_EPISODE_STATUS.ACTIVE}
        groupAction={{
          groupHash: '1',
          ruleId: '1',
          lastSnoozeAction: ALERT_EPISODE_ACTION_TYPE.SNOOZE,
          lastDeactivateAction: null,
          snoozeExpiry: null,
          tags: [],
        }}
      />
    );
    await user.hover(screen.getByTestId('alertEpisodeStatusCellSnoozeIndicator'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent(/snoozed/i);
  });

  it('renders checkCircle badge when acknowledged via episodeAction', () => {
    renderWithI18n(
      <AlertEpisodeStatusCell
        status={ALERT_EPISODE_STATUS.ACTIVE}
        episodeAction={{
          episodeId: '1',
          ruleId: '1',
          groupHash: '1',
          lastAckAction: ALERT_EPISODE_ACTION_TYPE.ACK,
        }}
      />
    );
    expect(screen.getByTestId('alertEpisodeStatusCellAckIndicator')).toBeInTheDocument();
  });

  it('shows acknowledged tooltip on hover', async () => {
    const user = userEvent.setup();
    renderWithI18n(
      <AlertEpisodeStatusCell
        status={ALERT_EPISODE_STATUS.ACTIVE}
        episodeAction={{
          episodeId: '1',
          ruleId: '1',
          groupHash: '1',
          lastAckAction: ALERT_EPISODE_ACTION_TYPE.ACK,
        }}
      />
    );
    await user.hover(screen.getByTestId('alertEpisodeStatusCellAckIndicator'));
    expect(await screen.findByRole('tooltip')).toHaveTextContent(/acknowledged/i);
  });

  it('renders inactive badge when group action has deactivate', () => {
    renderWithI18n(
      <AlertEpisodeStatusCell
        status={ALERT_EPISODE_STATUS.ACTIVE}
        groupAction={{
          groupHash: '1',
          ruleId: '1',
          lastSnoozeAction: null,
          lastDeactivateAction: ALERT_EPISODE_ACTION_TYPE.DEACTIVATE,
          snoozeExpiry: null,
          tags: [],
        }}
      />
    );
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });
});
