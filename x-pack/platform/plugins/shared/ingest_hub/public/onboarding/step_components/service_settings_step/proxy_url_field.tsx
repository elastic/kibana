/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFieldText, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface ProxyUrlFieldProps {
  value: string;
  onChange: (proxyUrl: string) => void;
  /** Validation error, from `getProxyUrlError`. */
  error?: string;
}

/**
 * The proxy the integration uses to reach AWS, as Fleet's Add integration offers it (the AWS
 * package var `proxy_url`). Optional: empty means no proxy.
 */
export function ProxyUrlField({ value, onChange, error }: ProxyUrlFieldProps) {
  return (
    <EuiFormRow
      fullWidth
      label={i18n.translate('xpack.ingestHub.integrationSettings.proxyUrl.label', {
        defaultMessage: 'Proxy URL',
      })}
      helpText={i18n.translate('xpack.ingestHub.integrationSettings.proxyUrl.helpText', {
        defaultMessage: 'URL to proxy connections, in the form {format}.',
        // A value, not part of the message: ICU would parse the angle brackets as tags.
        values: { format: 'http[s]://<user>:<password>@<server name/ip>:<port>' },
      })}
      isInvalid={!!error}
      error={error}
    >
      <EuiFieldText
        fullWidth
        compressed
        value={value}
        onChange={(e) => onChange(e.target.value)}
        isInvalid={!!error}
        placeholder="https://proxy.example.com:8080"
        data-test-subj="sharedSettingsProxyUrl"
      />
    </EuiFormRow>
  );
}
