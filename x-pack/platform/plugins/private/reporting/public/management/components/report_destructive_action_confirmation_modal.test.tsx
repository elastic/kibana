/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { ReportDestructiveActionConfirmationModal } from './report_destructive_action_confirmation_modal';

describe('ReportDestructiveActionConfirmationModal', () => {
  const mockOnCancel = jest.fn();
  const mockOnConfirm = jest.fn();

  it('should render the provided texts', () => {
    render(
      <ReportDestructiveActionConfirmationModal
        title="Destructive action title"
        message="Destructive action message"
        confirmButtonText="Confirm"
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
      />
    );

    expect(screen.getByText('Destructive action title')).toBeInTheDocument();
    expect(screen.getByText('Destructive action message')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
  });

  it('should call onCancel when cancel button is clicked', () => {
    render(
      <ReportDestructiveActionConfirmationModal
        title="Destructive action title"
        message="Destructive action message"
        confirmButtonText="Confirm"
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
      />
    );

    screen.getByText('Cancel').click();
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should call onConfirm when confirm button is clicked', () => {
    render(
      <ReportDestructiveActionConfirmationModal
        title="Destructive action title"
        message="Destructive action message"
        confirmButtonText="Confirm"
        onCancel={mockOnCancel}
        onConfirm={mockOnConfirm}
      />
    );

    screen.getByText('Confirm').click();
    expect(mockOnConfirm).toHaveBeenCalled();
  });
});
