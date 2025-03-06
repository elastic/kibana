/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { FormTestProvider } from './test_utils';
import {
  ConfigFieldSchema,
  SecretsFieldSchema,
  SimpleConnectorForm,
} from './simple_connector_form';
import userEvent from '@testing-library/user-event';

const fillForm = async () => {
  await userEvent.type(screen.getByTestId('config.url-input'), 'https://example.com', {
    delay: 10,
  });

  await userEvent.type(screen.getByTestId('config.test-config-input'), 'My text field', {
    delay: 10,
  });

  await userEvent.type(screen.getByTestId('secrets.username-input'), 'elastic', {
    delay: 10,
  });

  await userEvent.type(screen.getByTestId('secrets.password-input'), 'changeme', {
    delay: 10,
  });
};

describe('SimpleConnectorForm', () => {
  const configFormSchema: ConfigFieldSchema[] = [
    { id: 'url', label: 'Url', isUrlField: true },
    { id: 'test-config', label: 'Test config', helpText: 'Test help text' },
  ];
  const secretsFormSchema: SecretsFieldSchema[] = [
    { id: 'username', label: 'Username' },
    { id: 'password', label: 'Password', isPasswordField: true },
  ];

  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly', async () => {
    render(
      <FormTestProvider onSubmit={onSubmit}>
        <SimpleConnectorForm
          isEdit={true}
          readOnly={false}
          configFormSchema={configFormSchema}
          secretsFormSchema={secretsFormSchema}
        />
      </FormTestProvider>
    );

    expect(screen.getByText('Url')).toBeInTheDocument();
    expect(screen.getByText('Test config')).toBeInTheDocument();
    expect(screen.getByText('Test help text')).toBeInTheDocument();

    expect(screen.getByText('Authentication')).toBeInTheDocument();
    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByText('Password')).toBeInTheDocument();
  });

  describe('help text and default values', () => {
    const configFormSchemaWithDefault: ConfigFieldSchema[] = [
      {
        id: 'test-config-default-value',
        label: 'Test config default',
        helpText: <>{'Test help text in a component'}</>,
        defaultValue: 'a default',
      },
    ];
    const secretsFormSchemaWithHelpText: SecretsFieldSchema[] = [
      { id: 'username', label: 'Username' },
      { id: 'password', label: 'Password', isPasswordField: true },
      {
        id: 'password-with-help-text',
        label: 'Password with help text',
        isPasswordField: true,
        helpText: 'Password help text',
      },
    ];

    it('renders the help text and default values', async () => {
      render(
        <FormTestProvider onSubmit={onSubmit}>
          <SimpleConnectorForm
            isEdit={true}
            readOnly={false}
            configFormSchema={configFormSchemaWithDefault}
            secretsFormSchema={secretsFormSchemaWithHelpText}
          />
        </FormTestProvider>
      );

      expect(screen.getByDisplayValue('a default')).toBeInTheDocument();
      expect(screen.getByText('Test help text in a component')).toBeInTheDocument();
      expect(screen.getByText('Password help text')).toBeInTheDocument();
    });
  });

  it('submits correctly', async () => {
    render(
      <FormTestProvider onSubmit={onSubmit}>
        <SimpleConnectorForm
          isEdit={true}
          readOnly={false}
          configFormSchema={configFormSchema}
          secretsFormSchema={secretsFormSchema}
        />
      </FormTestProvider>
    );

    await fillForm();
    await userEvent.click(screen.getByTestId('form-test-provide-submit'));

    expect(onSubmit).toHaveBeenCalledWith({
      data: {
        config: {
          'test-config': 'My text field',
          url: 'https://example.com',
        },
        secrets: {
          password: 'changeme',
          username: 'elastic',
        },
      },
      isValid: true,
    });
  });

  describe('Validation', () => {
    const tests: Array<[string, string]> = [
      ['config.url-input', 'not-valid'],
      ['config.test-config-input', ''],
      ['secrets.username-input', ''],
      ['secrets.password-input', ''],
    ];

    it.each(tests)('validates correctly %p', async (field, value) => {
      render(
        <FormTestProvider onSubmit={onSubmit}>
          <SimpleConnectorForm
            isEdit={true}
            readOnly={false}
            configFormSchema={configFormSchema}
            secretsFormSchema={secretsFormSchema}
          />
        </FormTestProvider>
      );

      await fillForm();

      await userEvent.clear(screen.getByTestId(field));
      if (value !== '') {
        await userEvent.type(screen.getByTestId(field), value, {
          delay: 10,
        });
      }

      await userEvent.click(screen.getByTestId('form-test-provide-submit'));

      expect(onSubmit).toHaveBeenCalledWith({ data: {}, isValid: false });
    });
  });
});
