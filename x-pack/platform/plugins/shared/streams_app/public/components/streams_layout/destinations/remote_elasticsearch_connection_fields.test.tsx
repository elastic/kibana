/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { FormProvider, useForm, type UseFormReturn } from 'react-hook-form';
import { fireEvent, render, screen } from '@testing-library/react';
import { RemoteElasticsearchConnectionFields } from './remote_elasticsearch_connection_fields';
import {
  EMPTY_DESTINATION_CREATION_FORM,
  type DestinationCreationFormData,
  type RemoteElasticsearchConnectionErrors,
} from './types';

const ENDPOINT_TEST_SUBJ = 'streamsCreateDestinationRemoteElasticsearchEndpoint';
const API_KEY_TEST_SUBJ = 'streamsCreateDestinationRemoteElasticsearchApiKey';
const API_KEY_VALUE = 'remote-key-value-1';

const renderConnectionFields = ({
  apiKey = '',
  errors = {},
}: {
  apiKey?: string;
  errors?: RemoteElasticsearchConnectionErrors;
} = {}) => {
  let methods: UseFormReturn<DestinationCreationFormData> | undefined;
  const Harness = () => {
    methods = useForm<DestinationCreationFormData>({
      defaultValues: {
        ...EMPTY_DESTINATION_CREATION_FORM,
        storageKind: 'remote_elasticsearch',
        remoteElasticsearch: { ...EMPTY_DESTINATION_CREATION_FORM.remoteElasticsearch, apiKey },
      },
    });
    return (
      <FormProvider {...methods}>
        <RemoteElasticsearchConnectionFields errors={errors} disabled={false} />
      </FormProvider>
    );
  };
  const result = render(<Harness />);
  const getValues = () => {
    if (!methods) {
      throw new Error('Expected the form to be rendered');
    }
    return methods.getValues('remoteElasticsearch');
  };
  return { ...result, getValues };
};

describe('RemoteElasticsearchConnectionFields', () => {
  it('renders API key as a password field and never echoes it in text', () => {
    const { container } = renderConnectionFields({ apiKey: API_KEY_VALUE });

    const apiKeyField = screen.getByTestId(API_KEY_TEST_SUBJ);
    expect(apiKeyField).toHaveAttribute('type', 'password');
    expect(apiKeyField).toHaveAttribute('autocomplete', 'new-password');
    expect(apiKeyField).toHaveValue(API_KEY_VALUE);
    expect(container.textContent).not.toContain(API_KEY_VALUE);

    const withoutFieldValue = container.cloneNode(true) as HTMLElement;
    withoutFieldValue
      .querySelector(`[data-test-subj="${API_KEY_TEST_SUBJ}"]`)
      ?.removeAttribute('value');
    expect(withoutFieldValue.innerHTML).not.toContain(API_KEY_VALUE);
  });

  it('writes endpoint and API key into the form', () => {
    const { getValues } = renderConnectionFields();

    fireEvent.change(screen.getByTestId(ENDPOINT_TEST_SUBJ), {
      target: { value: 'https://remote.example.com' },
    });
    fireEvent.change(screen.getByTestId(API_KEY_TEST_SUBJ), { target: { value: API_KEY_VALUE } });

    expect(getValues()).toMatchObject({
      endpoint: 'https://remote.example.com',
      apiKey: API_KEY_VALUE,
    });
  });

  it.each(['\thttps://es.example.com', 'https://es.example.com\f', ' https://es.example.com '])(
    'keeps the raw endpoint %j for validation without trimming it',
    (value) => {
      const { getValues } = renderConnectionFields();

      fireEvent.change(screen.getByTestId(ENDPOINT_TEST_SUBJ), { target: { value } });

      expect(getValues().endpoint).toBe(value);
    }
  );

  it.each([
    ['required', 'Enter the endpoint of the remote cluster.'],
    ['invalid', 'Enter a valid https:// URL without credentials, a query, or a fragment.'],
  ] as const)('shows the endpoint error %s it is given', (error, message) => {
    renderConnectionFields({ errors: { endpoint: error } });

    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByTestId(ENDPOINT_TEST_SUBJ)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText('Enter an API key.')).toBeNull();
  });

  it('shows the API key error it is given', () => {
    renderConnectionFields({ errors: { apiKey: 'required' } });

    expect(screen.getByText('Enter an API key.')).toBeInTheDocument();
  });
});
