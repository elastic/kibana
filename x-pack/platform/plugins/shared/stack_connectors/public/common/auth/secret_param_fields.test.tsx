/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthFormTestProvider } from '../../connector_types/lib/test_utils';
import { SecretParamFields } from './secret_param_fields';

describe('SecretParamFields', () => {
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds and removes the correct secret parameter row', async () => {
    render(
      <AuthFormTestProvider
        defaultValue={{
          __internal__: {
            secretParams: [
              { key: 'client_id', value: 'id' },
              { key: 'client_secret', value: 'secret' },
            ],
          },
        }}
        onSubmit={onSubmit}
      >
        <SecretParamFields readOnly={false} />
      </AuthFormTestProvider>
    );

    const deleteButtons = await screen.findAllByTestId('httpRemoveSecretParamButton');
    await userEvent.click(deleteButtons[0]);
    await waitFor(() => expect(screen.getAllByTestId('httpSecretParamKeyInput')).toHaveLength(1));
    expect(screen.getByTestId('httpSecretParamKeyInput')).toHaveValue('client_secret');

    await userEvent.click(screen.getByTestId('httpAddSecretParamButton'));
    await waitFor(() => expect(screen.getAllByTestId('httpSecretParamKeyInput')).toHaveLength(2));
  });

  it.each([
    [
      'duplicate names',
      [
        { key: 'same_key', value: 'one' },
        { key: 'same_key', value: 'two' },
      ],
    ],
    ['invalid names', [{ key: 'invalid-name', value: 'secret' }]],
    ['empty values', [{ key: 'client_secret', value: '' }]],
  ])('rejects %s', async (_description, secretParams) => {
    render(
      <AuthFormTestProvider defaultValue={{ __internal__: { secretParams } }} onSubmit={onSubmit}>
        <SecretParamFields readOnly={false} />
      </AuthFormTestProvider>
    );

    await userEvent.click(await screen.findByTestId('form-test-provide-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false }));
  });

  it('disables editing controls when read only', async () => {
    render(
      <AuthFormTestProvider
        defaultValue={{
          __internal__: { secretParams: [{ key: 'client_secret', value: 'secret' }] },
        }}
        onSubmit={onSubmit}
      >
        <SecretParamFields readOnly={true} />
      </AuthFormTestProvider>
    );

    expect(await screen.findByTestId('httpAddSecretParamButton')).toBeDisabled();
    expect(screen.getByTestId('httpRemoveSecretParamButton')).toBeDisabled();
    expect(screen.getByTestId('httpSecretParamKeyInput')).toHaveAttribute('readonly');
    expect(screen.getByTestId('httpSecretParamValueInput')).toHaveAttribute('readonly');
  });
});
