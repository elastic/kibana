/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { z } from '@kbn/zod/v4';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { EuiButton } from '@elastic/eui';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { generateFormFields } from './form';
import userEvent from '@testing-library/user-event';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en">{children}</IntlProvider>
);

interface TestFormWrapperProps {
  schema: z.ZodObject<z.ZodRawShape>;
  onSubmit?: (data: { data: unknown }) => void;
  formConfig?: { disabled?: boolean };
}

const TestFormWrapper = ({ schema, onSubmit, formConfig }: TestFormWrapperProps) => {
  const { form } = useForm({
    onSubmit: async (data, isValid) => {
      if (isValid && onSubmit) {
        onSubmit({ data });
      }
    },
  });

  return (
    <Form form={form}>
      {generateFormFields({ schema, formConfig })}
      <EuiButton onClick={form.submit} isLoading={form.isSubmitting}>
        Submit
      </EuiButton>
    </Form>
  );
};

describe('Form', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a form with text fields', () => {
    const schema = z.object({
      username: z.string().meta({
        widget: 'text',
        label: 'Username',
        placeholder: 'Enter username',
      }),
      email: z.email().meta({
        widget: 'text',
        label: 'Email',
        placeholder: 'Enter email',
      }),
    });

    render(<TestFormWrapper schema={schema} onSubmit={mockOnSubmit} />, { wrapper });

    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
  });

  it('renders a form with password field', () => {
    const schema = z.object({
      password: z.string().meta({
        widget: 'password',
        label: 'Password',
        placeholder: 'Enter password',
      }),
    });

    render(<TestFormWrapper schema={schema} onSubmit={mockOnSubmit} />, { wrapper });

    expect(screen.getByText('Password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter password')).toBeInTheDocument();
  });

  it('renders a form with select field', () => {
    const schema = z.object({
      country: z.enum(['US', 'UK', 'CA']).meta({
        widget: 'select',
        label: 'Country',
      }),
    });

    render(<TestFormWrapper schema={schema} onSubmit={mockOnSubmit} />, { wrapper });

    expect(screen.getByText('Country')).toBeInTheDocument();
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
  });

  it('handles form submission with valid data', async () => {
    const schema = z.object({
      username: z.string().meta({
        widget: 'text',
        label: 'Username',
      }),
    });

    render(<TestFormWrapper schema={schema} onSubmit={mockOnSubmit} />, { wrapper });

    const input = screen.getByLabelText('Username', { selector: 'input' });
    fireEvent.change(input, { target: { value: 'testuser' } });

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        data: { username: 'testuser' },
      });
    });
  });

  it('displays validation errors on submit with invalid data', async () => {
    const schema = z.object({
      email: z.email().meta({
        widget: 'text',
        label: 'Email',
      }),
    });

    render(<TestFormWrapper schema={schema} onSubmit={mockOnSubmit} />, { wrapper });

    const input = screen.getByLabelText('Email', { selector: 'input' });
    fireEvent.change(input, { target: { value: 'invalid-email' } });

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    expect(await screen.findByText(/Invalid email/i)).toBeInTheDocument();

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('validates field on blur', async () => {
    const schema = z.object({
      email: z.email().meta({
        widget: 'text',
        label: 'Email',
      }),
    });

    render(<TestFormWrapper schema={schema} onSubmit={mockOnSubmit} />, { wrapper });

    const input = screen.getByLabelText('Email', { selector: 'input' });
    fireEvent.change(input, { target: { value: 'invalid' } });
    fireEvent.blur(input);

    expect(await screen.findByText(/Invalid email/i)).toBeInTheDocument();
  });

  it('clears validation errors when input becomes valid', async () => {
    const schema = z.object({
      email: z.email().meta({
        widget: 'text',
        label: 'Email',
      }),
    });

    render(<TestFormWrapper schema={schema} onSubmit={mockOnSubmit} />, { wrapper });

    const input = screen.getByLabelText('Email', { selector: 'input' });

    fireEvent.change(input, { target: { value: 'invalid' } });
    fireEvent.blur(input);

    expect(await screen.findByText(/Invalid email/i)).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'test@example.com' } });

    await waitFor(() => {
      expect(screen.queryByText(/Invalid email/i)).not.toBeInTheDocument();
    });
  });

  it('renders nested object fields automatically', () => {
    const schema = z.object({
      server: z.object({
        host: z.string().meta({
          widget: 'text',
          label: 'Host',
        }),
        port: z.string().meta({
          widget: 'text',
          label: 'Port',
        }),
      }),
    });

    render(<TestFormWrapper schema={schema} onSubmit={mockOnSubmit} />, { wrapper });

    expect(screen.getByLabelText('Host', { selector: 'input' })).toBeInTheDocument();
    expect(screen.getByLabelText('Port', { selector: 'input' })).toBeInTheDocument();
  });

  it('throws error when unsupported widget type is provided', () => {
    const schema = z.object({
      username: z.string().meta({
        widget: 'fakeWidget' as any, // Unsupported widget
        label: 'Username',
      }),
    });

    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => {
      render(<TestFormWrapper schema={schema} onSubmit={mockOnSubmit} />, { wrapper });
    }).toThrowErrorMatchingInlineSnapshot(
      `"Widget \\"fakeWidget\\" specified in ZodString metadata is not registered in the widget registry."`
    );

    consoleError.mockRestore();
  });

  it('handles multiple fields with different types', async () => {
    const schema = z.object({
      username: z.string().meta({
        widget: 'text',
        label: 'Username',
      }),
      password: z.string().meta({
        widget: 'password',
        label: 'Password',
      }),
      role: z.enum(['admin', 'user']).meta({
        widget: 'select',
        label: 'Role',
        default: 'user',
      }),
    });

    const { container } = render(<TestFormWrapper schema={schema} onSubmit={mockOnSubmit} />, {
      wrapper,
    });

    const usernameInput = container.querySelector('input[type="text"]') as HTMLInputElement;
    const passwordInput = container.querySelector('input[type="password"]') as HTMLInputElement;
    const roleSelect = screen.getByRole('combobox');

    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(roleSelect, { target: { value: 'admin' } });

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        data: {
          username: 'testuser',
          password: 'password123',
          role: 'admin',
        },
      });
    });
  });

  it('handles form submission when onSubmit is not provided', async () => {
    const schema = z.object({
      username: z.string().meta({
        widget: 'text',
        label: 'Username',
      }),
    });

    render(<TestFormWrapper schema={schema} />, { wrapper });

    const input = screen.getByLabelText('Username', { selector: 'input' });
    fireEvent.change(input, { target: { value: 'testuser' } });

    const submitButton = screen.getByRole('button', { name: 'Submit' });

    expect(() => {
      fireEvent.click(submitButton);
    }).not.toThrow();
  });

  it('adds optional label to optional fields', () => {
    const schema = z.object({
      name: z.string().optional().meta({
        label: 'Name',
      }),
    });

    render(<TestFormWrapper schema={schema} onSubmit={mockOnSubmit} />, { wrapper });

    expect(screen.getByText('Optional')).toBeInTheDocument();
  });
});

