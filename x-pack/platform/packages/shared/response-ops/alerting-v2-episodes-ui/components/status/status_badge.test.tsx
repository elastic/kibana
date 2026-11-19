/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, renderHook, screen } from '@testing-library/react';
import { useEuiTheme } from '@elastic/eui';
import { AlertEpisodeStatusBadge } from './status_badge';
import { ALERT_EPISODE_STATUS } from '@kbn/alerting-v2-schemas';
import { alertTimelineStatusColor } from '../../alert_timeline/alert_timeline_status_palette';

describe('AlertEpisodeStatusBadge', () => {
  it.each([
    ALERT_EPISODE_STATUS.INACTIVE,
    ALERT_EPISODE_STATUS.PENDING,
    ALERT_EPISODE_STATUS.ACTIVE,
    ALERT_EPISODE_STATUS.RECOVERING,
  ])('renders a decorative %s Lifecycle-colored dot', (status) => {
    const {
      result: {
        current: { euiTheme },
      },
    } = renderHook(() => useEuiTheme());
    render(<AlertEpisodeStatusBadge status={status} />);
    const dot = screen.getByTestId('alertEpisodeStatusDot');
    expect(dot).toHaveAttribute('aria-hidden', 'true');
    expect(dot).toHaveStyleRule('background-color', alertTimelineStatusColor(euiTheme, status));
  });

  it('keeps the dot when a custom label is provided', () => {
    render(
      <AlertEpisodeStatusBadge status={ALERT_EPISODE_STATUS.ACTIVE}>Custom</AlertEpisodeStatusBadge>
    );
    expect(screen.getByText('Custom')).toBeInTheDocument();
    expect(screen.getByTestId('alertEpisodeStatusDot')).toBeInTheDocument();
  });

  it('renders an inactive badge', () => {
    render(<AlertEpisodeStatusBadge status={ALERT_EPISODE_STATUS.INACTIVE} />);
    const badge = screen.getByText('Inactive');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.euiBadge')).toBeInTheDocument();
  });

  it('renders a pending badge', () => {
    render(<AlertEpisodeStatusBadge status={ALERT_EPISODE_STATUS.PENDING} />);
    const badge = screen.getByText('Pending');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.euiBadge')).toBeInTheDocument();
  });

  it('renders an active badge', () => {
    render(<AlertEpisodeStatusBadge status={ALERT_EPISODE_STATUS.ACTIVE} />);
    const badge = screen.getByText('Active');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.euiBadge')).toBeInTheDocument();
  });

  it('renders a recovering badge', () => {
    render(<AlertEpisodeStatusBadge status={ALERT_EPISODE_STATUS.RECOVERING} />);
    const badge = screen.getByText('Recovering');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.euiBadge')).toBeInTheDocument();
  });

  it('renders an unknown badge for unrecognized status', () => {
    // @ts-expect-error unknown status string
    render(<AlertEpisodeStatusBadge status="unknown-status" />);
    const badge = screen.getByText('Unknown');
    expect(badge).toBeInTheDocument();
    expect(badge.closest('.euiBadge')).toBeInTheDocument();
  });
});
