/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiFieldPassword, EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type {
  RemoteElasticsearchConnectionErrors,
  RemoteElasticsearchDestinationFormData,
} from './types';

type ConnectionField = keyof RemoteElasticsearchConnectionErrors;

interface RemoteElasticsearchConnectionFieldsProps {
  endpoint: string;
  apiKey: string;
  errors: RemoteElasticsearchConnectionErrors;
  disabled: boolean;
  onChange: (
    changes: Partial<Pick<RemoteElasticsearchDestinationFormData, ConnectionField>>
  ) => void;
  onBlur: () => void;
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
  endpoint,
  apiKey,
  errors,
  disabled,
  onChange,
  onBlur,
}: RemoteElasticsearchConnectionFieldsProps) => {
  const [touched, setTouched] = useState<ReadonlySet<ConnectionField>>(new Set());

  const onFieldBlur = (field: ConnectionField) => () => {
    setTouched((previous) => new Set(previous).add(field));
    onBlur();
  };

  const endpointError =
    touched.has('endpoint') && errors.endpoint
      ? ENDPOINT_ERROR_MESSAGES[errors.endpoint]
      : undefined;
  const apiKeyError =
    touched.has('apiKey') && errors.apiKey ? API_KEY_REQUIRED_ERROR_MESSAGE : undefined;

  return (
    <>
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
          value={endpoint}
          placeholder={i18n.translate(
            'xpack.streams.destinations.remoteElasticsearch.endpointPlaceholder',
            { defaultMessage: 'https://my-cluster.es.example.com:443' }
          )}
          disabled={disabled}
          isInvalid={Boolean(endpointError)}
          onChange={(event) => onChange({ endpoint: event.target.value })}
          onBlur={onFieldBlur('endpoint')}
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
              'Create it on the remote cluster with write access to the target indices.',
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
          value={apiKey}
          disabled={disabled}
          isInvalid={Boolean(apiKeyError)}
          onChange={(event) => onChange({ apiKey: event.target.value })}
          onBlur={onFieldBlur('apiKey')}
          data-test-subj="streamsCreateDestinationRemoteElasticsearchApiKey"
        />
      </EuiFormRow>
    </>
  );
};
