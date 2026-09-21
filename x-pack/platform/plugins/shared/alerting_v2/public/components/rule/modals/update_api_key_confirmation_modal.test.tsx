/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { UpdateApiKeyConfirmationModal } from './update_api_key_confirmation_modal';

const renderSingleModal = (
  overrides: {
    ruleName?: string;
    onCancel?: () => void;
    onConfirm?: () => void;
    isLoading?: boolean;
  } = {}
) => {
  return render(
    <I18nProvider>
      <UpdateApiKeyConfirmationModal
        ruleName={overrides.ruleName ?? 'Test Rule'}
        onCancel={overrides.onCancel ?? jest.fn()}
        onConfirm={overrides.onConfirm ?? jest.fn()}
        isLoading={overrides.isLoading ?? false}
      />
    </I18nProvider>
  );
};

describe('UpdateApiKeyConfirmationModal', () => {
  it('renders the rule name in the confirmation message', () => {
    renderSingleModal({ ruleName: 'My Important Rule' });

    expect(screen.getByText(/My Important Rule/)).toBeInTheDocument();
  });

  it('warns that a running rule will be skipped', () => {
    renderSingleModal();

    expect(screen.getByText(/currently running, it will be skipped/)).toBeInTheDocument();
  });

  it('calls onCancel when the cancel button is clicked', () => {
    const onCancel = jest.fn();
    renderSingleModal({ onCancel });

    fireEvent.click(screen.getByText('Cancel'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when the confirm button is clicked', () => {
    const onConfirm = jest.fn();
    renderSingleModal({ onConfirm });

    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('shows loading state on the confirm button', () => {
    renderSingleModal({ isLoading: true });

    const confirmButton = screen.getByTestId('confirmModalConfirmButton');
    expect(confirmButton).toBeDisabled();
  });

  describe('bulk mode', () => {
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
          <UpdateApiKeyConfirmationModal
            ruleCount={overrides.ruleCount ?? 5}
            onCancel={overrides.onCancel ?? jest.fn()}
            onConfirm={overrides.onConfirm ?? jest.fn()}
            isLoading={overrides.isLoading ?? false}
          />
        </I18nProvider>
      );
    };

    it('renders the count in the title for bulk mode', () => {
      renderBulkModal({ ruleCount: 5 });

      expect(screen.getByText('Update API keys for 5 rules')).toBeInTheDocument();
    });

    it('renders the singular title and body when count is 1', () => {
      renderBulkModal({ ruleCount: 1 });

      expect(screen.getByText('Update API key for 1 rule')).toBeInTheDocument();
      expect(screen.getByText(/The API key for the selected 1 rule/)).toBeInTheDocument();
    });

    it('renders the count in the body message', () => {
      renderBulkModal({ ruleCount: 3 });

      expect(screen.getByText(/The API keys for the selected 3 rules/)).toBeInTheDocument();
    });

    it('warns that currently-running rules will be skipped', () => {
      renderBulkModal({ ruleCount: 3 });

      expect(screen.getByText(/currently running will be skipped/)).toBeInTheDocument();
    });

    it('calls onConfirm when the confirm button is clicked', () => {
      const onConfirm = jest.fn();
      renderBulkModal({ onConfirm });

      fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });
});
