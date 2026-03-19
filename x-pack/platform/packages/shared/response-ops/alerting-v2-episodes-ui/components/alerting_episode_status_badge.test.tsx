/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { AlertingEpisodeStatusBadge } from './alerting_episode_status_badge';

describe('AlertingEpisodeStatusBadge', () => {
  it('renders an inactive badge', () => {
    const { getByText } = render(<AlertingEpisodeStatusBadge status="inactive" />);
    const badge = getByText('Inactive');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('class', expect.stringContaining('euiBadge'));
  });

  it('renders a pending badge', () => {
    const { getByText } = render(<AlertingEpisodeStatusBadge status="pending" />);
    const badge = getByText('Pending');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('class', expect.stringContaining('euiBadge'));
  });

  it('renders an active badge', () => {
    const { getByText } = render(<AlertingEpisodeStatusBadge status="active" />);
    const badge = getByText('Active');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('class', expect.stringContaining('euiBadge'));
  });

  it('renders a recovering badge', () => {
    const { getByText } = render(<AlertingEpisodeStatusBadge status="recovering" />);
    const badge = getByText('Recovering');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('class', expect.stringContaining('euiBadge'));
  });

  it('renders an unknown badge for unrecognized status', () => {
    // @ts-expect-error unknown status string
    const { getByText } = render(<AlertingEpisodeStatusBadge status="unknown-status" />);
    const badge = getByText('Unknown');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute('class', expect.stringContaining('euiBadge'));
  });
});
