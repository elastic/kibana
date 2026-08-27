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

  it('rejects names that are not valid Liquid identifiers', async () => {
    render(
      <AuthFormTestProvider
        defaultValue={{
          __internal__: { secretParams: [{ key: 'invalid-name', value: 'secret' }] },
        }}
        onSubmit={onSubmit}
      >
        <SecretParamFields readOnly={false} />
      </AuthFormTestProvider>
    );

    await userEvent.click(await screen.findByTestId('form-test-provide-submit'));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false }));
  });
});