describe('Authentication Form Integration Tests', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const authSchema = z.object({
    authType: z
      .discriminatedUnion('type', [
        z.object({ type: z.literal('none') }).meta({
          label: 'None',
        }),
        z
          .object({
            type: z.literal('basic'),
            username: z.string().min(1, 'Username cannot be empty').meta({
              widget: 'text',
              label: 'Username',
            }),
            password: z.string().min(1, 'Password cannot be empty').meta({
              widget: 'password',
              label: 'Password',
            }),
          })
          .meta({
            label: 'Basic Auth',
          }),
        z
          .object({
            type: z.literal('bearer'),
            token: z.string().meta({
              widget: 'text',
              label: 'Bearer Token',
            }),
          })
          .meta({
            label: 'Bearer Token',
          }),
      ])
      .meta({
        widget: 'formFieldset',
        label: 'Authentication',
      })
      .default({ type: 'basic', username: '', password: '' }),
  });

  const usernameTestId = 'generator-field-authType-username';
  const passwordTestId = 'generator-field-authType-password';

  it('initializes with default discriminated union option when specified', async () => {
    render(<TestFormWrapper schema={authSchema} onSubmit={mockOnSubmit} />, { wrapper });

    const usernameInput = screen.getByTestId(usernameTestId) as HTMLInputElement;
    const passwordInput = screen.getByTestId(passwordTestId) as HTMLInputElement;
    const noneCard = screen.getByLabelText('None', { selector: 'input' }) as HTMLInputElement;
    const bearerCard = screen.getByLabelText('Bearer Token', {
      selector: 'input',
    }) as HTMLInputElement;

    expect(noneCard.checked).toBe(false);
    expect(bearerCard.checked).toBe(false);

    fireEvent.change(usernameInput, { target: { value: 'admin' } });
    fireEvent.change(passwordInput, { target: { value: 'secret123' } });

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        data: {
          authType: {
            type: 'basic',
            username: 'admin',
            password: 'secret123',
          },
        },
      });
    });
  });

  it('switches between authentication types correctly', async () => {
    render(<TestFormWrapper schema={authSchema} onSubmit={mockOnSubmit} />, { wrapper });

    expect(screen.getByLabelText('None', { selector: 'input' })).toBeInTheDocument();

    const basicCard = screen.getByLabelText('Basic Auth', { selector: 'input' });
    fireEvent.click(basicCard);

    await waitFor(() => {
      expect(screen.queryByTestId(usernameTestId)).toBeDefined();
      expect(screen.queryByTestId(passwordTestId)).toBeDefined();
    });

    const usernameInput = screen.getByTestId(usernameTestId);
    const passwordInput = screen.getByTestId(passwordTestId);
    fireEvent.change(usernameInput, { target: { value: 'testuser' } });
    fireEvent.change(passwordInput, { target: { value: 'testpass' } });

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        data: {
          authType: {
            type: 'basic',
            username: 'testuser',
            password: 'testpass',
          },
        },
      });
    });
  });

  it('submits form with bearer token authentication', async () => {
    render(<TestFormWrapper schema={authSchema} onSubmit={mockOnSubmit} />, { wrapper });

    const bearerCard = screen.getByLabelText('Bearer Token', { selector: 'input' });
    fireEvent.click(bearerCard);
    const tokenInput = await screen.findByTestId('generator-field-authType-token');

    fireEvent.change(tokenInput, { target: { value: 'my-secret-token' } });

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        data: {
          authType: {
            type: 'bearer',
            token: 'my-secret-token',
          },
        },
      });
    });
  });

  it('displays validation errors when submitting basic auth with empty username/password', async () => {
    render(<TestFormWrapper schema={authSchema} onSubmit={mockOnSubmit} />, { wrapper });

    const basicCard = screen.getByLabelText('Basic Auth', { selector: 'input' });
    fireEvent.click(basicCard);

    await screen.findByTestId(usernameTestId);
    await screen.findByTestId(passwordTestId);

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    expect(await screen.findByText('Username cannot be empty')).toBeInTheDocument();
    expect(await screen.findByText('Password cannot be empty')).toBeInTheDocument();

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('shows only username error on blur, not password error', async () => {
    render(<TestFormWrapper schema={authSchema} onSubmit={mockOnSubmit} />, { wrapper });

    const basicCard = screen.getByLabelText('Basic Auth', { selector: 'input' });
    fireEvent.click(basicCard);

    await screen.findByTestId(usernameTestId);
    await screen.findByTestId(passwordTestId);

    const usernameInput = screen.getByTestId(usernameTestId);

    fireEvent.change(usernameInput, { target: { value: 'test' } });
    fireEvent.change(usernameInput, { target: { value: '' } });
    fireEvent.blur(usernameInput);

    expect(await screen.findByText('Username cannot be empty')).toBeInTheDocument();

    expect(screen.queryByText('Password cannot be empty')).not.toBeInTheDocument();
  });

  it('submits single-option union with full structure', async () => {
    const singleOptionSchema = z.object({
      apiKey: z
        .discriminatedUnion('type', [
          z
            .object({
              type: z.literal('headers'),
              headers: z.string().min(1, { message: 'API Key cannot be empty' }).meta({
                widget: 'password',
                label: 'API Key',
              }),
            })
            .meta({
              label: 'Headers',
            }),
        ])
        .meta({ widget: 'formFieldset', label: 'Authentication' }),
    });

    render(<TestFormWrapper schema={singleOptionSchema} onSubmit={mockOnSubmit} />, { wrapper });

    const apiKeyInput = screen.getByTestId('generator-field-apiKey-headers');
    fireEvent.change(apiKeyInput, { target: { value: 'my-secret-api-key' } });

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        data: {
          apiKey: {
            type: 'headers',
            headers: 'my-secret-api-key',
          },
        },
      });
    });
  });

  it('shows all validation errors on submit even after partial blur validation', async () => {
    const schema = z.object({
      name: z.string().min(1, 'Name cannot be empty').meta({
        widget: 'text',
        label: 'Name',
      }),
      authType: z
        .discriminatedUnion('type', [
          z.object({ type: z.literal('none') }).meta({
            label: 'None',
          }),
          z
            .object({
              type: z.literal('basic'),
              username: z.string().min(1, 'Username cannot be empty').meta({
                widget: 'text',
                label: 'Username',
              }),
              password: z.string().min(1, 'Password cannot be empty').meta({
                widget: 'password',
                label: 'Password',
              }),
            })
            .meta({
              label: 'Basic Auth',
            }),
        ])
        .meta({
          widget: 'formFieldset',
          label: 'Authentication',
          default: 'none',
        }),
    });

    render(<TestFormWrapper schema={schema} onSubmit={mockOnSubmit} />, { wrapper });

    const basicCard = screen.getByLabelText('Basic Auth', { selector: 'input' });
    fireEvent.click(basicCard);

    const usernameInput = screen.getByTestId(usernameTestId);
    fireEvent.focus(usernameInput);
    fireEvent.change(usernameInput, { target: { value: 'test' } });
    fireEvent.change(usernameInput, { target: { value: '' } });
    fireEvent.blur(usernameInput);

    await screen.findByText('Username cannot be empty');
    expect(screen.queryByText('Name cannot be empty')).not.toBeInTheDocument();
    expect(screen.queryByText('Password cannot be empty')).not.toBeInTheDocument();

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    expect(await screen.findByText('Name cannot be empty')).toBeInTheDocument();
    expect(await screen.findByText('Username cannot be empty')).toBeInTheDocument();
    expect(await screen.findByText('Password cannot be empty')).toBeInTheDocument();

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  describe('Form Config - disabled', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    describe('disabled: true makes all fields disabled', () => {
      it('makes all fields in discriminated union read-only', () => {
        const schema = z.object({
          authType: z
            .discriminatedUnion('type', [
              z
                .object({
                  type: z.literal('basic'),
                  username: z.string().meta({
                    widget: 'text',
                    label: 'Username',
                  }),
                  password: z.string().meta({
                    widget: 'password',
                    label: 'Password',
                  }),
                })
                .meta({
                  label: 'Basic Auth',
                }),
            ])
            .meta({
              widget: 'formFieldset',
              label: 'Authentication',
            }),
        });

        render(
          <TestFormWrapper
            schema={schema}
            formConfig={{ disabled: true }}
            onSubmit={mockOnSubmit}
          />,
          { wrapper }
        );

        const usernameInput = screen.getByTestId(
          'generator-field-authType-username'
        ) as HTMLInputElement;
        const passwordInput = screen.getByTestId(
          'generator-field-authType-password'
        ) as HTMLInputElement;

        expect(usernameInput).toBeDisabled();
        expect(passwordInput).toBeDisabled();
      });

      it('makes multiple fields read-only', () => {
        const schema = z.object({
          username: z.string().meta({
            widget: 'text',
            label: 'Username',
          }),
          email: z.string().meta({
            widget: 'text',
            label: 'Email',
          }),
          role: z.enum(['admin', 'user']).meta({
            widget: 'select',
            label: 'Role',
          }),
        });

        render(
          <TestFormWrapper
            schema={schema}
            formConfig={{ disabled: true }}
            onSubmit={mockOnSubmit}
          />,
          { wrapper }
        );

        const usernameInput = screen.getByLabelText('Username', {
          selector: 'input',
        }) as HTMLInputElement;
        const emailInput = screen.getByLabelText('Email', {
          selector: 'input',
        }) as HTMLInputElement;
        const roleSelect = screen.getByRole('combobox') as HTMLSelectElement;

        expect(usernameInput).toBeDisabled();
        expect(emailInput).toBeDisabled();
        expect(roleSelect).toBeDisabled();
      });
    });

    describe('field-level disabled overrides form-level disabled', () => {
      it('field disabled: true overrides form disabled: false', () => {
        const schema = z.object({
          username: z.string().meta({
            widget: 'text',
            label: 'Username',
            disabled: true,
          }),
          email: z.string().meta({
            widget: 'text',
            label: 'Email',
          }),
        });

        render(
          <TestFormWrapper
            schema={schema}
            formConfig={{ disabled: false }}
            onSubmit={mockOnSubmit}
          />,
          { wrapper }
        );

        const usernameInput = screen.getByTestId('generator-field-username') as HTMLInputElement;
        const emailInput = screen.getByTestId('generator-field-email') as HTMLInputElement;
        expect(usernameInput).toBeDisabled();
        expect(emailInput).toBeEnabled();
      });

      it('form disabled: true applies when field has no disabled set', () => {
        const schema = z.object({
          username: z.string().meta({
            widget: 'text',
            label: 'Username',
          }),
          email: z.string().meta({
            widget: 'text',
            label: 'Email',
            disabled: true,
          }),
        });

        render(
          <TestFormWrapper
            schema={schema}
            formConfig={{ disabled: true }}
            onSubmit={mockOnSubmit}
          />,
          { wrapper }
        );

        const usernameInput = screen.getByTestId('generator-field-username') as HTMLInputElement;
        const emailInput = screen.getByTestId('generator-field-email') as HTMLInputElement;

        expect(usernameInput).toBeDisabled();
        expect(emailInput).toBeDisabled();
      });

      it('field-level disabled works in discriminated union', () => {
        const schema = z.object({
          authType: z
            .discriminatedUnion('type', [
              z
                .object({
                  type: z.literal('basic'),
                  username: z.string().meta({
                    widget: 'text',
                    label: 'Username',
                    disabled: true,
                  }),
                  password: z.string().meta({
                    widget: 'password',
                    label: 'Password',
                  }),
                })
                .meta({
                  label: 'Basic Auth',
                }),
            ])
            .meta({
              widget: 'formFieldset',
              label: 'Authentication',
            }),
        });

        render(
          <TestFormWrapper
            schema={schema}
            formConfig={{ disabled: false }}
            onSubmit={mockOnSubmit}
          />,
          { wrapper }
        );

        const usernameInput = screen.getByTestId(
          'generator-field-authType-username'
        ) as HTMLInputElement;
        const passwordInput = screen.getByTestId(
          'generator-field-authType-password'
        ) as HTMLInputElement;

        expect(usernameInput).toBeDisabled();
        expect(passwordInput).toBeEnabled();
      });
    });
  });
});

