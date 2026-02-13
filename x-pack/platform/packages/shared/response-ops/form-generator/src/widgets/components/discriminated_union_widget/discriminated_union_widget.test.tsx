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
import { DiscriminatedUnionWidget } from './discriminated_union_widget';

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

describe('DiscriminatedUnionWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all union options as checkable cards', () => {
    const option1 = z
      .object({
        type: z.literal('basic'),
        username: z.string().meta({ widget: 'text', label: 'Username' }),
      })
      .meta({ label: 'Basic' });

    const option2 = z
      .object({
        type: z.literal('oauth'),
        token: z.string().meta({ widget: 'text', label: 'Token' }),
      })
      .meta({ label: 'Oauth' });

    const schema = z.discriminatedUnion('type', [option1, option2]);

    render(
      <TestFormWrapper>
        <DiscriminatedUnionWidget
          formConfig={{}}
          path="auth"
          schema={schema}
          options={[option1, option2]}
          fieldProps={{
            label: 'Authentication',
            euiFieldProps: {},
          }}
          fieldConfig={{
            validations: [
              {
                validator: () => undefined,
              },
            ],
          }}
          discriminatorKey="type"
        />
      </TestFormWrapper>,
      { wrapper }
    );

    expect(screen.getByText('Authentication')).toBeDefined();
    expect(screen.getByText('Basic')).toBeDefined();
    expect(screen.getByText('Oauth')).toBeDefined();
  });

  it('shows selected option as checked', async () => {
    const user = userEvent.setup();
    const option1 = z
      .object({
        type: z.literal('basic'),
        username: z.string().meta({ widget: 'text', label: 'Username' }),
      })
      .meta({ label: 'Basic' });

    const option2 = z
      .object({
        type: z.literal('oauth'),
        token: z.string().meta({ widget: 'text', label: 'Token' }),
      })
      .meta({ label: 'Oauth' });

    const schema = z.discriminatedUnion('type', [option1, option2]);

    render(
      <TestFormWrapper>
        <DiscriminatedUnionWidget
          formConfig={{}}
          path="auth"
          schema={schema}
          options={[option1, option2]}
          fieldProps={{
            label: 'Authentication',
            euiFieldProps: {},
          }}
          fieldConfig={{
            validations: [
              {
                validator: () => undefined,
              },
            ],
          }}
          discriminatorKey="type"
        />
      </TestFormWrapper>,
      { wrapper }
    );

    const oauthCard = screen.getByLabelText('Oauth', { selector: 'input' });
    await user.click(oauthCard);

    const oauthCardChecked = screen.getByLabelText('Oauth', {
      selector: 'input',
    }) as HTMLInputElement;
    expect(oauthCardChecked.checked).toBe(true);
  });

  it('renders option fields for selected option', () => {
    const option1 = z.object({
      type: z.literal('basic'),
      username: z.string().meta({ widget: 'text', label: 'Username' }),
      password: z.string().meta({ widget: 'password', label: 'Password' }),
    });

    const option2 = z.object({
      type: z.literal('oauth'),
      token: z.string().meta({ widget: 'text', label: 'Token' }),
    });

    const schema = z.discriminatedUnion('type', [option1, option2]);

    render(
      <TestFormWrapper defaultValue={{ auth: { type: 'basic', username: '', password: '' } }}>
        <DiscriminatedUnionWidget
          formConfig={{}}
          path="auth"
          schema={schema}
          options={[option1, option2]}
          fieldProps={{
            label: 'Authentication',
            euiFieldProps: {},
          }}
          fieldConfig={{
            validations: [
              {
                validator: () => undefined,
              },
            ],
          }}
          discriminatorKey="type"
        />
      </TestFormWrapper>,
      { wrapper }
    );

    expect(screen.getByLabelText('Username', { selector: 'input' })).toBeDefined();
    expect(screen.getByLabelText('Password', { selector: 'input' })).toBeDefined();
    expect(screen.queryByLabelText('Token')).toBeNull();
  });

  it('calls onChange when switching options', async () => {
    const user = userEvent.setup();
    const option1 = z
      .object({
        type: z.literal('basic'),
        username: z.string().meta({ widget: 'text', label: 'Username' }),
      })
      .meta({ label: 'Basic' });

    const option2 = z
      .object({
        type: z.literal('oauth'),
        token: z.string().meta({ widget: 'text', label: 'Token' }),
      })
      .meta({ label: 'Oauth' });

    const schema = z.discriminatedUnion('type', [option1, option2]);

    render(
      <TestFormWrapper>
        <DiscriminatedUnionWidget
          formConfig={{}}
          path="auth"
          schema={schema}
          options={[option1, option2]}
          fieldProps={{
            label: 'Authentication',
            euiFieldProps: {},
          }}
          fieldConfig={{
            validations: [
              {
                validator: () => undefined,
              },
            ],
          }}
          discriminatorKey="type"
        />
      </TestFormWrapper>,
      { wrapper }
    );

    const oauthCard = screen.getByLabelText('Oauth', { selector: 'input' });
    await user.click(oauthCard);

    // After switching, the Token field should appear
    await waitFor(() => {
      expect(screen.queryByLabelText('Token', { selector: 'input' })).toBeDefined();
    });
  });

  it('calls onChange when option field changes', async () => {
    const user = userEvent.setup();
    const option1 = z.object({
      type: z.literal('basic'),
      username: z.string().meta({ widget: 'text', label: 'Username' }),
    });

    const schema = z.discriminatedUnion('type', [option1]);

    render(
      <TestFormWrapper>
        <DiscriminatedUnionWidget
          formConfig={{}}
          path="auth"
          schema={schema}
          options={[option1]}
          fieldProps={{
            label: 'Authentication',
            euiFieldProps: {},
          }}
          fieldConfig={{
            validations: [
              {
                validator: () => undefined,
              },
            ],
          }}
          discriminatorKey="type"
        />
      </TestFormWrapper>,
      { wrapper }
    );

    const usernameInput = screen.getByLabelText('Username', { selector: 'input' });
    await user.type(usernameInput, 'testuser');

    expect((usernameInput as HTMLInputElement).value).toBe('testuser');
  });

  it('validates option fields on blur', async () => {
    const user = userEvent.setup();
    const option1 = z.object({
      type: z.literal('basic'),
      username: z.string().min(3).meta({ widget: 'text', label: 'Username' }),
    });

    const schema = z.discriminatedUnion('type', [option1]);

    render(
      <TestFormWrapper>
        <DiscriminatedUnionWidget
          formConfig={{}}
          path="auth"
          schema={schema}
          options={[option1]}
          fieldProps={{
            label: 'Authentication',
            euiFieldProps: {},
          }}
          fieldConfig={{
            validations: [
              {
                validator: () => undefined,
              },
            ],
          }}
          discriminatorKey="type"
        />
      </TestFormWrapper>,
      { wrapper }
    );

    const usernameInput = screen.getByLabelText('Username', { selector: 'input' });
    await user.click(usernameInput);
    await user.type(usernameInput, 'ab');
    await user.tab();

    await waitFor(() => {
      expect(screen.queryByText(/at least/i)).toBeDefined();
    });
  });

  it('renders single option union without checkable card', () => {
    const option1 = z.object({
      type: z.literal('basic'),
      username: z.string().meta({ widget: 'text', label: 'Username' }),
    });

    const schema = z.discriminatedUnion('type', [option1]);

    render(
      <TestFormWrapper>
        <DiscriminatedUnionWidget
          formConfig={{}}
          path="auth"
          schema={schema}
          options={[option1]}
          fieldProps={{
            label: 'Authentication',
            euiFieldProps: {},
          }}
          fieldConfig={{
            validations: [
              {
                validator: () => undefined,
              },
            ],
          }}
          discriminatorKey="type"
        />
      </TestFormWrapper>,
      { wrapper }
    );

    // Single option should not show checkable cards
    expect(screen.queryByLabelText('Basic', { selector: 'input' })).toBeNull();
    // But should show the field
    expect(screen.getByLabelText('Username', { selector: 'input' })).toBeDefined();
  });

  it('handles single option union with field interactions and validation', async () => {
    const user = userEvent.setup();
    const option1 = z.object({
      type: z.literal('basic'),
      username: z
        .string()
        .min(1, 'Username is required')
        .meta({ widget: 'text', label: 'Username' }),
    });

    const schema = z.discriminatedUnion('type', [option1]);

    render(
      <TestFormWrapper>
        <DiscriminatedUnionWidget
          formConfig={{}}
          path="auth"
          schema={schema}
          options={[option1]}
          fieldProps={{
            label: 'Authentication',
            euiFieldProps: {},
          }}
          fieldConfig={{
            validations: [
              {
                validator: () => undefined,
              },
            ],
          }}
          discriminatorKey="type"
        />
      </TestFormWrapper>,
      { wrapper }
    );

    const usernameInput = screen.getByLabelText('Username', { selector: 'input' });
    await user.type(usernameInput, 'testuser');
    expect((usernameInput as HTMLInputElement).value).toBe('testuser');
  });

  it('selects the first option by default when no default is specified', () => {
    const option1 = z
      .object({
        type: z.literal('basic'),
        username: z.string().meta({ widget: 'text', label: 'Username' }),
      })
      .meta({ label: 'Basic' });

    const option2 = z
      .object({
        type: z.literal('oauth'),
        token: z.string().meta({ widget: 'text', label: 'Token' }),
      })
      .meta({ label: 'Oauth' });

    const schema = z.discriminatedUnion('type', [option1, option2]);

    render(
      <TestFormWrapper>
        <DiscriminatedUnionWidget
          formConfig={{}}
          path="auth"
          schema={schema}
          options={[option1, option2]}
          fieldProps={{
            label: 'Authentication',
            euiFieldProps: {},
          }}
          fieldConfig={{
            validations: [
              {
                validator: () => undefined,
              },
            ],
          }}
          discriminatorKey="type"
        />
      </TestFormWrapper>,
      { wrapper }
    );

    const basicCard = screen.getByLabelText('Basic', { selector: 'input' }) as HTMLInputElement;
    expect(basicCard.checked).toBe(true);
  });

  it('allows switching between options', async () => {
    const user = userEvent.setup();
    const option1 = z
      .object({
        type: z.literal('basic'),
        username: z.string().meta({ widget: 'text', label: 'Username' }),
      })
      .meta({ label: 'Basic' });

    const option2 = z
      .object({
        type: z.literal('oauth'),
        token: z.string().meta({ widget: 'text', label: 'Token' }),
      })
      .meta({ label: 'Oauth' });

    const schema = z.discriminatedUnion('type', [option1, option2]);

    render(
      <TestFormWrapper>
        <DiscriminatedUnionWidget
          formConfig={{}}
          path="auth"
          schema={schema}
          options={[option1, option2]}
          fieldProps={{
            label: 'Authentication',
            euiFieldProps: {},
          }}
          fieldConfig={{
            validations: [
              {
                validator: () => undefined,
              },
            ],
          }}
          discriminatorKey="type"
        />
      </TestFormWrapper>,
      { wrapper }
    );

    // First option should be selected by default
    const basicCard = screen.getByLabelText('Basic', { selector: 'input' }) as HTMLInputElement;
    expect(basicCard.checked).toBe(true);

    // Click to switch to oauth
    const oauthCard = screen.getByLabelText('Oauth', { selector: 'input' });
    await user.click(oauthCard);

    const oauthCardChecked = screen.getByLabelText('Oauth', {
      selector: 'input',
    }) as HTMLInputElement;
    expect(oauthCardChecked.checked).toBe(true);
  });

  it('works with custom discriminator field (not "type")', () => {
    const option1 = z
      .object({
        authMethod: z.literal('basic'),
        username: z.string().meta({ widget: 'text', label: 'Username' }),
      })
      .meta({ label: 'Basic' });

    const option2 = z
      .object({
        authMethod: z.literal('oauth'),
        token: z.string().meta({ widget: 'text', label: 'Token' }),
      })
      .meta({ label: 'Oauth' });

    const schema = z.discriminatedUnion('authMethod', [option1, option2]);

    render(
      <TestFormWrapper>
        <DiscriminatedUnionWidget
          formConfig={{}}
          path="auth"
          schema={schema}
          options={[option1, option2]}
          fieldProps={{
            label: 'Authentication',
            euiFieldProps: {},
          }}
          fieldConfig={{
            validations: [
              {
                validator: () => undefined,
              },
            ],
          }}
          discriminatorKey="authMethod"
        />
      </TestFormWrapper>,
      { wrapper }
    );

    expect(screen.getByText('Basic')).toBeDefined();
    expect(screen.getByText('Oauth')).toBeDefined();
  });
});
