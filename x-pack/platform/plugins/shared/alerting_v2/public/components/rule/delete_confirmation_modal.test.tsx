/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { DeleteConfirmationModal } from './delete_confirmation_modal';

const renderModal = (props: Partial<React.ComponentProps<typeof DeleteConfirmationModal>> = {}) => {
  const defaultProps = {
    ruleName: 'Test Rule',
    onCancel: jest.fn(),
    onConfirm: jest.fn(),
    isLoading: false,
    ...props,
  };

  return render(
    <I18nProvider>
      <DeleteConfirmationModal {...defaultProps} />
    </I18nProvider>
  );
};

describe('DeleteConfirmationModal', () => {
  it('renders the rule name in the confirmation message', () => {
    renderModal({ ruleName: 'My Important Rule' });

    expect(screen.getByText(/My Important Rule/)).toBeInTheDocument();
  });

  it('calls onCancel when the cancel button is clicked', () => {
    const onCancel = jest.fn();
    renderModal({ onCancel });

    fireEvent.click(screen.getByText('Cancel'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when the confirm button is clicked', () => {
    const onConfirm = jest.fn();
    renderModal({ onConfirm });

    fireEvent.click(screen.getByText('Delete'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows loading state on confirm button', () => {
    renderModal({ isLoading: true });

    const confirmButton = screen.getByTestId('confirmModalConfirmButton');
    expect(confirmButton).toBeDisabled();
  });
});
