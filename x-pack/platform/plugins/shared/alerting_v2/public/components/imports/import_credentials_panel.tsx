/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { CopyableField } from './copyable_field';
import { buildCurlExample } from './build_curl_example';

interface ImportCredentialsPanelProps {
  url: string;
  /** The ingest token. It is shown once, so a panel for an existing import has none to show. */
  token?: string;
  publicBaseUrlConfigured: boolean;
  fingerprintField?: string;
  /** Replaces the generic example body in the curl command. */
  examplePayload?: Record<string, unknown>;
  /** Where to paste the URL, for imports on a vendor connector. */
  hint?: React.ReactNode;
  /** Offered instead of the token when there is none to show. */
  rotateAction?: React.ReactNode;
}

/**
 * POC: the webhook URL and, right after a create or a token rotation, the token. The token cannot
 * be read again, so the panel without one explains how to get a new one.
 */
export const ImportCredentialsPanel = ({
  url,
  token,
  publicBaseUrlConfigured,
  fingerprintField,
  examplePayload,
  hint,
  rotateAction,
}: ImportCredentialsPanelProps) => (
  <div data-test-subj="importsCredentials">
    {token !== undefined && (
      <>
        <KbnWarningCallout
          announceOnMount
          size="s"
          data-test-subj="importsCredentialsTokenWarning"
          title={i18n.translate('xpack.alertingV2.imports.credentials.copyTokenTitle', {
            defaultMessage: 'Copy your token now, it is shown only once',
          })}
          text={i18n.translate('xpack.alertingV2.imports.credentials.copyTokenBody', {
            defaultMessage:
              'The token authenticates every request to the webhook. If you lose it, rotate the token from the import details.',
          })}
        />
        <EuiSpacer size="m" />
      </>
    )}

    {!publicBaseUrlConfigured && (
      <>
        <KbnWarningCallout
          announceOnMount
          size="s"
          data-test-subj="importsCredentialsPublicBaseUrlWarning"
          title={i18n.translate('xpack.alertingV2.imports.credentials.publicBaseUrlTitle', {
            defaultMessage: 'server.publicBaseUrl is not set',
          })}
          text={i18n.translate('xpack.alertingV2.imports.credentials.publicBaseUrlBody', {
            defaultMessage:
              'This URL is a best guess from the server address and may not be reachable from your source system. Set server.publicBaseUrl to show the public address.',
          })}
        />
        <EuiSpacer size="m" />
      </>
    )}

    {hint && (
      <>
        <EuiText size="s" data-test-subj="importsCredentialsHint">
          {hint}
        </EuiText>
        <EuiSpacer size="m" />
      </>
    )}

    <CopyableField
      label={i18n.translate('xpack.alertingV2.imports.credentials.urlLabel', {
        defaultMessage: 'Webhook URL',
      })}
      value={url}
      helpText={i18n.translate('xpack.alertingV2.imports.credentials.urlHelp', {
        defaultMessage: 'Send a JSON POST request to this URL.',
      })}
      copyAriaLabel={i18n.translate('xpack.alertingV2.imports.credentials.copyUrlAriaLabel', {
        defaultMessage: 'Copy webhook URL',
      })}
      data-test-subj="importsCredentialsUrl"
    />

    {token !== undefined ? (
      <>
        <CopyableField
          label={i18n.translate('xpack.alertingV2.imports.credentials.tokenLabel', {
            defaultMessage: 'Token',
          })}
          value={token}
          helpText={i18n.translate('xpack.alertingV2.imports.credentials.tokenHelp', {
            defaultMessage: 'Send it as an Authorization: Bearer header.',
          })}
          copyAriaLabel={i18n.translate('xpack.alertingV2.imports.credentials.copyTokenAriaLabel', {
            defaultMessage: 'Copy token',
          })}
          data-test-subj="importsCredentialsToken"
        />

        <EuiSpacer size="s" />
        <EuiFormRow
          label={i18n.translate('xpack.alertingV2.imports.credentials.exampleLabel', {
            defaultMessage: 'Example request',
          })}
          fullWidth
        >
          <EuiCodeBlock
            language="bash"
            fontSize="s"
            paddingSize="m"
            isCopyable
            overflowHeight={200}
            data-test-subj="importsCredentialsCurl"
          >
            {buildCurlExample({ url, token, fingerprintField, payload: examplePayload })}
          </EuiCodeBlock>
        </EuiFormRow>
        {examplePayload === undefined && (
          <EuiText size="xs" color="subdued">
            <p>
              <FormattedMessage
                id="xpack.alertingV2.imports.credentials.exampleHelp"
                defaultMessage="The whole JSON body becomes the data of the alert."
              />
            </p>
          </EuiText>
        )}
      </>
    ) : (
      rotateAction && (
        <>
          <EuiSpacer size="s" />
          <div data-test-subj="importsCredentialsNoToken">{rotateAction}</div>
        </>
      )
    )}
  </div>
);
