/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ConversationDateDivider } from './conversation_date_divider';

// Anchor "now" to a fixed point so Today/Yesterday cutoffs are deterministic.
const NOW = new Date('2026-06-15T12:00:00.000Z');

describe('ConversationDateDivider', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('labels the current day as "Today"', () => {
    render(<ConversationDateDivider date="2026-06-15T08:30:00.000Z" />);
    expect(screen.getByRole('separator', { name: 'Today' })).toBeInTheDocument();
  });

  it('labels the previous day as "Yesterday"', () => {
    render(<ConversationDateDivider date="2026-06-14T23:59:00.000Z" />);
    expect(screen.getByRole('separator', { name: 'Yesterday' })).toBeInTheDocument();
  });

  it('does not label two days ago as "Yesterday"', () => {
    render(<ConversationDateDivider date="2026-06-13T12:00:00.000Z" />);
    expect(screen.queryByRole('separator', { name: 'Yesterday' })).not.toBeInTheDocument();
  });

  it('shows weekday and date for older dates within the same year', () => {
    // 2026-03-10 is a Tuesday
    render(<ConversationDateDivider date="2026-03-10T10:00:00.000Z" />);
    // dddd + LL includes the year so the ordering is locale-aware ("Tuesday, March 10, 2026" in en)
    expect(screen.getByRole('separator', { name: 'Tuesday, March 10, 2026' })).toBeInTheDocument();
  });

  it('shows month, day, and year for dates from a prior year', () => {
    render(<ConversationDateDivider date="2025-08-15T10:00:00.000Z" />);
    expect(screen.getByRole('separator', { name: 'August 15, 2025' })).toBeInTheDocument();
  });
});
