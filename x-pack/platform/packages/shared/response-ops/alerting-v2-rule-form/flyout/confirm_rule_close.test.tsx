/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { ConfirmRuleClose } from './confirm_rule_close';

const renderModal = (onCancel = jest.fn(), onConfirm = jest.fn()) =>
  render(
    <IntlProvider locale="en">
      <ConfirmRuleClose onCancel={onCancel} onConfirm={onConfirm} />
    </IntlProvider>
  );

describe('ConfirmRuleClose', () => {
  it('renders the modal with title and description', () => {
    renderModal();
    expect(screen.getByTestId('alertingV2ConfirmRuleCloseModal')).toBeInTheDocument();
    expect(screen.getByText('Discard unsaved changes to rule?')).toBeInTheDocument();
    expect(screen.getByText("You can't recover unsaved changes.")).toBeInTheDocument();
  });

  it('calls onConfirm when Discard changes is clicked', () => {
    const onConfirm = jest.fn();
    renderModal(jest.fn(), onConfirm);
    fireEvent.click(screen.getByTestId('confirmModalConfirmButton'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when Continue editing is clicked', () => {
    const onCancel = jest.fn();
    renderModal(onCancel);
    fireEvent.click(screen.getByTestId('confirmModalCancelButton'));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
