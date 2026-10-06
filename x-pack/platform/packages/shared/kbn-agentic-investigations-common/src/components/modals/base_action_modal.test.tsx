/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { EuiProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { BaseActionModal } from './base_action_modal';

const wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <I18nProvider>
    <EuiProvider>{children}</EuiProvider>
  </I18nProvider>
);

const renderModal = (onClick: (rationale: string) => void | Promise<void>) => {
  render(
    <BaseActionModal
      type="dismiss"
      title="Close the investigation?"
      recordId="prop-1"
      rationalePlaceholder="Why?"
      onClose={jest.fn()}
      primaryAction={{ color: 'danger', label: 'Dismiss', onClick }}
    />,
    { wrapper }
  );
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Not worth chasing.' } });
};

describe('BaseActionModal', () => {
  it('disables the button and shows a spinner while the primary action is in flight', async () => {
    let resolveClick: () => void = () => {};
    const onClick = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveClick = resolve;
        })
    );
    renderModal(onClick);

    const button = screen.getByRole('button', { name: 'Dismiss' });
    fireEvent.click(button);

    expect(button).toBeDisabled();
    expect(button.querySelector('.euiLoadingSpinner')).toBeTruthy();
    // Cancel is disabled too, so the analyst cannot back out mid-submit.
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    await act(async () => {
      resolveClick();
    });
  });

  it('re-enables the button so the analyst can retry when the primary action rejects', async () => {
    const onClick = jest.fn().mockRejectedValue(new Error('boom'));
    renderModal(onClick);

    const button = screen.getByRole('button', { name: 'Dismiss' });
    await act(async () => {
      fireEvent.click(button);
    });

    expect(button).not.toBeDisabled();
    expect(button.querySelector('.euiLoadingSpinner')).toBeFalsy();
  });
});
