/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { MoreOptionsFields } from './more_options_fields';
import { render, screen } from '@testing-library/react';
import { I18nProvider } from '@kbn/i18n-react';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import userEvent from '@testing-library/user-event';
import type { ConfigEntryView } from '../types/types';
import { FieldType } from '../types/types';

const MockFormProvider = ({ children }: { children: React.ReactElement }) => {
  const { form } = useForm();

  return (
    <I18nProvider>
      <Form form={form}>{children}</Form>
    </I18nProvider>
  );
};

const mockOptionalProviderFormFields: ConfigEntryView[] = [
  {
    key: 'headers',
    isValid: true,
    validationErrors: [],
    value: null,
    default_value: null,
    description: 'Custom headers to include in the requests to OpenAI.',
    label: 'Custom Headers',
    required: false,
    sensitive: false,
    updatable: true,
    type: FieldType.MAP,
    supported_task_types: ['completion', 'chat_completion'],
  },
  {
    key: 'organization_id',
    isValid: true,
    validationErrors: [],
    value: null,
    default_value: null,
    description: 'The unique identifier of your organization.',
    label: 'Organization ID',
    required: false,
    sensitive: false,
    updatable: false,
    type: FieldType.STRING,
    supported_task_types: ['text_embedding', 'completion', 'chat_completion'],
  },
  {
    key: 'rate_limit.requests_per_minute',
    isValid: true,
    validationErrors: [],
    value: null,
    default_value: null,
    description:
      'Default number of requests allowed per minute. For text_embedding is 3000. For completion is 500.',
    label: 'Rate Limit',
    required: false,
    sensitive: false,
    updatable: false,
    type: FieldType.INTEGER,
    supported_task_types: ['text_embedding', 'completion', 'chat_completion'],
  },
  {
    key: 'url',
    isValid: true,
    validationErrors: [],
    value: null,
    default_value: null,
    description: 'The absolute URL of the external service to send requests to.',
    label: 'URL',
    required: false,
    sensitive: false,
    updatable: false,
    type: FieldType.STRING,
    supported_task_types: ['text_embedding', 'completion', 'chat_completion'],
  },
];

