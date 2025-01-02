/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import userEvent from '@testing-library/user-event';
import React from 'react';
import { DeleteAttachmentConfirmationModal } from './delete_attachment_confirmation_modal';
import { render, screen } from '@testing-library/react';

describe('DeleteAttachmentConfirmationModal', () => {
  const props = {
    title: 'My title',
    confirmButtonText: 'My button text',
    onCancel: jest.fn(),
    onConfirm: jest.fn(),
  };

  it('renders correctly', async () => {
    render(<DeleteAttachmentConfirmationModal {...props} />);

    expect(await screen.findByTestId('property-actions-confirm-modal')).toBeInTheDocument();
    expect(await screen.findByText('My title')).toBeInTheDocument();
    expect(await screen.findByText('My button text')).toBeInTheDocument();
    expect(await screen.findByText('Cancel')).toBeInTheDocument();
  });

  it('calls onConfirm', async () => {
    const result = render(<DeleteAttachmentConfirmationModal {...props} />);

    expect(await result.findByText('My button text')).toBeInTheDocument();
    await userEvent.click(await result.findByText('My button text'));

    expect(props.onConfirm).toHaveBeenCalled();
  });

  it('calls onCancel', async () => {
    render(<DeleteAttachmentConfirmationModal {...props} />);

    expect(await screen.findByText('Cancel')).toBeInTheDocument();
    await userEvent.click(await screen.findByText('Cancel'));

    expect(props.onCancel).toHaveBeenCalled();
  });
});
