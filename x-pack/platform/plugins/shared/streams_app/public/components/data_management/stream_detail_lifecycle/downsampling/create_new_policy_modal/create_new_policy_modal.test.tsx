/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { CreatePolicyModal } from './create_new_policy_modal';
import { renderWithI18n } from '@kbn/test-jest-helpers';

describe('CreatePolicyModal', () => {
  const policyNames = ['logs-default', 'metrics-prod', 'my-policy'];

  it('renders title and policy name input', () => {
    renderWithI18n(
      <CreatePolicyModal policyNames={policyNames} onBack={() => {}} onSave={() => {}} />
    );

    expect(screen.getByTestId('createPolicyModalTitle')).toHaveTextContent(
      'Save as new ILM policy'
    );
    expect(screen.getByTestId('createPolicyModal-policyNameInput')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    const onBack = jest.fn();
    renderWithI18n(
      <CreatePolicyModal policyNames={policyNames} onBack={onBack} onSave={() => {}} />
    );

    fireEvent.click(screen.getByTestId('createPolicyModal-backButton'));
    expect(onBack).toHaveBeenCalled();
  });

  it('submits a valid policy name', async () => {
    const onSave = jest.fn();
    renderWithI18n(
      <CreatePolicyModal policyNames={policyNames} onBack={() => {}} onSave={onSave} />
    );

    fireEvent.change(screen.getByTestId('createPolicyModal-policyNameInput'), {
      target: { value: 'new-policy' },
    });

    const saveButton = screen.getByTestId('createPolicyModal-saveButton');
    await waitFor(() => expect(saveButton).not.toBeDisabled());
    fireEvent.click(saveButton);

    await waitFor(() => expect(onSave).toHaveBeenCalledWith('new-policy'));
  });

  it('shows an error for duplicate policy names', async () => {
    renderWithI18n(
      <CreatePolicyModal policyNames={policyNames} onBack={() => {}} onSave={() => {}} />
    );

    fireEvent.change(screen.getByTestId('createPolicyModal-policyNameInput'), {
      target: { value: 'logs-default' },
    });

    expect(await screen.findByText('That policy name is already used.')).toBeInTheDocument();
    expect(screen.getByTestId('createPolicyModal-saveButton')).toBeDisabled();
  });
});
