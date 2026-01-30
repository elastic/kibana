/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { z } from '@kbn/zod/v4';
import { __IntlProvider as IntlProvider } from '@kbn/i18n-react';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { SingleOptionUnionWidget } from './single_option_union_widget';
import { addMeta, getMeta } from '../../../schema_connector_metadata';

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

describe('SingleOptionUnionWidget', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic rendering', () => {
    it('should render fields from the single option', () => {
      const option = z.object({
        type: z.literal('basic'),
        username: z.string().meta({ label: 'Username' }),
        password: z.string().meta({ label: 'Password', sensitive: true }),
      });

      const schema = z.discriminatedUnion('type', [option]);

      render(
        <TestFormWrapper>
          <SingleOptionUnionWidget
            formConfig={{}}
            path="auth"
            schema={schema}
            options={[option]}
            fieldProps={{
              label: 'Authentication',
              euiFieldProps: {},
            }}
            fieldConfig={{
              validations: [{ validator: () => undefined }],
            }}
            discriminatorKey="type"
          />
        </TestFormWrapper>,
        { wrapper }
      );

      expect(screen.getByLabelText('Username', { selector: 'input' })).toBeDefined();
      expect(screen.getByLabelText('Password', { selector: 'input' })).toBeDefined();
    });

    it('should not render the discriminator field visually', () => {
      const option = z.object({
        type: z.literal('apiKey'),
        key: z.string().meta({ label: 'API Key' }),
      });

      const schema = z.discriminatedUnion('type', [option]);

      render(
        <TestFormWrapper>
          <SingleOptionUnionWidget
            formConfig={{}}
            path="auth"
            schema={schema}
            options={[option]}
            fieldProps={{
              label: 'Authentication',
              euiFieldProps: {},
            }}
            fieldConfig={{
              validations: [{ validator: () => undefined }],
            }}
            discriminatorKey="type"
          />
        </TestFormWrapper>,
        { wrapper }
      );

      expect(screen.queryByLabelText('type')).toBeNull();
      expect(screen.getByLabelText('API Key', { selector: 'input' })).toBeDefined();
    });

    it('should hide discriminator field by adding hidden metadata', () => {
      const option = z.object({
        authType: z.literal('bearer'),
        token: z.string().meta({ label: 'Token' }),
      });

      const schema = z.discriminatedUnion('authType', [option]);

      render(
        <TestFormWrapper>
          <SingleOptionUnionWidget
            formConfig={{}}
            path="auth"
            schema={schema}
            options={[option]}
            fieldProps={{
              label: 'Authentication',
              euiFieldProps: {},
            }}
            fieldConfig={{
              validations: [{ validator: () => undefined }],
            }}
            discriminatorKey="authType"
          />
        </TestFormWrapper>,
        { wrapper }
      );

      const discriminatorField = option.shape.authType as z.ZodType;
      const meta = getMeta(discriminatorField);
      expect(meta.hidden).toBe(true);
      expect(meta.disabled).toBe(true);
    });
  });

  describe('disabled state propagation', () => {
    it('should propagate disabled state from parent schema to child fields', () => {
      const option = z.object({
        type: z.literal('basic'),
        username: z.string().meta({ label: 'Username' }),
      });

      const schema = z.discriminatedUnion('type', [option]);
      addMeta(schema, { disabled: true });

      render(
        <TestFormWrapper>
          <SingleOptionUnionWidget
            formConfig={{}}
            path="auth"
            schema={schema}
            options={[option]}
            fieldProps={{
              label: 'Authentication',
              euiFieldProps: {},
            }}
            fieldConfig={{
              validations: [{ validator: () => undefined }],
            }}
            discriminatorKey="type"
          />
        </TestFormWrapper>,
        { wrapper }
      );

      const usernameInput = screen.getByLabelText('Username', {
        selector: 'input',
      }) as HTMLInputElement;
      expect(usernameInput).toBeDisabled();
    });

    it('should propagate disabled state from formConfig to child fields', () => {
      const option = z.object({
        type: z.literal('basic'),
        apiKey: z.string().meta({ label: 'API Key' }),
      });

      const schema = z.discriminatedUnion('type', [option]);

      render(
        <TestFormWrapper>
          <SingleOptionUnionWidget
            formConfig={{ disabled: true }}
            path="auth"
            schema={schema}
            options={[option]}
            fieldProps={{
              label: 'Authentication',
              euiFieldProps: {},
            }}
            fieldConfig={{
              validations: [{ validator: () => undefined }],
            }}
            discriminatorKey="type"
          />
        </TestFormWrapper>,
        { wrapper }
      );

      const apiKeyInput = screen.getByLabelText('API Key', {
        selector: 'input',
      }) as HTMLInputElement;
      expect(apiKeyInput).toBeDisabled();
    });

    it('should respect explicit disabled: false on option schema even when parent is disabled', () => {
      const option = z.object({
        type: z.literal('basic'),
        username: z.string().meta({ label: 'Username' }),
      });
      addMeta(option, { disabled: false });

      const schema = z.discriminatedUnion('type', [option]);

      render(
        <TestFormWrapper>
          <SingleOptionUnionWidget
            formConfig={{ disabled: true }}
            path="auth"
            schema={schema}
            options={[option]}
            fieldProps={{
              label: 'Authentication',
              euiFieldProps: {},
            }}
            fieldConfig={{
              validations: [{ validator: () => undefined }],
            }}
            discriminatorKey="type"
          />
        </TestFormWrapper>,
        { wrapper }
      );

      const usernameInput = screen.getByLabelText('Username', {
        selector: 'input',
      }) as HTMLInputElement;
      // Should not be disabled because option has explicit disabled: false
      expect(usernameInput).toBeDisabled();
    });
  });

  describe('default values', () => {
    it('should display default values in fields', () => {
      const option = z.object({
        type: z.literal('basic'),
        username: z.string().default('admin').meta({ label: 'Username' }),
      });

      const schema = z.discriminatedUnion('type', [option]);

      render(
        <TestFormWrapper>
          <SingleOptionUnionWidget
            formConfig={{}}
            path="auth"
            schema={schema}
            options={[option]}
            fieldProps={{
              label: 'Authentication',
              euiFieldProps: {},
            }}
            fieldConfig={{
              validations: [{ validator: () => undefined }],
            }}
            discriminatorKey="type"
          />
        </TestFormWrapper>,
        { wrapper }
      );

      const usernameInput = screen.getByLabelText('Username', {
        selector: 'input',
      }) as HTMLInputElement;
      expect(usernameInput.value).toBe('admin');
    });

    it('should work with form-level default values', () => {
      const option = z.object({
        type: z.literal('basic'),
        username: z.string().meta({ label: 'Username' }),
        password: z.string().meta({ label: 'Password', sensitive: true }),
      });

      const schema = z.discriminatedUnion('type', [option]);

      render(
        <TestFormWrapper
          defaultValue={{
            // path
            auth: {
              type: 'basic',
              username: 'formdefault',
              password: 'secret',
            },
          }}
        >
          <SingleOptionUnionWidget
            formConfig={{}}
            path="auth"
            schema={schema}
            options={[option]}
            fieldProps={{
              label: 'Authentication',
              euiFieldProps: {},
            }}
            fieldConfig={{
              validations: [{ validator: () => undefined }],
            }}
            discriminatorKey="type"
          />
        </TestFormWrapper>,
        { wrapper }
      );

      const usernameInput = screen.getByLabelText('Username', {
        selector: 'input',
      }) as HTMLInputElement;
      expect(usernameInput.value).toBe('formdefault');
    });
  });

  it('should handle custom discriminator key names', () => {
    const option = z.object({
      authMethod: z.literal('apiKey'),
      key: z.string().meta({ label: 'API Key' }),
    });

    const schema = z.discriminatedUnion('authMethod', [option]);

    render(
      <TestFormWrapper>
        <SingleOptionUnionWidget
          formConfig={{}}
          path="auth"
          schema={schema}
          options={[option]}
          fieldProps={{
            label: 'Authentication',
            euiFieldProps: {},
          }}
          fieldConfig={{
            validations: [{ validator: () => undefined }],
          }}
          discriminatorKey="authMethod"
        />
      </TestFormWrapper>,
      { wrapper }
    );

    expect(screen.getByLabelText('API Key', { selector: 'input' })).toBeDefined();
    // Discriminator field should still be hidden
    expect(screen.queryByLabelText('authMethod')).toBeNull();
  });

  it('should handle option with multiple fields', () => {
    const option = z.object({
      type: z.literal('oauth'),
      clientId: z.string().meta({ label: 'Client ID' }),
      clientSecret: z.string().meta({ label: 'Client Secret', sensitive: true }),
      scope: z.string().meta({ label: 'Scope' }),
    });

    const schema = z.discriminatedUnion('type', [option]);

    render(
      <TestFormWrapper>
        <SingleOptionUnionWidget
          formConfig={{}}
          path="auth"
          schema={schema}
          options={[option]}
          fieldProps={{
            label: 'Authentication',
            euiFieldProps: {},
          }}
          fieldConfig={{
            validations: [{ validator: () => undefined }],
          }}
          discriminatorKey="type"
        />
      </TestFormWrapper>,
      { wrapper }
    );

    expect(screen.getByLabelText('Client ID', { selector: 'input' })).toBeDefined();
    expect(screen.getByLabelText('Client Secret', { selector: 'input' })).toBeDefined();
    expect(screen.getByLabelText('Scope', { selector: 'input' })).toBeDefined();
  });
});
