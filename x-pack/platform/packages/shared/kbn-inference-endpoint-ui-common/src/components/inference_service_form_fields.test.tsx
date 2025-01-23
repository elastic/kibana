/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { InferenceServiceFormFields } from './inference_service_form_fields';
import { FieldType, InferenceProvider } from '../types/types';
import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Form, useForm } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { I18nProvider } from '@kbn/i18n-react';
import { httpServiceMock } from '@kbn/core-http-browser-mocks';
import { notificationServiceMock } from '@kbn/core-notifications-browser-mocks';

const mockProviders = [
  {
    service: 'hugging_face',
    name: 'Hugging Face',
    task_types: ['text_embedding', 'sparse_embedding'],
    configurations: {
      api_key: {
        default_value: null,
        description: `API Key for the provider you're connecting to.`,
        label: 'API Key',
        required: true,
        sensitive: true,
        updatable: true,
        type: FieldType.STRING,
        supported_task_types: ['text_embedding', 'sparse_embedding'],
      },
      'rate_limit.requests_per_minute': {
        default_value: null,
        description: 'Minimize the number of rate limit errors.',
        label: 'Rate Limit',
        required: false,
        sensitive: false,
        updatable: true,
        type: FieldType.INTEGER,
        supported_task_types: ['text_embedding', 'sparse_embedding'],
      },
      url: {
        default_value: 'https://api.openai.com/v1/embeddings',
        description: 'The URL endpoint to use for the requests.',
        label: 'URL',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
        supported_task_types: ['text_embedding', 'sparse_embedding'],
      },
    },
  },
  {
    service: 'cohere',
    name: 'Cohere',
    task_types: ['text_embedding', 'rerank', 'completion'],
    configurations: {
      api_key: {
        default_value: null,
        description: `API Key for the provider you're connecting to.`,
        label: 'API Key',
        required: true,
        sensitive: true,
        updatable: true,
        type: FieldType.STRING,
        supported_task_types: ['text_embedding', 'rerank', 'completion'],
      },
      'rate_limit.requests_per_minute': {
        default_value: null,
        description: 'Minimize the number of rate limit errors.',
        label: 'Rate Limit',
        required: false,
        sensitive: false,
        updatable: true,
        type: FieldType.INTEGER,
        supported_task_types: ['text_embedding', 'completion'],
      },
    },
  },
  {
    service: 'anthropic',
    name: 'Anthropic',
    task_types: ['completion'],
    configurations: {
      api_key: {
        default_value: null,
        description: `API Key for the provider you're connecting to.`,
        label: 'API Key',
        required: true,
        sensitive: true,
        updatable: true,
        type: FieldType.STRING,
        supported_task_types: ['completion'],
      },
      'rate_limit.requests_per_minute': {
        default_value: null,
        description:
          'By default, the anthropic service sets the number of requests allowed per minute to 50.',
        label: 'Rate Limit',
        required: false,
        sensitive: false,
        updatable: true,
        type: FieldType.INTEGER,
        supported_task_types: ['completion'],
      },
      model_id: {
        default_value: null,
        description: 'The name of the model to use for the inference task.',
        label: 'Model ID',
        required: true,
        sensitive: false,
        updatable: true,
        type: FieldType.STRING,
        supported_task_types: ['completion'],
      },
    },
  },
] as InferenceProvider[];

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
