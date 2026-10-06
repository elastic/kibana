/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';

import { AwsStaticKeysForm } from './aws_static_keys_form';
import { AwsTemporaryKeysForm } from './aws_temporary_keys_form';

describe('AwsStaticKeysForm stored secrets', () => {
  it('is not ready and shows inputs when nothing is stored', () => {
    const onReadyChange = jest.fn();
    renderWithI18n(<AwsStaticKeysForm onReadyChange={onReadyChange} />);

    expect(
      screen.queryByTestId('awsStaticKeysForm-secretAccessKey-stored')
    ).not.toBeInTheDocument();
    expect(onReadyChange).toHaveBeenLastCalledWith(false);
  });

  it('shows a stored placeholder and is ready when every field is stored', () => {
    const onReadyChange = jest.fn();
    renderWithI18n(
      <AwsStaticKeysForm
        storedSecretFields={['access_key_id', 'secret_access_key']}
        onReadyChange={onReadyChange}
      />
    );

    expect(screen.getByTestId('awsStaticKeysForm-accessKeyId-stored')).toBeInTheDocument();
    expect(screen.getByTestId('awsStaticKeysForm-secretAccessKey-stored')).toBeInTheDocument();
    expect(onReadyChange).toHaveBeenLastCalledWith(true);
  });

  it('only stores the listed field; the other one still has to be filled in', () => {
    const onReadyChange = jest.fn();
    renderWithI18n(
      <AwsStaticKeysForm storedSecretFields={['secret_access_key']} onReadyChange={onReadyChange} />
    );

    expect(screen.queryByTestId('awsStaticKeysForm-accessKeyId-stored')).not.toBeInTheDocument();
    expect(onReadyChange).toHaveBeenLastCalledWith(false);

    fireEvent.change(screen.getByTestId('awsStaticKeysForm-accessKeyId'), {
      target: { value: 'AKIA' },
    });
    expect(onReadyChange).toHaveBeenLastCalledWith(true);
  });

  it('reports a kept stored field as an empty string', () => {
    const onFieldsChange = jest.fn();
    renderWithI18n(
      <AwsStaticKeysForm
        storedSecretFields={['secret_access_key']}
        onFieldsChange={onFieldsChange}
      />
    );

    fireEvent.change(screen.getByTestId('awsStaticKeysForm-accessKeyId'), {
      target: { value: 'AKIA' },
    });
    expect(onFieldsChange).toHaveBeenLastCalledWith({
      access_key_id: 'AKIA',
      secret_access_key: '',
    });
  });

  it('Replace shows the input and requires a new value', () => {
    const onReadyChange = jest.fn();
    renderWithI18n(
      <AwsStaticKeysForm
        storedSecretFields={['access_key_id', 'secret_access_key']}
        onReadyChange={onReadyChange}
      />
    );

    fireEvent.click(screen.getByTestId('awsStaticKeysForm-secretAccessKey-replace'));

    expect(
      screen.queryByTestId('awsStaticKeysForm-secretAccessKey-stored')
    ).not.toBeInTheDocument();
    expect(onReadyChange).toHaveBeenLastCalledWith(false);

    fireEvent.change(screen.getByTestId('awsStaticKeysForm-secretAccessKey'), {
      target: { value: 'new-secret' },
    });
    expect(onReadyChange).toHaveBeenLastCalledWith(true);
  });
});

describe('AwsTemporaryKeysForm stored secrets', () => {
  it('is ready when all three fields are stored and not ready after replacing one', () => {
    const onReadyChange = jest.fn();
    renderWithI18n(
      <AwsTemporaryKeysForm
        storedSecretFields={['access_key_id', 'secret_access_key', 'session_token']}
        onReadyChange={onReadyChange}
      />
    );
    expect(onReadyChange).toHaveBeenLastCalledWith(true);

    fireEvent.click(screen.getByTestId('awsTemporaryKeysForm-sessionToken-replace'));
    expect(onReadyChange).toHaveBeenLastCalledWith(false);

    fireEvent.change(screen.getByTestId('awsTemporaryKeysForm-sessionToken'), {
      target: { value: 'token' },
    });
    expect(onReadyChange).toHaveBeenLastCalledWith(true);
  });
});
