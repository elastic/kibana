/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { AlertEpisodeStatusBadge } from './alert_episode_status_badge';

describe('AlertEpisodeStatusBadge', () => {
  it('renders an inactive badge', () => {
    render(<AlertEpisodeStatusBadge status="inactive" />);
    const badge = screen.getByText('Inactive');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('class', expect.stringContaining('euiBadge'));
  });

  it('renders a pending badge', () => {
    render(<AlertEpisodeStatusBadge status="pending" />);
    const badge = screen.getByText('Pending');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('class', expect.stringContaining('euiBadge'));
  });

  it('renders an active badge', () => {
    render(<AlertEpisodeStatusBadge status="active" />);
    const badge = screen.getByText('Active');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('class', expect.stringContaining('euiBadge'));
  });

  it('renders a recovering badge', () => {
    render(<AlertEpisodeStatusBadge status="recovering" />);
    const badge = screen.getByText('Recovering');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('class', expect.stringContaining('euiBadge'));
  });

  it('renders an unknown badge for unrecognized status', () => {
    // @ts-expect-error unknown status string
    render(<AlertEpisodeStatusBadge status="unknown-status" />);
    const badge = screen.getByText('Unknown');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('class', expect.stringContaining('euiBadge'));
  });
});
