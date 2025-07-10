/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceServiceFormFields } from './inference_service_form_fields';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { I18nProvider } from '@kbn/i18n-react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';
import { mockProviders } from '../utils/mock_providers';

jest.mock('../hooks/use_providers', () => ({
  useProviders: jest.fn(() => ({
    data: mockProviders,
  })),
}));

const httpMock = httpServiceMock.createStartContract();
const notificationsMock = notificationServiceMock.createStartContract();

const MockFormProvider = ({ children }: { children: React.ReactElement }) => {
  const { form } = useForm();

  return (
    <I18nProvider>
      <Form form={form}>{children}</Form>
    </I18nProvider>
  );
};

describe('Inference Services', () => {
  it('renders', () => {
    render(
      <MockFormProvider>
        <InferenceServiceFormFields http={httpMock} toasts={notificationsMock.toasts} />
      </MockFormProvider>
    );

    expect(screen.getByTestId('provider-select')).toBeInTheDocument();
  });

  it('renders Selectable', async () => {
    render(
      <MockFormProvider>
        <InferenceServiceFormFields http={httpMock} toasts={notificationsMock.toasts} />
      </MockFormProvider>
    );

    await userEvent.click(screen.getByTestId('provider-select'));
    expect(screen.getByTestId('euiSelectableList')).toBeInTheDocument();
  });

  it('renders Elastic at top', async () => {
    render(
      <MockFormProvider>
        <InferenceServiceFormFields http={httpMock} toasts={notificationsMock.toasts} />
      </MockFormProvider>
    );

    await userEvent.click(screen.getByTestId('provider-select'));
    const listItems = screen.getAllByTestId('provider');
    expect(listItems[0]).toHaveTextContent('Elastic');
  });

  it('renders selected provider fields - hugging_face', async () => {
    render(
      <MockFormProvider>
        <InferenceServiceFormFields http={httpMock} toasts={notificationsMock.toasts} />
      </MockFormProvider>
    );

    await userEvent.click(screen.getByTestId('provider-select'));
    await userEvent.click(screen.getByText('Hugging Face'));

    expect(screen.getByTestId('provider-select')).toHaveValue('Hugging Face');
    expect(screen.getByTestId('api_key-password')).toBeInTheDocument();
    expect(screen.getByTestId('url-input')).toBeInTheDocument();
    expect(screen.getByTestId('taskTypeSelect')).toBeInTheDocument();
    expect(screen.getByTestId('inference-endpoint-input-field')).toBeInTheDocument();
    expect(screen.queryByTestId('inference-endpoint-input-field')).toHaveDisplayValue(
      /hugging_face-text_embedding/
    );
  });

  it('re-renders fields when selected to anthropic from hugging_face', async () => {
    render(
      <MockFormProvider>
        <InferenceServiceFormFields http={httpMock} toasts={notificationsMock.toasts} />
      </MockFormProvider>
    );

    await userEvent.click(screen.getByTestId('provider-select'));
    await userEvent.click(screen.getByText('Hugging Face'));
    expect(screen.getByTestId('provider-select')).toHaveValue('Hugging Face');

    await userEvent.click(screen.getByTestId('provider-select'));
    await userEvent.click(screen.getByText('Anthropic'));

    expect(screen.getByTestId('provider-select')).toHaveValue('Anthropic');
    expect(screen.getByTestId('api_key-password')).toBeInTheDocument();
    expect(screen.getByTestId('model_id-input')).toBeInTheDocument();
    expect(screen.getByTestId('taskTypeSelectSingle')).toBeInTheDocument();
    expect(screen.getByTestId('inference-endpoint-input-field')).toBeInTheDocument();
    expect(screen.queryByTestId('inference-endpoint-input-field')).toHaveDisplayValue(
      /anthropic-completion/
    );
  });
});
