/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { useController } from 'react-hook-form';
import { EuiFieldPassword, EuiFieldText, EuiFormRow, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { DestinationCreationFormData, RemoteElasticsearchConnectionErrors } from './types';

interface RemoteElasticsearchConnectionFieldsProps {
  errors: RemoteElasticsearchConnectionErrors;
  disabled: boolean;
}

const ENDPOINT_ERROR_MESSAGES: Record<
  NonNullable<RemoteElasticsearchConnectionErrors['endpoint']>,
  string
> = {
  required: i18n.translate(
    'xpack.streams.destinations.remoteElasticsearch.endpointRequiredErrorMessage',
    { defaultMessage: 'Enter the endpoint of the remote cluster.' }
  ),
  invalid: i18n.translate(
    'xpack.streams.destinations.remoteElasticsearch.endpointInvalidErrorMessage',
    {
      defaultMessage: 'Enter a valid https:// URL without credentials, a query, or a fragment.',
    }
  ),
};

const API_KEY_REQUIRED_ERROR_MESSAGE = i18n.translate(
  'xpack.streams.destinations.remoteElasticsearch.apiKeyRequiredErrorMessage',
  { defaultMessage: 'Enter an API key.' }
);

export const RemoteElasticsearchConnectionFields = ({
  errors,
  disabled,
}: RemoteElasticsearchConnectionFieldsProps) => {
  const { field: endpointField } = useController<
    DestinationCreationFormData,
    'remoteElasticsearch.endpoint'
  >({ name: 'remoteElasticsearch.endpoint' });
  const { field: apiKeyField } = useController<
    DestinationCreationFormData,
    'remoteElasticsearch.apiKey'
  >({ name: 'remoteElasticsearch.apiKey' });

  const endpointError = errors.endpoint ? ENDPOINT_ERROR_MESSAGES[errors.endpoint] : undefined;
  const apiKeyError = errors.apiKey ? API_KEY_REQUIRED_ERROR_MESSAGE : undefined;

  return (
    <>
      <EuiTitle size="xxs">
        <h3>
          {i18n.translate('xpack.streams.destinations.remoteElasticsearch.connectionTitle', {
            defaultMessage: 'Connection',
          })}
        </h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.streams.destinations.remoteElasticsearch.endpointLabel', {
          defaultMessage: 'Endpoint',
        })}
        isInvalid={Boolean(endpointError)}
        error={endpointError}
      >
        {/* Not type="url", which trims edge tabs and form feeds that validation must reject. */}
        <EuiFieldText
          fullWidth
          inputMode="url"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-required={true}
          autoComplete="off"
          value={endpointField.value}
          inputRef={endpointField.ref}
          placeholder={i18n.translate(
            'xpack.streams.destinations.remoteElasticsearch.endpointPlaceholder',
            { defaultMessage: 'https://my-cluster.es.example.com:443' }
          )}
          disabled={disabled}
          isInvalid={Boolean(endpointError)}
          onChange={endpointField.onChange}
          onBlur={endpointField.onBlur}
          data-test-subj="streamsCreateDestinationRemoteElasticsearchEndpoint"
        />
      </EuiFormRow>
      <EuiFormRow
        fullWidth
        label={i18n.translate('xpack.streams.destinations.remoteElasticsearch.apiKeyLabel', {
          defaultMessage: 'API key',
        })}
        helpText={i18n.translate(
          'xpack.streams.destinations.remoteElasticsearch.apiKeyHelpDescription',
          {
            defaultMessage:
              'Use the Encoded value of an API key created on the remote cluster with write access to the target indices.',
          }
        )}
        isInvalid={Boolean(apiKeyError)}
        error={apiKeyError}
      >
        <EuiFieldPassword
          fullWidth
          type="dual"
          aria-required={true}
          autoComplete="new-password"
          value={apiKeyField.value}
          inputRef={apiKeyField.ref}
          disabled={disabled}
          isInvalid={Boolean(apiKeyError)}
          onChange={apiKeyField.onChange}
          onBlur={apiKeyField.onBlur}
          data-test-subj="streamsCreateDestinationRemoteElasticsearchApiKey"
        />
      </EuiFormRow>
    </>
  );
};
