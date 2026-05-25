/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { TimeoutChip } from './timeout_chip';

describe('TimeoutChip', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-04-24T12:00:00Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('renders nothing when no timeout and not expired', () => {
    const { container } = render(<TimeoutChip timeoutAt={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the expired badge when expired prop is true', () => {
    render(<TimeoutChip timeoutAt={null} expired />);
    expect(screen.getByText('Timed out')).toBeInTheDocument();
  });

  it('renders a countdown when timeout_at is in the future', () => {
    render(<TimeoutChip timeoutAt={'2026-04-24T13:00:00Z'} />);
    expect(screen.getByText(/Timeout in/)).toBeInTheDocument();
  });

  it('renders the expired badge when timeout_at is already past', () => {
    render(<TimeoutChip timeoutAt={'2026-04-24T11:00:00Z'} />);
    expect(screen.getByText('Timed out')).toBeInTheDocument();
  });

  it('renders nothing for a malformed timeout_at rather than leaking "NaN" into the UI', () => {
    const { container } = render(<TimeoutChip timeoutAt={'not-a-date'} />);
    expect(container).toBeEmptyDOMElement();
  });
});
