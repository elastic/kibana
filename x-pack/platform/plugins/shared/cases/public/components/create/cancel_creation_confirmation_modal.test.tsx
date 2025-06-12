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
import { CancelCreationConfirmationModal } from './cancel_creation_confirmation_modal';

describe('CancelCreationConfirmationModal', () => {
  const props = {
    title: 'My title',
    confirmButtonText: 'My confirm button text',
    cancelButtonText: 'My cancel button text',
    onCancel: jest.fn(),
    onConfirm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    renderWithTestingProviders(<CancelCreationConfirmationModal {...props} />);

    expect(screen.getByTestId('cancel-creation-confirmation-modal')).toBeInTheDocument();
    expect(screen.getByText(props.title)).toBeInTheDocument();
    expect(screen.getByText(props.confirmButtonText)).toBeInTheDocument();
    expect(screen.getByText(props.cancelButtonText)).toBeInTheDocument();
  });

  it('calls onConfirm', async () => {
    renderWithTestingProviders(<CancelCreationConfirmationModal {...props} />);

    expect(screen.getByText(props.confirmButtonText)).toBeInTheDocument();
    await userEvent.click(screen.getByText(props.confirmButtonText));

    expect(props.onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel', async () => {
    renderWithTestingProviders(<CancelCreationConfirmationModal {...props} />);

    expect(screen.getByText(props.cancelButtonText)).toBeInTheDocument();
    await userEvent.click(screen.getByText(props.cancelButtonText));

    expect(props.onCancel).toHaveBeenCalled();
  });
});
