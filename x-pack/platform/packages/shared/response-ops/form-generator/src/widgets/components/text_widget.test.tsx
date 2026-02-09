/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { z } from '@kbn/zod/v4';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { TextWidget } from './text_widget';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

const TestFormWrapper = ({ children }: { children: React.ReactNode }) => {
  const { form } = useForm();
  return <Form form={form}>{children}</Form>;
};

describe('TextWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with label and placeholder', () => {
    render(
      <TestFormWrapper>
        <TextWidget
          formConfig={{}}
          path="username"
          schema={z.string()}
          fieldProps={{
            label: 'Username',
            euiFieldProps: {
              placeholder: 'Enter username',
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

    expect(screen.getByText('Username')).toBeDefined();
    expect(screen.getByPlaceholderText('Enter username')).toBeDefined();
  });

  it('displays the current value', () => {
    const TestForm = () => {
      const { form } = useForm({ defaultValue: { username: 'testuser' } });
      return (
        <Form form={form}>
          <TextWidget
            formConfig={{}}
            path="username"
            schema={z.string()}
            fieldProps={{ label: 'Username', euiFieldProps: {} }}
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

    const input = screen.getByDisplayValue('testuser') as HTMLInputElement;
    expect(input.value).toBe('testuser');
  });

  it('updates value when input changes', () => {
    const TestForm = () => {
      const { form } = useForm();
      return (
        <Form form={form}>
          <TextWidget
            formConfig={{}}
            path="username"
            schema={z.string()}
            fieldProps={{ label: 'Username', euiFieldProps: {} }}
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

    const input = screen.getByLabelText('Username', { selector: 'input' });
    fireEvent.change(input, { target: { value: 'newvalue' } });

    expect((input as HTMLInputElement).value).toBe('newvalue');
  });

  it('validates field on blur', async () => {
    const user = userEvent.setup();
    const TestForm = () => {
      const { form } = useForm();
      return (
        <Form form={form}>
          <TextWidget
            formConfig={{}}
            path="username"
            schema={z.string().min(3, 'Username must be at least 3 characters')}
            fieldProps={{ label: 'Username', euiFieldProps: {} }}
            fieldConfig={{
              validations: [
                {
                  validator: ({ value }) => {
                    const strValue = value as string;
                    if (!strValue || strValue.length < 3) {
                      return { message: 'Username must be at least 3 characters' };
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

    const input = screen.getByLabelText('Username', { selector: 'input' });
    await user.click(input);
    fireEvent.change(input, { target: { value: 'ab' } });
    await user.tab();

    await screen.findByText('Username must be at least 3 characters');
  });

  it('displays error message when invalid', async () => {
    const user = userEvent.setup();
    const TestForm = () => {
      const { form } = useForm();
      return (
        <Form form={form}>
          <TextWidget
            formConfig={{}}
            path="username"
            schema={z.string().min(1, 'Username is required')}
            fieldProps={{ label: 'Username', euiFieldProps: {} }}
            fieldConfig={{
              validations: [
                {
                  validator: ({ value }) => {
                    if (!value) {
                      return { message: 'Username is required' };
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

    const input = screen.getByLabelText('Username', { selector: 'input' });
    await user.click(input);
    await user.type(input, 'x');
    await user.clear(input);
    await user.tab();

    expect(await screen.findByText('Username is required')).toBeDefined();
  });
});
