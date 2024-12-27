/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { I18nProvider } from '@kbn/i18n-react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import React from 'react';

import { AddInferenceFlyoutWrapper } from './add_inference_flyout_wrapper';
import { MockProviders } from '../../../../../../../services/provider.mock';

const mockAddEndpoint = jest.fn();
const mockResendRequest = jest.fn();
const onClose = jest.fn();

jest.mock('../../../../../../hooks/use_add_endpoint', () => ({
  useAddEndpoint: () => ({
    addInferenceEndpoint: mockAddEndpoint.mockImplementation(() => Promise.resolve()),
  }),
}));

jest.mock('../../../../../../hooks/use_providers', () => ({
  useProviders: jest.fn(() => ({
    fetchInferenceServices: jest.fn().mockResolvedValue(MockProviders),
  })),
}));

const MockFormProvider = ({ children }: { children: React.ReactElement }) => {
  const { form } = useForm();
  return (
    <I18nProvider>
      <Form form={form}>{children}</Form>
    </I18nProvider>
  );
};

describe('AddInferenceFlyout', () => {
  beforeEach(async () => {
    jest.clearAllMocks();

    await act(async () => {
      render(
        <MockFormProvider>
          <AddInferenceFlyoutWrapper onFlyoutClose={onClose} resendRequest={mockResendRequest} />
        </MockFormProvider>
      );
    });
  });

  it('renders', async () => {
    expect(screen.getByTestId('create-inference-flyout')).toBeInTheDocument();
    expect(screen.getByTestId('create-inference-flyout-header')).toBeInTheDocument();
    expect(screen.getByTestId('create-inference-flyout-header')).toBeInTheDocument();
    expect(screen.getByTestId('provider-select')).toBeInTheDocument();
    expect(screen.getByTestId('add-inference-endpoint-submit-button')).toBeInTheDocument();
    expect(screen.getByTestId('create-inference-flyout-close-button')).toBeInTheDocument();
  });

  it('invalidates form if no provider is selected', async () => {
    await userEvent.click(screen.getByTestId('add-inference-endpoint-submit-button'));
    expect(screen.getByText('Provider is required.')).toBeInTheDocument();
    expect(mockAddEndpoint).not.toHaveBeenCalled();
    expect(screen.getByTestId('add-inference-endpoint-submit-button')).toBeDisabled();
  });

  it('valid submission', async () => {
    await userEvent.click(screen.getByTestId('provider-select'));
    await userEvent.click(screen.getByText('Anthropic'));
    await userEvent.type(await screen.findByTestId('api_key-password'), 'test api passcode');
    await userEvent.type(
      await screen.findByTestId('model_id-input'),
      'sample model name from Anthropic'
    );

    await userEvent.click(screen.getByTestId('add-inference-endpoint-submit-button'));
    expect(mockAddEndpoint).toHaveBeenCalled();
  }, 10e3);
});
