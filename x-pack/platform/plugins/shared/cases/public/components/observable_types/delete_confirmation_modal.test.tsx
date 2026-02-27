/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';

import { renderWithTestingProviders } from '../../common/mock';
import { DeleteConfirmationModal } from './delete_confirmation_modal';

describe('DeleteConfirmationModal', () => {
  const props = {
    label: 'Delete observable',
    onCancel: jest.fn(),
    onConfirm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    renderWithTestingProviders(<DeleteConfirmationModal {...props} />);

    expect(screen.getByTestId('confirm-delete-observable-modal')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('calls onConfirm', async () => {
    renderWithTestingProviders(<DeleteConfirmationModal {...props} />);

    expect(screen.getByText('Delete')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Delete'));

    expect(props.onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel', async () => {
    renderWithTestingProviders(<DeleteConfirmationModal {...props} />);

    expect(screen.getByText('Cancel')).toBeInTheDocument();
    await userEvent.click(screen.getByText('Cancel'));

    expect(props.onCancel).toHaveBeenCalled();
  });
});
