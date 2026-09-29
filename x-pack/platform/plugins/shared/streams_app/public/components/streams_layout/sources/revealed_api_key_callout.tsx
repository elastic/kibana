/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCopy, EuiFieldPassword, EuiFormAppend, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';

export const RevealedApiKeyCallout = ({ apiKey }: { apiKey: string }) => (
  <EuiFormRow
    fullWidth
    label={i18n.translate('xpack.streams.sources.apiKeyLabel', {
      defaultMessage: 'API key',
    })}
  >
    <KbnWarningCallout
      size="s"
      title={i18n.translate('xpack.streams.sources.copyApiKeyWarningTitle', {
        defaultMessage:
          'Make sure to copy your API key now as you will not be able to see this again',
      })}
    >
      <EuiFieldPassword
        fullWidth
        readOnly
        type="dual"
        value={apiKey}
        data-test-subj="streamsSourceRevealedApiKey"
        aria-label={i18n.translate('xpack.streams.sources.revealedApiKeyAriaLabel', {
          defaultMessage: 'Generated API key',
        })}
        append={
          <EuiCopy textToCopy={apiKey}>
            {(copy) => (
              <EuiFormAppend
                element="button"
                iconLeft="copy"
                onClick={copy}
                data-test-subj="streamsSourceApiKeyCopyButton"
                aria-label={i18n.translate('xpack.streams.sources.copyApiKeyAriaLabel', {
                  defaultMessage: 'Copy API key to clipboard',
                })}
              />
            )}
          </EuiCopy>
        }
      />
    </KbnWarningCallout>
  </EuiFormRow>
);
