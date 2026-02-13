/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from '@kbn/zod/v4';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { ObjectWidget } from './object_widget';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

const TestFormWrapper = ({
  children,
  defaultValue,
}: {
  children: React.ReactNode;
  defaultValue?: any;
}) => {
  const { form } = useForm({ defaultValue });
  return <Form form={form}>{children}</Form>;
};

describe('ObjectWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders nested fields from object schema', () => {
    const schema = z.object({
      host: z.string().meta({ label: 'Host' }),
      port: z.string().meta({ label: 'Port' }),
    });

    render(
      <TestFormWrapper>
        <ObjectWidget
          formConfig={{}}
          path="server"
          schema={schema}
          fieldProps={{
            euiFieldProps: {},
          }}
          fieldConfig={{
            validations: [
              {
                validator: () => undefined,
              },
            ],
          }}
        />
      </TestFormWrapper>,
      { wrapper }
    );

    expect(screen.getByTestId('generator-field-server-host')).toBeDefined();
    expect(screen.getByTestId('generator-field-server-port')).toBeDefined();
  });

  it('generates correct dot-notated paths for nested fields', () => {
    const schema = z.object({
      host: z.string().meta({ label: 'Host' }),
      port: z.string().meta({ label: 'Port' }),
    });

    render(
      <TestFormWrapper>
        <ObjectWidget
          formConfig={{}}
          path="server"
          schema={schema}
          fieldProps={{
            euiFieldProps: {},
          }}
          fieldConfig={{
            validations: [
              {
                validator: () => undefined,
              },
            ],
          }}
        />
      </TestFormWrapper>,
      { wrapper }
    );

    const hostInput = screen.getByTestId('generator-field-server-host');
    const portInput = screen.getByTestId('generator-field-server-port');

    expect(hostInput.getAttribute('data-test-subj')).toBe('generator-field-server-host');
    expect(portInput.getAttribute('data-test-subj')).toBe('generator-field-server-port');
  });

  it('allows user input in nested fields', async () => {
    const user = userEvent.setup();
    const schema = z.object({
      username: z.string().meta({ label: 'Username' }),
      email: z.string().meta({ label: 'Email' }),
    });

    render(
      <TestFormWrapper>
        <ObjectWidget
          formConfig={{}}
          path="credentials"
          schema={schema}
          fieldProps={{
            euiFieldProps: {},
          }}
          fieldConfig={{
            validations: [
              {
                validator: () => undefined,
              },
            ],
          }}
        />
      </TestFormWrapper>,
      { wrapper }
    );

    const usernameInput = screen.getByTestId(
      'generator-field-credentials-username'
    ) as HTMLInputElement;
    const emailInput = screen.getByTestId('generator-field-credentials-email') as HTMLInputElement;

    await user.type(usernameInput, 'testuser');
    await user.type(emailInput, 'test@example.com');

    expect(usernameInput.value).toBe('testuser');
    expect(emailInput.value).toBe('test@example.com');
  });

  it('validates nested fields on blur', async () => {
    const user = userEvent.setup();
    const schema = z.object({
      username: z.string().min(5).meta({ label: 'Username' }),
    });

    render(
      <TestFormWrapper>
        <ObjectWidget
          formConfig={{}}
          path="credentials"
          schema={schema}
          fieldProps={{
            euiFieldProps: {},
          }}
          fieldConfig={{
            validations: [
              {
                validator: () => undefined,
              },
            ],
          }}
        />
      </TestFormWrapper>,
      { wrapper }
    );

    const usernameInput = screen.getByTestId('generator-field-credentials-username');
    await user.click(usernameInput);
    await user.type(usernameInput, 'ab');
    await user.tab();

    await waitFor(() => {
      expect(screen.queryByText(/at least/i)).toBeDefined();
    });
  });

  it('propagates disabled state to nested fields', () => {
    const schema = z.object({
      host: z.string().meta({ label: 'Host' }),
      port: z.string().meta({ label: 'Port' }),
    });

    render(
      <TestFormWrapper>
        <ObjectWidget
          formConfig={{ disabled: true }}
          path="server"
          schema={schema}
          fieldProps={{
            euiFieldProps: {},
          }}
          fieldConfig={{
            validations: [
              {
                validator: () => undefined,
              },
            ],
          }}
        />
      </TestFormWrapper>,
      { wrapper }
    );

    const hostInput = screen.getByTestId('generator-field-server-host') as HTMLInputElement;
    const portInput = screen.getByTestId('generator-field-server-port') as HTMLInputElement;

    expect(hostInput.disabled).toBe(true);
    expect(portInput.disabled).toBe(true);
  });

  it('uses default values for nested fields', () => {
    const schema = z.object({
      host: z.string().meta({ label: 'Host' }),
      port: z.string().meta({ label: 'Port' }),
    });

    render(
      <TestFormWrapper
        defaultValue={{
          server: {
            host: 'localhost',
            port: '8080',
          },
        }}
      >
        <ObjectWidget
          formConfig={{}}
          path="server"
          schema={schema}
          fieldProps={{
            euiFieldProps: {},
          }}
          fieldConfig={{
            validations: [
              {
                validator: () => undefined,
              },
            ],
          }}
        />
      </TestFormWrapper>,
      { wrapper }
    );

    const hostInput = screen.getByTestId('generator-field-server-host') as HTMLInputElement;
    const portInput = screen.getByTestId('generator-field-server-port') as HTMLInputElement;

    expect(hostInput.value).toBe('localhost');
    expect(portInput.value).toBe('8080');
  });

  it('supports different widget types in nested fields', () => {
    const schema = z.object({
      username: z.string().meta({ label: 'Username' }),
      password: z.string().meta({ label: 'Password', sensitive: true }),
      role: z.enum(['admin', 'user']).meta({ label: 'Role' }),
    });

    render(
      <TestFormWrapper>
        <ObjectWidget
          formConfig={{}}
          path="credentials"
          schema={schema}
          fieldProps={{
            euiFieldProps: {},
          }}
          fieldConfig={{
            validations: [
              {
                validator: () => undefined,
              },
            ],
          }}
        />
      </TestFormWrapper>,
      { wrapper }
    );

    const usernameInput = screen.getByTestId('generator-field-credentials-username');
    const passwordInput = screen.getByTestId('generator-field-credentials-password');
    const roleSelect = screen.getByLabelText('Role');

    expect(usernameInput).toBeDefined();
    expect(passwordInput).toBeDefined();
    expect(roleSelect).toBeDefined();
    expect(passwordInput.getAttribute('type')).toBe('password');
  });

  it('respects schema metadata for disabled fields', () => {
    const schema = z.object({
      id: z.string().meta({ label: 'ID', disabled: true }),
      name: z.string().meta({ label: 'Name' }),
    });

    render(
      <TestFormWrapper>
        <ObjectWidget
          formConfig={{ disabled: false }}
          path="item"
          schema={schema}
          fieldProps={{
            euiFieldProps: {},
          }}
          fieldConfig={{
            validations: [
              {
                validator: () => undefined,
              },
            ],
          }}
        />
      </TestFormWrapper>,
      { wrapper }
    );

    const idInput = screen.getByTestId('generator-field-item-id') as HTMLInputElement;
    const nameInput = screen.getByTestId('generator-field-item-name') as HTMLInputElement;

    expect(idInput.disabled).toBe(true);
    expect(nameInput.disabled).toBe(false);
  });
});
