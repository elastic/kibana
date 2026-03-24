/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TemplateResetModal } from './template_reset_modal';
import { renderWithTestingProviders } from '../../../common/mock';

describe('TemplateResetModal', () => {
  const user = userEvent.setup({ pointerEventsCheck: 0 });
  const defaultProps = {
    onCancel: jest.fn(),
    onConfirm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the modal with correct title', () => {
    renderWithTestingProviders(<TemplateResetModal {...defaultProps} />);

    expect(screen.getByText('Revert changes?')).toBeInTheDocument();
  });

  it('renders the modal body text', () => {
    renderWithTestingProviders(<TemplateResetModal {...defaultProps} />);

    expect(
      screen.getByText('All unsaved changes will be lost. This action cannot be undone.')
    ).toBeInTheDocument();
  });

  it('renders cancel button', () => {
    renderWithTestingProviders(<TemplateResetModal {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });

  it('renders confirm button', () => {
    renderWithTestingProviders(<TemplateResetModal {...defaultProps} />);

    expect(screen.getByRole('button', { name: 'Revert' })).toBeInTheDocument();
  });

  it('calls onCancel when cancel button is clicked', async () => {
    renderWithTestingProviders(<TemplateResetModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    expect(defaultProps.onConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    renderWithTestingProviders(<TemplateResetModal {...defaultProps} />);

    await user.click(screen.getByRole('button', { name: 'Revert' }));

    expect(defaultProps.onConfirm).toHaveBeenCalledTimes(1);
    expect(defaultProps.onCancel).not.toHaveBeenCalled();
  });

  it('has proper aria-labelledby for accessibility', () => {
    renderWithTestingProviders(<TemplateResetModal {...defaultProps} />);

    const modal = screen.getByRole('alertdialog');
    expect(modal).toHaveAccessibleName('Revert changes?');
  });
});
