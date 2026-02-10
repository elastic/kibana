/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AlertSnoozePopover } from './alert_snooze_popover';

describe('AlertSnoozePopover', () => {
  const onClose = jest.fn();
  const onApplySnooze = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderPopover = (isOpen = true, currentSeverity = 'high') => {
    return render(
      <AlertSnoozePopover
        isOpen={isOpen}
        onClose={onClose}
        button={<button>Trigger</button>}
        onApplySnooze={onApplySnooze}
        currentSeverity={currentSeverity}
      />
    );
  };

  it('renders the popover title and description when open', () => {
    renderPopover();
    expect(screen.getByText('Snooze alert notifications')).toBeInTheDocument();
    expect(
      screen.getByText('Suppress actions for this alert for a period or until conditions are met.')
    ).toBeInTheDocument();
  });

  it('renders quick snooze buttons', () => {
    renderPopover();
    expect(screen.getByTestId('alert-snooze-1h')).toBeInTheDocument();
    expect(screen.getByTestId('alert-snooze-3h')).toBeInTheDocument();
    expect(screen.getByTestId('alert-snooze-8h')).toBeInTheDocument();
    expect(screen.getByTestId('alert-snooze-1d')).toBeInTheDocument();
  });

  it('renders the indefinite snooze link', () => {
    renderPopover();
    expect(screen.getByTestId('alert-snooze-indefinite')).toBeInTheDocument();
  });

  it('calls onApplySnooze with expiresAt when a quick snooze is clicked', async () => {
    renderPopover();
    fireEvent.click(screen.getByTestId('alert-snooze-1h'));

    await waitFor(() => {
      expect(onApplySnooze).toHaveBeenCalledTimes(1);
      const call = onApplySnooze.mock.calls[0][0];
      expect(call).toHaveProperty('expiresAt');
      expect(new Date(call.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });
  });

  it('calls onApplySnooze without expiresAt for indefinite snooze', async () => {
    renderPopover();
    fireEvent.click(screen.getByTestId('alert-snooze-indefinite'));

    await waitFor(() => {
      expect(onApplySnooze).toHaveBeenCalledTimes(1);
      const call = onApplySnooze.mock.calls[0][0];
      expect(call).not.toHaveProperty('expiresAt');
    });
  });

  it('renders condition checkboxes', () => {
    renderPopover();
    expect(screen.getByText('Until severity changes')).toBeInTheDocument();
    expect(screen.getByText('Until severity reaches')).toBeInTheDocument();
    expect(screen.getByText('OR after a time period')).toBeInTheDocument();
  });

  it('shows the "Apply snooze with conditions" button when a condition is checked', () => {
    renderPopover();
    expect(screen.queryByTestId('alert-snooze-apply-conditions')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Until severity changes'));
    expect(screen.getByTestId('alert-snooze-apply-conditions')).toBeInTheDocument();
  });

  it('applies conditions with severity_change when checkbox is checked', async () => {
    renderPopover();
    fireEvent.click(screen.getByText('Until severity changes'));
    fireEvent.click(screen.getByTestId('alert-snooze-apply-conditions'));

    await waitFor(() => {
      expect(onApplySnooze).toHaveBeenCalledTimes(1);
      const call = onApplySnooze.mock.calls[0][0];
      expect(call.conditions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'severity_change', snapshotValue: 'high' }),
        ])
      );
    });
  });

  it('renders nothing when not open', () => {
    renderPopover(false);
    expect(screen.queryByText('Snooze alert notifications')).not.toBeInTheDocument();
  });

  it('calls onClose when cancel is clicked', () => {
    renderPopover();
    fireEvent.click(screen.getByTestId('alert-snooze-cancel'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
