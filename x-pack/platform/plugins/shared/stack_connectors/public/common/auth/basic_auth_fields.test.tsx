/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { BasicAuthFields } from './basic_auth_fields';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthFormTestProvider } from '../../connector_types/lib/test_utils';

describe('BasicAuthFields', () => {
  const onSubmit = jest.fn();

  it('renders all fields', async () => {
    const testFormData = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
    };

    render(
      <AuthFormTestProvider defaultValue={testFormData} onSubmit={onSubmit}>
        <BasicAuthFields readOnly={false} />
      </AuthFormTestProvider>
    );

    expect(await screen.findByTestId('basicAuthFields')).toBeInTheDocument();
    expect(await screen.findByTestId('webhookUserInput')).toBeInTheDocument();
    expect(await screen.findByTestId('webhookPasswordInput')).toBeInTheDocument();
  });

  describe('Validation', () => {
    const defaultTestFormData = {
      secrets: {
        user: 'user',
        password: 'pass',
      },
    };

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('validation succeeds with correct fields', async () => {
      render(
        <AuthFormTestProvider defaultValue={defaultTestFormData} onSubmit={onSubmit}>
          <BasicAuthFields readOnly={false} />
        </AuthFormTestProvider>
      );

      await userEvent.click(await screen.findByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({
          data: {
            secrets: {
              user: 'user',
              password: 'pass',
            },
          },
          isValid: true,
        });
      });
    });

    it('validates correctly missing user', async () => {
      const testConfig = {
        secrets: {
          user: '',
          password: 'password',
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testConfig} onSubmit={onSubmit}>
          <BasicAuthFields readOnly={false} />
        </AuthFormTestProvider>
      );

      await userEvent.click(await screen.findByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
      });
    });

    it('validates correctly missing password', async () => {
      const testConfig = {
        secrets: {
          user: 'user',
          password: '',
        },
      };

      render(
        <AuthFormTestProvider defaultValue={testConfig} onSubmit={onSubmit}>
          <BasicAuthFields readOnly={false} />
        </AuthFormTestProvider>
      );

      await userEvent.click(await screen.findByTestId('form-test-provide-submit'));

      await waitFor(() => {
        expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
      });
    });
  });
});
