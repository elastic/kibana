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
import { KiRestoreConfirmModal } from './ki_restore_confirm_modal';

const renderModal = (
  overrides: Partial<React.ComponentProps<typeof KiRestoreConfirmModal>> = {}
) => {
  const onClose = jest.fn();
  const onConfirm = jest.fn().mockResolvedValue(undefined);

  render(
    <I18nProvider>
      <EuiProvider>
        <KiRestoreConfirmModal onClose={onClose} onConfirm={onConfirm} {...overrides} />
      </EuiProvider>
    </I18nProvider>
  );

  return { onClose, onConfirm };
};

describe('KiRestoreConfirmModal', () => {
  it('calls onConfirm when confirmed', async () => {
    const { onConfirm } = renderModal();

    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalled();
    });
  });

  it('calls onClose when cancelled', () => {
    const { onClose } = renderModal();

    fireEvent.click(screen.getByTestId('confirmModalCancelButton'));

    expect(onClose).toHaveBeenCalled();
  });

  it('disables the confirm button while loading', () => {
    renderModal({ isLoading: true });

    expect(screen.getByTestId('confirmModalConfirmButton')).toBeDisabled();
  });
});