// FLAKY: https://github.com/elastic/kibana/issues/253334
// FLAKY: https://github.com/elastic/kibana/issues/253333
describe.skip('MoreOptionsFields', () => {
  async function expectHeaderInputsToExistAndBeEditable(index: number, addContent: boolean = true) {
    // Input fields for key/value should be present but empty
    const keyInput = screen.getByTestId(`headers-key-${index}`);
    const valueInput = screen.getByTestId(`headers-value-${index}`);
    expect(keyInput).toBeInTheDocument();
    expect(keyInput?.getAttribute('value')).toBe('');
    expect(valueInput).toBeInTheDocument();
    expect(valueInput?.getAttribute('value')).toBe('');
    // Delete button should be present, Add button should be present but disabled while key/value are empty
    const headersDeleteButton = screen.getByTestId(`headers-delete-button-${index}`);
    expect(headersDeleteButton).toBeInTheDocument();
    // Input into key/value
    if (addContent) {
      await userEvent.clear(keyInput);
      await userEvent.type(keyInput, `TestCustomKey-${index}`);
      expect(keyInput).toHaveValue(`TestCustomKey-${index}`);
      await userEvent.clear(valueInput);
      await userEvent.type(valueInput, `TestCustomValue-${index}`);
      expect(valueInput).toHaveValue(`TestCustomValue-${index}`);
    }
  }

  async function expectAddHeadersButton(toBeEnabled: boolean, clickButton: boolean = false) {
    const headersAddButton = screen.getByTestId('headers-add-button');
    expect(headersAddButton).toBeInTheDocument();
    if (toBeEnabled) {
      expect(headersAddButton).toBeEnabled();
    } else {
      expect(headersAddButton).toBeDisabled();
    }
    if (clickButton && toBeEnabled) {
      await userEvent.click(headersAddButton);
    }
  }

  it('should render More options accordion when fields available', () => {
    render(
      <MockFormProvider>
        <MoreOptionsFields
          onSetProviderConfigEntry={jest.fn()}
          isEdit={false}
          optionalProviderFormFields={mockOptionalProviderFormFields}
        />
      </MockFormProvider>
    );

    const moreOptionsAccordion = screen.getByTestId('inference-endpoint-more-options');
    const moreOptionsForm = screen.getByTestId('more-options-configuration-form');
    expect(moreOptionsAccordion).toBeInTheDocument();
    expect(moreOptionsForm).toBeInTheDocument();
  });

  it('should render headers field with switch unchecked by default', () => {
    render(
      <MockFormProvider>
        <MoreOptionsFields
          onSetProviderConfigEntry={jest.fn()}
          isEdit={false}
          optionalProviderFormFields={mockOptionalProviderFormFields}
        />
      </MockFormProvider>
    );

    const mapConfigField = screen.getByTestId('config-field-map-type');
    const headersSwitchUnchecked = screen.getByTestId('headers-switch-unchecked');
    const keyInput = screen.queryByTestId('headers-key-0');
    const valueInput = screen.queryByTestId('headers-value-0');
    expect(mapConfigField).toBeInTheDocument();
    expect(headersSwitchUnchecked).toBeInTheDocument();
    expect(keyInput).not.toBeInTheDocument();
    expect(valueInput).not.toBeInTheDocument();
  });

  it('should render empty headers key and value inputs when switch checked', async () => {
    render(
      <MockFormProvider>
        <MoreOptionsFields
          onSetProviderConfigEntry={jest.fn()}
          isEdit={false}
          optionalProviderFormFields={mockOptionalProviderFormFields}
        />
      </MockFormProvider>
    );

    const mapConfigField = screen.getByTestId('config-field-map-type');
    const headersSwitchUnchecked = screen.getByTestId('headers-switch-unchecked');
    expect(mapConfigField).toBeInTheDocument();
    expect(headersSwitchUnchecked).toBeInTheDocument();

    await userEvent.click(headersSwitchUnchecked);
    const headersSwitchChecked = screen.getByTestId('headers-switch-checked');
    expect(headersSwitchChecked).toBeInTheDocument();

    await expectHeaderInputsToExistAndBeEditable(0, false);
    await expectAddHeadersButton(false);
  });

  it('should input headers key and value', async () => {
    render(
      <MockFormProvider>
        <MoreOptionsFields
          onSetProviderConfigEntry={jest.fn()}
          isEdit={false}
          optionalProviderFormFields={mockOptionalProviderFormFields}
        />
      </MockFormProvider>
    );

    const headersSwitchUnchecked = screen.getByTestId('headers-switch-unchecked');
    await userEvent.click(headersSwitchUnchecked);
    await expectHeaderInputsToExistAndBeEditable(0);
    // Add button should be enabled when both key and value have input
    await expectAddHeadersButton(true);
  });

  it('should add multiple headers', async () => {
    render(
      <MockFormProvider>
        <MoreOptionsFields
          onSetProviderConfigEntry={jest.fn()}
          isEdit={false}
          optionalProviderFormFields={mockOptionalProviderFormFields}
        />
      </MockFormProvider>
    );

    const headersSwitchUnchecked = screen.getByTestId('headers-switch-unchecked');
    await userEvent.click(headersSwitchUnchecked);
    await expectHeaderInputsToExistAndBeEditable(0);
    // Add button should be enabled when both key and value have input
    await expectAddHeadersButton(true, true);
    await expectHeaderInputsToExistAndBeEditable(1);
  });

  it('should be able to delete header', async () => {
    render(
      <MockFormProvider>
        <MoreOptionsFields
          onSetProviderConfigEntry={jest.fn()}
          isEdit={false}
          optionalProviderFormFields={mockOptionalProviderFormFields}
        />
      </MockFormProvider>
    );

    const headersSwitchUnchecked = screen.getByTestId('headers-switch-unchecked');
    await userEvent.click(headersSwitchUnchecked);
    await expectHeaderInputsToExistAndBeEditable(0);
    // Add button should be enabled when both key and value have input
    await expectAddHeadersButton(true, true);
    await expectHeaderInputsToExistAndBeEditable(1);
    // Delete first header
    const headersDeleteButton = screen.getByTestId('headers-delete-button-0');
    await userEvent.click(headersDeleteButton);
    // Expect only one header with value of original second header to remain
    const keyInput = screen.getByTestId('headers-key-0');
    const valueInput = screen.getByTestId('headers-value-0');
    expect(keyInput?.getAttribute('value')).toBe('TestCustomKey-1');
    expect(valueInput?.getAttribute('value')).toBe('TestCustomValue-1');
  });
});
