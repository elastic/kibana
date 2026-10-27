/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { KiDiscardEditsConfirmModal } from './ki_discard_edits_confirm_modal';

const renderModal = (
  overrides: Partial<React.ComponentProps<typeof KiDiscardEditsConfirmModal>> = {}
) => {
  const onClose = jest.fn();
  const onConfirm = jest.fn();

  render(
    <I18nProvider>
      <EuiProvider>
        <KiDiscardEditsConfirmModal onClose={onClose} onConfirm={onConfirm} {...overrides} />
      </EuiProvider>
    </I18nProvider>
  );

  return { onClose, onConfirm };
};

describe('KiDiscardEditsConfirmModal', () => {
  it('calls onConfirm when confirmed', () => {
    const { onConfirm } = renderModal();

    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    expect(onConfirm).toHaveBeenCalled();
  });

  it('calls onClose when cancelled', () => {
    const { onClose } = renderModal();

    fireEvent.click(screen.getByTestId('confirmModalCancelButton'));

    expect(onClose).toHaveBeenCalled();
  });
});
