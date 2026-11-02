/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { RemoveWithRelatedConfirmationModal } from './remove_with_related_confirmation_modal';

describe('RemoveWithRelatedConfirmationModal', () => {
  const props = {
    title: 'Remove 1 attack?',
    relatedRemoval: {
      description: 'Also remove the alerts this attack added to the case?',
      removeOnlyLabel: 'Remove attack only',
      removeWithRelatedLabel: 'Remove attack and alerts',
    },
    onCancel: jest.fn(),
    onConfirm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the title, description and both removal choices', () => {
    render(<RemoveWithRelatedConfirmationModal {...props} />);

    expect(screen.getByText('Remove 1 attack?')).toBeInTheDocument();
    expect(screen.getByTestId('remove-with-related-modal-description')).toHaveTextContent(
      'Also remove the alerts this attack added to the case?'
    );
    expect(screen.getByText('Remove attack only')).toBeInTheDocument();
    expect(screen.getByText('Remove attack and alerts')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('removes only the selected attachments', async () => {
    render(<RemoveWithRelatedConfirmationModal {...props} />);

    await userEvent.click(screen.getByText('Remove attack only'));

    expect(props.onConfirm).toHaveBeenCalledWith({ includeRelated: false });
  });

  it('removes the related attachments too', async () => {
    render(<RemoveWithRelatedConfirmationModal {...props} />);

    await userEvent.click(screen.getByText('Remove attack and alerts'));

    expect(props.onConfirm).toHaveBeenCalledWith({ includeRelated: true });
  });

  it('cancels', async () => {
    render(<RemoveWithRelatedConfirmationModal {...props} />);

    await userEvent.click(screen.getByText('Cancel'));

    expect(props.onCancel).toHaveBeenCalled();
    expect(props.onConfirm).not.toHaveBeenCalled();
  });
});
