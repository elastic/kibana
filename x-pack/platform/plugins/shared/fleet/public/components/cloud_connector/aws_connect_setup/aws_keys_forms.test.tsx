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

  it('a field that is not stored still has to be filled in', () => {
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

  it('Replace on one field replaces the whole set and every field then needs a new value', () => {
    const onReadyChange = jest.fn();
    renderWithI18n(
      <AwsStaticKeysForm
        storedSecretFields={['access_key_id', 'secret_access_key']}
        onReadyChange={onReadyChange}
      />
    );

    fireEvent.click(screen.getByTestId('awsStaticKeysForm-secretAccessKey-replace'));

    // Both inputs are shown: a new secret only works with its own access key id.
    expect(screen.queryByTestId('awsStaticKeysForm-accessKeyId-stored')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('awsStaticKeysForm-secretAccessKey-stored')
    ).not.toBeInTheDocument();
    expect(onReadyChange).toHaveBeenLastCalledWith(false);

    fireEvent.change(screen.getByTestId('awsStaticKeysForm-secretAccessKey'), {
      target: { value: 'new-secret' },
    });
    expect(onReadyChange).toHaveBeenLastCalledWith(false);
    fireEvent.change(screen.getByTestId('awsStaticKeysForm-accessKeyId'), {
      target: { value: 'new-key' },
    });
    expect(onReadyChange).toHaveBeenLastCalledWith(true);
  });

  it('reports the replaced set and nothing while the stored one is kept', () => {
    const onFieldsChange = jest.fn();
    renderWithI18n(
      <AwsStaticKeysForm
        storedSecretFields={['access_key_id', 'secret_access_key']}
        onFieldsChange={onFieldsChange}
      />
    );
    expect(onFieldsChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId('awsStaticKeysForm-accessKeyId-replace'));
    fireEvent.change(screen.getByTestId('awsStaticKeysForm-accessKeyId'), {
      target: { value: 'new-key' },
    });
    fireEvent.change(screen.getByTestId('awsStaticKeysForm-secretAccessKey'), {
      target: { value: 'new-secret' },
    });
    expect(onFieldsChange).toHaveBeenLastCalledWith({
      access_key_id: 'new-key',
      secret_access_key: 'new-secret',
    });
  });

  describe('keeping the stored secrets after Replace', () => {
    it('offers a way back only after Replace, and it restores the stored placeholders', () => {
      const onReadyChange = jest.fn();
      const onFieldsChange = jest.fn();
      renderWithI18n(
        <AwsStaticKeysForm
          storedSecretFields={['access_key_id', 'secret_access_key']}
          onReadyChange={onReadyChange}
          onFieldsChange={onFieldsChange}
        />
      );
      expect(screen.queryByTestId('awsStaticKeysForm-cancelReplace')).not.toBeInTheDocument();

      fireEvent.click(screen.getByTestId('awsStaticKeysForm-secretAccessKey-replace'));
      fireEvent.change(screen.getByTestId('awsStaticKeysForm-accessKeyId'), {
        target: { value: 'typed-key' },
      });
      expect(onReadyChange).toHaveBeenLastCalledWith(false);

      fireEvent.click(screen.getByTestId('awsStaticKeysForm-cancelReplace'));

      expect(screen.getByTestId('awsStaticKeysForm-accessKeyId-stored')).toBeInTheDocument();
      expect(screen.getByTestId('awsStaticKeysForm-secretAccessKey-stored')).toBeInTheDocument();
      expect(screen.queryByTestId('awsStaticKeysForm-cancelReplace')).not.toBeInTheDocument();
      // Ready again without typing, and nothing entered is reported any more.
      expect(onReadyChange).toHaveBeenLastCalledWith(true);
      expect(onFieldsChange).toHaveBeenLastCalledWith(undefined);
    });

    it('does not bring back what was typed before cancelling', () => {
      renderWithI18n(
        <AwsStaticKeysForm storedSecretFields={['access_key_id', 'secret_access_key']} />
      );
      fireEvent.click(screen.getByTestId('awsStaticKeysForm-accessKeyId-replace'));
      fireEvent.change(screen.getByTestId('awsStaticKeysForm-accessKeyId'), {
        target: { value: 'typed-key' },
      });
      fireEvent.click(screen.getByTestId('awsStaticKeysForm-cancelReplace'));
      fireEvent.click(screen.getByTestId('awsStaticKeysForm-accessKeyId-replace'));
      expect(screen.getByTestId('awsStaticKeysForm-accessKeyId')).toHaveValue('');
    });

    it('keeps reporting what is still typed in a field that is not stored', () => {
      const onReadyChange = jest.fn();
      const onFieldsChange = jest.fn();
      // Only the secret access key is stored; the access key id is a plain field.
      renderWithI18n(
        <AwsStaticKeysForm
          storedSecretFields={['secret_access_key']}
          onReadyChange={onReadyChange}
          onFieldsChange={onFieldsChange}
        />
      );
      fireEvent.change(screen.getByTestId('awsStaticKeysForm-accessKeyId'), {
        target: { value: 'typed-key' },
      });
      fireEvent.click(screen.getByTestId('awsStaticKeysForm-secretAccessKey-replace'));
      fireEvent.click(screen.getByTestId('awsStaticKeysForm-cancelReplace'));

      expect(screen.getByTestId('awsStaticKeysForm-secretAccessKey-stored')).toBeInTheDocument();
      expect(screen.getByTestId('awsStaticKeysForm-accessKeyId')).toHaveValue('typed-key');
      expect(onReadyChange).toHaveBeenLastCalledWith(true);
      // The typed access key id is still part of what is entered.
      expect(onFieldsChange).toHaveBeenLastCalledWith({
        access_key_id: 'typed-key',
        secret_access_key: '',
      });
    });

    it('has nothing to cancel when no secret is stored', () => {
      renderWithI18n(<AwsStaticKeysForm />);
      expect(screen.queryByTestId('awsStaticKeysForm-cancelReplace')).not.toBeInTheDocument();
    });
  });
});

