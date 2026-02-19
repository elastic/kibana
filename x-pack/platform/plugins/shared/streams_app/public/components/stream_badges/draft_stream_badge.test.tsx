/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { DraftStreamBadge } from '.';

describe('DraftStreamBadge', () => {
  it('should render draft badge with correct label', () => {
    render(<DraftStreamBadge />);

    expect(screen.getByText('Draft')).toBeInTheDocument();
  });

  it('should render with correct test subject', () => {
    render(<DraftStreamBadge />);

    expect(screen.getByTestId('draftStreamBadge')).toBeInTheDocument();
  });

  it('should render with warning color', () => {
    render(<DraftStreamBadge />);

    const badge = screen.getByTestId('draftStreamBadge');
    // EuiBadge with color="warning" renders with specific class pattern
    expect(badge.className).toMatch(/warning/i);
  });

  it('should render with documentEdit icon', () => {
    render(<DraftStreamBadge />);

    const badge = screen.getByTestId('draftStreamBadge');
    // Check that the badge contains an icon (EUI renders icons inside badges)
    const icon = badge.querySelector('[data-euiicon-type="documentEdit"]');
    expect(icon).toBeInTheDocument();
  });
});
