/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from '@kbn/zod/v4';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { PasswordWidget } from './password_widget';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

const TestFormWrapper = ({ children }: { children: React.ReactNode }) => {
  const { form } = useForm();
  return <Form form={form}>{children}</Form>;
};

describe('PasswordWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with label and placeholder', () => {
    render(
      <TestFormWrapper>
        <PasswordWidget
          formConfig={{}}
          path="password"
          schema={z.string()}
          fieldProps={{
            label: 'Password',
            euiFieldProps: {
              placeholder: 'Enter password',
            },
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

    expect(screen.getByText('Password')).toBeDefined();
    expect(screen.getByPlaceholderText('Enter password')).toBeDefined();
  });

  it('displays the current value', () => {
    const TestForm = () => {
      const { form } = useForm({ defaultValue: { password: 'secret123' } });
      return (
        <Form form={form}>
          <PasswordWidget
            formConfig={{}}
            path="password"
            schema={z.string()}
            fieldProps={{
              label: 'Password',
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
        </Form>
      );
    };

    render(<TestForm />, { wrapper });

    const input = screen.getByDisplayValue('secret123') as HTMLInputElement;
    expect(input.value).toBe('secret123');
  });

  it('updates value when input changes', async () => {
    const user = userEvent.setup();
    const TestForm = () => {
      const { form } = useForm();
      return (
        <Form form={form}>
          <PasswordWidget
            formConfig={{}}
            path="password"
            schema={z.string()}
            fieldProps={{
              label: 'Password',
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
        </Form>
      );
    };

    render(<TestForm />, { wrapper });

    const input = screen.getByLabelText('Password', { selector: 'input' });
    await user.type(input, 'newpassword');

    expect((input as HTMLInputElement).value).toBe('newpassword');
  });

  it('validates field on blur', async () => {
    const user = userEvent.setup();
    const TestForm = () => {
      const { form } = useForm();
      return (
        <Form form={form}>
          <PasswordWidget
            formConfig={{}}
            path="password"
            schema={z.string().min(6, 'Password must be at least 6 characters')}
            fieldProps={{
              label: 'Password',
              euiFieldProps: {},
            }}
            fieldConfig={{
              validations: [
                {
                  validator: ({ value }) => {
                    const strValue = value as string;
                    if (!strValue || strValue.length < 6) {
                      return { message: 'Password must be at least 6 characters' };
                    }
                  },
                },
              ],
            }}
          />
        </Form>
      );
    };

    render(<TestForm />, { wrapper });

    const input = screen.getByLabelText('Password', { selector: 'input' });
    await user.click(input);
    await user.type(input, 'short');
    await user.tab();

    await screen.findByText('Password must be at least 6 characters');
  });

  it('displays error message when invalid', async () => {
    const user = userEvent.setup();
    const TestForm = () => {
      const { form } = useForm();
      return (
        <Form form={form}>
          <PasswordWidget
            formConfig={{}}
            path="password"
            schema={z.string().min(1, 'Password is required')}
            fieldProps={{
              label: 'Password',
              euiFieldProps: {},
            }}
            fieldConfig={{
              validations: [
                {
                  validator: ({ value }) => {
                    if (!value) {
                      return { message: 'Password is required' };
                    }
                  },
                },
              ],
            }}
          />
        </Form>
      );
    };

    render(<TestForm />, { wrapper });

    const input = screen.getByLabelText('Password', { selector: 'input' });
    await user.click(input);
    await user.type(input, 'x');
    await user.clear(input);
    await user.tab();

    expect(await screen.findByText('Password is required')).toBeInTheDocument();
  });

  it('renders as password field type', () => {
    render(
      <TestFormWrapper>
        <PasswordWidget
          formConfig={{}}
          path="password"
          schema={z.string()}
          fieldProps={{
            label: 'Password',
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

    const input = screen.getByLabelText('Password', { selector: 'input' }) as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.type).toBe('password');
  });
});
