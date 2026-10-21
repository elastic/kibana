/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { AutomationDeleteConfirmModal } from './automation_delete_confirm_modal';

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <I18nProvider>
      <EuiProvider>{ui}</EuiProvider>
    </I18nProvider>
  );

describe('AutomationDeleteConfirmModal', () => {
  it('renders the title including the given name', () => {
    renderWithProviders(
      <AutomationDeleteConfirmModal
        name="My Workflow"
        onCancel={jest.fn()}
        onConfirm={jest.fn().mockResolvedValue(undefined)}
      />
    );

    expect(screen.getByTestId('contextAutomationDeleteConfirmModal')).toBeInTheDocument();
    expect(screen.getByText('Remove "My Workflow"?')).toBeInTheDocument();
  });

  it('calls onCancel when the cancel button is clicked', () => {
    const onCancel = jest.fn();
    renderWithProviders(
      <AutomationDeleteConfirmModal
        name="My Workflow"
        onCancel={onCancel}
        onConfirm={jest.fn().mockResolvedValue(undefined)}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when the confirm button is clicked', async () => {
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    renderWithProviders(
      <AutomationDeleteConfirmModal name="My Workflow" onCancel={jest.fn()} onConfirm={onConfirm} />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Remove' }));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledTimes(1);
    });
  });

  it('disables the confirm button while onConfirm is pending', async () => {
    let resolveConfirm: () => void = () => undefined;
    const onConfirm = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveConfirm = resolve;
        })
    );

    renderWithProviders(
      <AutomationDeleteConfirmModal name="My Workflow" onCancel={jest.fn()} onConfirm={onConfirm} />
    );

    const confirmButton = screen.getByRole('button', { name: 'Remove' });
    fireEvent.click(confirmButton);

    await waitFor(() => {
      expect(confirmButton).toBeDisabled();
    });

    resolveConfirm();
    await waitFor(() => {
      expect(confirmButton).not.toBeDisabled();
    });
  });
});
