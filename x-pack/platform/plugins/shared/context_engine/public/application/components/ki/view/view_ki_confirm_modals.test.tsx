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
import { ViewKiConfirmModals } from './view_ki_confirm_modals';

const renderModals = (
  overrides: Partial<React.ComponentProps<typeof ViewKiConfirmModals>> = {}
) => {
  const onConfirmDelete = jest.fn().mockResolvedValue(undefined);
  const onConfirmRestore = jest.fn().mockResolvedValue(undefined);

  render(
    <I18nProvider>
      <EuiProvider>
        <ViewKiConfirmModals
          isDeleteConfirmOpen={false}
          onCloseDeleteConfirm={jest.fn()}
          onConfirmDelete={onConfirmDelete}
          isRestoreConfirmOpen={false}
          onCloseRestoreConfirm={jest.fn()}
          onConfirmRestore={onConfirmRestore}
          {...overrides}
        />
      </EuiProvider>
    </I18nProvider>
  );

  return { onConfirmDelete, onConfirmRestore };
};

describe('ViewKiConfirmModals', () => {
  it('calls onConfirmDelete when delete modal is confirmed', async () => {
    const onConfirmDelete = jest.fn().mockResolvedValue(undefined);

    renderModals({
      isDeleteConfirmOpen: true,
      onConfirmDelete,
    });

    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    await waitFor(() => {
      expect(onConfirmDelete).toHaveBeenCalled();
    });
  });

  it('calls onConfirmRestore when restore modal is confirmed', async () => {
    const onConfirmRestore = jest.fn().mockResolvedValue(undefined);

    renderModals({
      isRestoreConfirmOpen: true,
      onConfirmRestore,
    });

    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    await waitFor(() => {
      expect(onConfirmRestore).toHaveBeenCalled();
    });
  });
});