describe('AwsStaticKeysForm stored secrets with values kept in memory', () => {
  const STAGED = { access_key_id: 'staged-key', secret_access_key: '' };

  it('starts as replaced, keeping the value, when a stored field already has one', () => {
    const onReadyChange = jest.fn();
    renderWithI18n(
      <AwsStaticKeysForm
        initialValues={STAGED}
        storedSecretFields={['access_key_id', 'secret_access_key']}
        onReadyChange={onReadyChange}
      />
    );
    expect(screen.queryByTestId('awsStaticKeysForm-accessKeyId-stored')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('awsStaticKeysForm-secretAccessKey-stored')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('awsStaticKeysForm-accessKeyId')).toHaveValue('staged-key');
    expect(screen.getByTestId('awsStaticKeysForm-cancelReplace')).toBeInTheDocument();
    // The secret still has to be entered with it.
    expect(onReadyChange).toHaveBeenLastCalledWith(false);
  });

  it('keeps an earlier entry when the rest is entered after a remount', () => {
    const onFieldsChange = jest.fn();
    renderWithI18n(
      <AwsStaticKeysForm
        initialValues={STAGED}
        storedSecretFields={['access_key_id', 'secret_access_key']}
        onFieldsChange={onFieldsChange}
      />
    );
    fireEvent.change(screen.getByTestId('awsStaticKeysForm-secretAccessKey'), {
      target: { value: 'new-secret' },
    });
    expect(onFieldsChange).toHaveBeenLastCalledWith({
      access_key_id: 'staged-key',
      secret_access_key: 'new-secret',
    });
  });

  it('still seeds fields that are not stored', () => {
    renderWithI18n(
      <AwsStaticKeysForm initialValues={STAGED} storedSecretFields={['secret_access_key']} />
    );
    expect(screen.getByTestId('awsStaticKeysForm-accessKeyId')).toHaveValue('staged-key');
  });
});

describe('AwsTemporaryKeysForm stored secrets', () => {
  it('replaces all three fields together and needs a value for each', () => {
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
    expect(screen.getByTestId('awsTemporaryKeysForm-accessKeyId')).toBeInTheDocument();
    expect(screen.getByTestId('awsTemporaryKeysForm-secretAccessKey')).toBeInTheDocument();

    fireEvent.change(screen.getByTestId('awsTemporaryKeysForm-sessionToken'), {
      target: { value: 'token' },
    });
    fireEvent.change(screen.getByTestId('awsTemporaryKeysForm-accessKeyId'), {
      target: { value: 'key' },
    });
    expect(onReadyChange).toHaveBeenLastCalledWith(false);
    fireEvent.change(screen.getByTestId('awsTemporaryKeysForm-secretAccessKey'), {
      target: { value: 'secret' },
    });
    expect(onReadyChange).toHaveBeenLastCalledWith(true);
  });

  it('can go back to the stored secrets after Replace', () => {
    const onReadyChange = jest.fn();
    renderWithI18n(
      <AwsTemporaryKeysForm
        storedSecretFields={['access_key_id', 'secret_access_key', 'session_token']}
        onReadyChange={onReadyChange}
      />
    );
    fireEvent.click(screen.getByTestId('awsTemporaryKeysForm-accessKeyId-replace'));
    fireEvent.click(screen.getByTestId('awsTemporaryKeysForm-cancelReplace'));
    expect(screen.getByTestId('awsTemporaryKeysForm-sessionToken-stored')).toBeInTheDocument();
    expect(onReadyChange).toHaveBeenLastCalledWith(true);
  });
});
