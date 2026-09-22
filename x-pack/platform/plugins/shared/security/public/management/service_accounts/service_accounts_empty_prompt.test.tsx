/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiProvider } from '@elastic/eui';
import { screen } from '@testing-library/react';
import user from '@testing-library/user-event';
import React from 'react';

import { renderWithI18n } from '@kbn/test-jest-helpers';

import { ServiceAccountsEmptyPrompt } from './service_accounts_empty_prompt';

describe('ServiceAccountsEmptyPrompt', () => {
  it('renders the empty state and starts account creation', async () => {
    const onCreateAccount = jest.fn();

    renderWithI18n(
      <EuiProvider>
        <ServiceAccountsEmptyPrompt canCreate onCreateAccount={onCreateAccount} />
      </EuiProvider>
    );

    expect(screen.getByRole('heading', { name: 'No service accounts available' })).toBeVisible();
    expect(screen.getByText('Create a dedicated identity to execute workloads.')).toBeVisible();
    expect(screen.getByTestId('serviceAccountsEmptyPromptIllustration')).toBeVisible();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('serviceAccountsEmptyPromptCreateButton'));

    expect(onCreateAccount).toHaveBeenCalledTimes(1);
  });

  it('does not offer account creation without the save capability', () => {
    renderWithI18n(
      <EuiProvider>
        <ServiceAccountsEmptyPrompt canCreate={false} onCreateAccount={jest.fn()} />
      </EuiProvider>
    );

    expect(screen.getByRole('heading', { name: 'No service accounts available' })).toBeVisible();
    expect(screen.queryByTestId('serviceAccountsEmptyPromptCreateButton')).not.toBeInTheDocument();
  });
});
