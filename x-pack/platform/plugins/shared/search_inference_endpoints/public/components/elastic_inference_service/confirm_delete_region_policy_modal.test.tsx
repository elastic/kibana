/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { ConfirmDeleteRegionPolicyModal } from './confirm_delete_region_policy_modal';

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <EuiThemeProvider>
    <I18nProvider>{children}</I18nProvider>
  </EuiThemeProvider>
);

describe('ConfirmDeleteRegionPolicyModal', () => {
  const onConfirm = jest.fn();
  const onCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderModal = (overrides: { isDeleting?: boolean } = {}) =>
    render(
      <Wrapper>
        <ConfirmDeleteRegionPolicyModal
          onConfirm={onConfirm}
          onCancel={onCancel}
          isDeleting={overrides.isDeleting ?? false}
        />
      </Wrapper>
    );

  it('renders the title, description, checkbox, and buttons', () => {
    renderModal();

    expect(screen.getByTestId('confirmDeleteRegionPolicyTitle')).toHaveTextContent(
      'Reset region preferences to default?'
    );
    expect(screen.getByTestId('confirmDeleteRegionPolicyDescription')).toHaveTextContent(
      /Removing your custom region preferences allows inference in all locations/
    );
    expect(screen.getByTestId('confirmDeleteRegionPolicyReconfigureNote')).toHaveTextContent(
      /You'll need to set new region preferences to restrict inference again/
    );
    expect(screen.getByTestId('confirmDeleteRegionPolicyAcknowledge')).toBeInTheDocument();
    expect(screen.getByTestId('confirmModalConfirmButton')).toBeInTheDocument();
    expect(screen.getByTestId('confirmModalCancelButton')).toBeInTheDocument();
  });

  it('disables the confirm button until the acknowledge checkbox is checked', () => {
    renderModal();

    const confirmButton = screen.getByTestId('confirmModalConfirmButton');
    expect(confirmButton).toBeDisabled();

    fireEvent.click(screen.getByTestId('confirmDeleteRegionPolicyAcknowledge'));

    expect(confirmButton).toBeEnabled();
  });

  it('does not call onConfirm when confirm is clicked while disabled', () => {
    renderModal();

    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('calls onConfirm when confirm is clicked after acknowledging', () => {
    renderModal();

    fireEvent.click(screen.getByTestId('confirmDeleteRegionPolicyAcknowledge'));
    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel is clicked', () => {
    renderModal();

    fireEvent.click(screen.getByTestId('confirmModalCancelButton'));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('keeps the confirm button disabled while deletion is in flight', () => {
    renderModal({ isDeleting: true });

    const confirmButton = screen.getByTestId('confirmModalConfirmButton');
    fireEvent.click(screen.getByTestId('confirmDeleteRegionPolicyAcknowledge'));

    expect(confirmButton).toBeDisabled();
  });
});
