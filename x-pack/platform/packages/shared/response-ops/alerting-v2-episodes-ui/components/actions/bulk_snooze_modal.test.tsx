/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BulkSnoozeModal } from './bulk_snooze_modal';

describe('BulkSnoozeModal', () => {
  it('renders the snooze form inside a modal', () => {
    render(<BulkSnoozeModal onClose={jest.fn()} onApplySnooze={jest.fn()} />);
    expect(screen.getByTestId('alertEpisodeSnoozeForm')).toBeInTheDocument();
    expect(screen.getByText('Snooze selected episodes')).toBeInTheDocument();
  });

  it('calls onClose when the modal close button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClose = jest.fn();
    render(<BulkSnoozeModal onClose={mockOnClose} onApplySnooze={jest.fn()} />);
    // EUI's built-in modal close button
    await user.click(screen.getByLabelText('Closes this modal window'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('calls onApplySnooze with an ISO expiry when the form Apply button is clicked', async () => {
    const user = userEvent.setup();
    const mockOnApplySnooze = jest.fn();
    render(<BulkSnoozeModal onClose={jest.fn()} onApplySnooze={mockOnApplySnooze} />);
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(mockOnApplySnooze).toHaveBeenCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/));
  });

  it('calls onClose after onApplySnooze when Apply is clicked', async () => {
    const user = userEvent.setup();
    const mockOnClose = jest.fn();
    const mockOnApplySnooze = jest.fn();
    render(<BulkSnoozeModal onClose={mockOnClose} onApplySnooze={mockOnApplySnooze} />);
    await user.click(screen.getByRole('button', { name: 'Apply' }));
    expect(mockOnApplySnooze).toHaveBeenCalled();
    expect(mockOnClose).toHaveBeenCalled();
  });
});
