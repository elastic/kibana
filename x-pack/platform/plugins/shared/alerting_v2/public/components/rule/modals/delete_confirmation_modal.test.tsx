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

const renderModal = (
  overrides: {
    ruleName?: string;
    onCancel?: () => void;
    onConfirm?: () => void;
    isLoading?: boolean;
  } = {}
) => {
  return render(
    <I18nProvider>
      <DeleteConfirmationModal
        ruleName={overrides.ruleName ?? 'Test Rule'}
        onCancel={overrides.onCancel ?? jest.fn()}
        onConfirm={overrides.onConfirm ?? jest.fn()}
        isLoading={overrides.isLoading ?? false}
      />
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

  describe('bulk delete mode', () => {
    const renderBulkModal = (
      overrides: {
        ruleCount?: number;
        onCancel?: () => void;
        onConfirm?: () => void;
        isLoading?: boolean;
      } = {}
    ) => {
      return render(
        <I18nProvider>
          <DeleteConfirmationModal
            ruleCount={overrides.ruleCount ?? 5}
            onCancel={overrides.onCancel ?? jest.fn()}
            onConfirm={overrides.onConfirm ?? jest.fn()}
            isLoading={overrides.isLoading ?? false}
          />
        </I18nProvider>
      );
    };

    it('renders the count in the title for bulk delete', () => {
      renderBulkModal({ ruleCount: 5 });

      expect(screen.getByText('Delete 5 rules')).toBeInTheDocument();
    });

    it('renders singular title when count is 1', () => {
      renderBulkModal({ ruleCount: 1 });

      expect(screen.getByText('Delete 1 rule')).toBeInTheDocument();
    });

    it('renders the count in the body message', () => {
      renderBulkModal({ ruleCount: 3 });

      expect(screen.getByText(/Are you sure you want to delete 3 rules/)).toBeInTheDocument();
    });

    it('calls onConfirm when Delete button is clicked', () => {
      const onConfirm = jest.fn();
      renderBulkModal({ onConfirm });

      fireEvent.click(screen.getByText('Delete'));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('calls onCancel when Cancel button is clicked', () => {
      const onCancel = jest.fn();
      renderBulkModal({ onCancel });

      fireEvent.click(screen.getByText('Cancel'));

      expect(onCancel).toHaveBeenCalledTimes(1);
    });
  });
});
