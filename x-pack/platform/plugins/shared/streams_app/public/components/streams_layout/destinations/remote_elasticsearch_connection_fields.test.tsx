/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RemoteElasticsearchConnectionFields } from './remote_elasticsearch_connection_fields';
import type { RemoteElasticsearchConnectionErrors } from './types';

const ENDPOINT_TEST_SUBJ = 'streamsCreateDestinationRemoteElasticsearchEndpoint';
const API_KEY_TEST_SUBJ = 'streamsCreateDestinationRemoteElasticsearchApiKey';
const API_KEY_VALUE = 'remote-key-value-1';

const renderConnectionFields = ({
  endpoint = '',
  apiKey = '',
  errors = {},
  disabled = false,
}: {
  endpoint?: string;
  apiKey?: string;
  errors?: RemoteElasticsearchConnectionErrors;
  disabled?: boolean;
} = {}) => {
  const onChange = jest.fn();
  const onBlur = jest.fn();
  const result = render(
    <RemoteElasticsearchConnectionFields
      endpoint={endpoint}
      apiKey={apiKey}
      errors={errors}
      disabled={disabled}
      onChange={onChange}
      onBlur={onBlur}
    />
  );
  return { ...result, onChange, onBlur };
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

  it('sends endpoint and API key changes separately', () => {
    const { onChange } = renderConnectionFields();

    fireEvent.change(screen.getByTestId(ENDPOINT_TEST_SUBJ), {
      target: { value: 'https://remote.example.com' },
    });
    expect(onChange).toHaveBeenLastCalledWith({ endpoint: 'https://remote.example.com' });

    fireEvent.change(screen.getByTestId(API_KEY_TEST_SUBJ), { target: { value: API_KEY_VALUE } });
    expect(onChange).toHaveBeenLastCalledWith({ apiKey: API_KEY_VALUE });
  });

  it.each(['\thttps://es.example.com', 'https://es.example.com\f', ' https://es.example.com '])(
    'passes the raw endpoint %j to validation without trimming it',
    (value) => {
      const { onChange } = renderConnectionFields();

      fireEvent.change(screen.getByTestId(ENDPOINT_TEST_SUBJ), { target: { value } });

      expect(onChange).toHaveBeenLastCalledWith({ endpoint: value });
    }
  );

  it.each([
    ['required', 'Enter the endpoint of the remote cluster.'],
    ['invalid', 'Enter a valid https:// URL without credentials, a query, or a fragment.'],
  ] as const)('shows endpoint error %s only after blur', async (error, message) => {
    const { onBlur } = renderConnectionFields({ errors: { endpoint: error, apiKey: 'required' } });

    expect(screen.queryByText(message)).toBeNull();

    await userEvent.click(screen.getByTestId(ENDPOINT_TEST_SUBJ));
    await userEvent.tab();

    expect(onBlur).toHaveBeenCalled();
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(screen.getByTestId(ENDPOINT_TEST_SUBJ)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByText('Enter an API key.')).toBeNull();
  });

  it('shows the API key error only after blur', async () => {
    renderConnectionFields({ errors: { apiKey: 'required' } });

    expect(screen.queryByText('Enter an API key.')).toBeNull();

    await userEvent.click(screen.getByTestId(API_KEY_TEST_SUBJ));
    await userEvent.tab();

    expect(screen.getByText('Enter an API key.')).toBeInTheDocument();
  });
});