describe('Nested Object Widget Integration Tests', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('submits form with nested object data', async () => {
    const user = userEvent.setup();
    const schema = z.object({
      server: z.object({
        host: z.string().meta({
          label: 'Host',
        }),
        port: z.string().meta({
          label: 'Port',
        }),
      }),
    });

    render(<TestFormWrapper schema={schema} onSubmit={mockOnSubmit} />, { wrapper });

    const hostInput = screen.getByTestId('generator-field-server-host');
    const portInput = screen.getByTestId('generator-field-server-port');

    await user.type(hostInput, 'localhost');
    await user.type(portInput, '8080');
    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        data: {
          server: {
            host: 'localhost',
            port: '8080',
          },
        },
      });
    });
  });

  it('validates nested object fields', async () => {
    const user = userEvent.setup();
    const schema = z.object({
      credentials: z.object({
        username: z.string().min(5, 'Username must be at least 5 characters').meta({
          label: 'Username',
        }),
      }),
    });

    render(<TestFormWrapper schema={schema} onSubmit={mockOnSubmit} />, { wrapper });

    const usernameInput = screen.getByTestId('generator-field-credentials-username');

    await user.type(usernameInput, 'abc');

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    expect(await screen.findByText('Username must be at least 5 characters')).toBeInTheDocument();

    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('combines nested objects with top-level fields', async () => {
    const user = userEvent.setup();
    const schema = z.object({
      name: z.string().meta({
        label: 'Application Name',
      }),
      server: z.object({
        host: z.string().meta({
          label: 'Host',
        }),
        port: z.string().meta({
          label: 'Port',
        }),
      }),
    });

    render(<TestFormWrapper schema={schema} onSubmit={mockOnSubmit} />, { wrapper });

    const nameInput = screen.getByTestId('generator-field-name');
    const hostInput = screen.getByTestId('generator-field-server-host');
    const portInput = screen.getByTestId('generator-field-server-port');

    await user.type(nameInput, 'My App');
    await user.type(hostInput, 'localhost');
    await user.type(portInput, '3000');

    const submitButton = screen.getByRole('button', { name: 'Submit' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        data: {
          name: 'My App',
          server: {
            host: 'localhost',
            port: '3000',
          },
        },
      });
    });
  });
});
