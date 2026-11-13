/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCodeBlock, EuiCopy, EuiFieldText, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnSuccessCallout, KbnWarningCallout } from '@kbn/ui-callout';
import type { CreatedImport } from './create_import';

const CopyableField = ({
  label,
  value,
  'data-test-subj': dataTestSubj,
}: {
  label: string;
  value: string;
  'data-test-subj': string;
}) => {
  const copyLabel = i18n.translate('xpack.alertingV2.imports.credentials.copy', {
    defaultMessage: 'Copy {label}',
    values: { label },
  });
  return (
    <EuiFormRow label={label} fullWidth>
      <EuiCopy
        textToCopy={value}
        beforeMessage={copyLabel}
        tooltipProps={{ disableScreenReaderOutput: true, anchorClassName: 'eui-displayBlock' }}
      >
        {(copy) => (
          <EuiFieldText
            readOnly
            fullWidth
            value={value}
            data-test-subj={dataTestSubj}
            icon={{ type: 'copy', side: 'right', onClick: copy, 'aria-label': copyLabel }}
          />
        )}
      </EuiCopy>
    </EuiFormRow>
  );
};

/** Nests the value under a dotted path, so `labels.env` becomes `{ labels: { env: value } }`. */
const nestUnderPath = (path: string, value: string): Record<string, unknown> =>
  path.split('.').reduceRight<unknown>((nested, key) => ({ [key]: nested }), value) as Record<
    string,
    unknown
  >;

const buildCurlExample = ({ url, token }: CreatedImport, fingerprintField: string): string => {
  const payload = {
    ...(fingerprintField !== '' ? nestUnderPath(fingerprintField, 'web-1') : {}),
    title: 'Disk almost full',
    message: 'Disk usage above 90%',
  };
  return [
    `curl -X POST '${url}' \\`,
    `  -H 'Authorization: Bearer ${token}' \\`,
    `  -H 'Content-Type: application/json' \\`,
    `  -d '${JSON.stringify(payload)}'`,
  ].join('\n');
};

/** The webhook URL and the one-time ingest token of a newly created import. */
export const ImportCredentials = ({
  name,
  created,
  fingerprintField,
}: {
  name: string;
  created: CreatedImport;
  fingerprintField: string;
}) => (
  <div data-test-subj="importCredentials">
    <KbnSuccessCallout
      announceOnMount
      size="s"
      title={i18n.translate('xpack.alertingV2.imports.credentials.successTitle', {
        defaultMessage: '{name} is ready to receive alerts',
        values: { name },
      })}
    />
    <EuiSpacer size="m" />
    <KbnWarningCallout
      size="s"
      title={i18n.translate('xpack.alertingV2.imports.credentials.copyTokenTitle', {
        defaultMessage: 'Copy the token now',
      })}
    >
      <FormattedMessage
        id="xpack.alertingV2.imports.credentials.copyTokenBody"
        defaultMessage="It is shown only once. Send it as an Authorization header with every request."
      />
    </KbnWarningCallout>
    {!created.isPublicBaseUrlConfigured && (
      <>
        <EuiSpacer size="m" />
        <KbnWarningCallout
          size="s"
          data-test-subj="importCredentialsPublicBaseUrlMissing"
          title={i18n.translate('xpack.alertingV2.imports.credentials.publicBaseUrlMissingTitle', {
            defaultMessage: 'server.publicBaseUrl is not set',
          })}
        >
          <FormattedMessage
            id="xpack.alertingV2.imports.credentials.publicBaseUrlMissingBody"
            defaultMessage="The URL uses this browser's address, which other systems may not reach. Set server.publicBaseUrl to the address they use."
          />
        </KbnWarningCallout>
      </>
    )}
    <EuiSpacer size="m" />
    <CopyableField
      label={i18n.translate('xpack.alertingV2.imports.credentials.urlLabel', {
        defaultMessage: 'Webhook URL',
      })}
      value={created.url}
      data-test-subj="importCredentialsUrl"
    />
    <CopyableField
      label={i18n.translate('xpack.alertingV2.imports.credentials.tokenLabel', {
        defaultMessage: 'Token',
      })}
      value={created.token}
      data-test-subj="importCredentialsToken"
    />
    <EuiSpacer size="m" />
    <EuiFormRow
      fullWidth
      label={i18n.translate('xpack.alertingV2.imports.credentials.exampleLabel', {
        defaultMessage: 'Example request',
      })}
    >
      <EuiCodeBlock language="bash" isCopyable fontSize="s" paddingSize="m">
        {buildCurlExample(created, fingerprintField)}
      </EuiCodeBlock>
    </EuiFormRow>
  </div>
);
