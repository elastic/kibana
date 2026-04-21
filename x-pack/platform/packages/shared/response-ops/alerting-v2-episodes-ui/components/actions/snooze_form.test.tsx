/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { AlertEpisodeSnoozeForm, computeEpisodeSnoozedUntil } from './snooze_form';

describe('AlertEpisodeSnoozeForm', () => {
  it('computeEpisodeSnoozedUntil returns a future ISO date', () => {
    const before = Date.now();
    const result = computeEpisodeSnoozedUntil(1, 'h');
    const after = Date.now();
    const parsed = Date.parse(result);

    expect(Number.isNaN(parsed)).toBe(false);
    expect(parsed).toBeGreaterThanOrEqual(before + 3_600_000);
    expect(parsed).toBeLessThanOrEqual(after + 3_600_000 + 1_000);
  });

  it('applies preset snooze duration when a preset is clicked', async () => {
    const user = userEvent.setup();
    const onApplySnooze = jest.fn();

    render(<AlertEpisodeSnoozeForm onApplySnooze={onApplySnooze} />);

    await user.click(screen.getByRole('button', { name: '1 hour' }));

    expect(onApplySnooze).toHaveBeenCalledTimes(1);
    expect(Number.isNaN(Date.parse(onApplySnooze.mock.calls[0][0]))).toBe(false);
  });
});
