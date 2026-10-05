/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCallOut, EuiCopy, EuiFieldText, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { getSpaceIdFromPath } from '@kbn/core-spaces-common';
import { buildConnectorPublicKeyUrls } from '@kbn/actions-plugin/common';
import { useKibana } from '../../../common/lib/kibana';

export const ConnectorPublicKeys = ({
  connectorTypeId,
  connectorId,
}: {
  connectorTypeId: string;
  connectorId?: string;
}) => {
  const { http } = useKibana().services;
  const urls = useMemo(() => {
    const { publicBaseUrl } = http.basePath;
    if (!connectorId || !publicBaseUrl) return undefined;
    const { spaceId } = getSpaceIdFromPath(http.basePath.get(), http.basePath.serverBasePath);
    return buildConnectorPublicKeyUrls({ publicBaseUrl, spaceId, connectorTypeId, connectorId });
  }, [http.basePath, connectorTypeId, connectorId]);
  const fields = [
    {
      label: i18n.translate('xpack.triggersActionsUI.publicKeys.issuerLabel', {
        defaultMessage: 'Issuer URL',
      }),
      value: urls?.issuer,
    },
    {
      label: i18n.translate('xpack.triggersActionsUI.publicKeys.jwksLabel', {
        defaultMessage: 'Public key URL (JWKS)',
      }),
      value: urls?.jwksUrl,
    },
    {
      label: i18n.translate('xpack.triggersActionsUI.publicKeys.discoveryLabel', {
        defaultMessage: 'Discovery URL',
      }),
      value: urls?.discoveryUrl,
    },
  ];
  return (
    <>
      <EuiCallOut
        size="s"
        title={i18n.translate('xpack.triggersActionsUI.publicKeys.requiredTitle', {
          defaultMessage: 'Kibana manages the signing key',
        })}
      >
        {i18n.translate('xpack.triggersActionsUI.publicKeys.publishingDescription', {
          defaultMessage:
            'Kibana creates and stores the signing key. Receivers can read its public key without signing in. Save the connector to get its URLs.',
        })}
      </EuiCallOut>
      {fields.map(({ label, value }) =>
        value ? (
          <EuiFormRow key={label} label={label} fullWidth>
            <EuiCopy textToCopy={value}>
              {(copy) => (
                <EuiFieldText
                  fullWidth
                  readOnly
                  value={value}
                  icon={{ type: 'copy', side: 'right', onClick: copy, 'aria-label': label }}
                />
              )}
            </EuiCopy>
          </EuiFormRow>
        ) : null
      )}
      <EuiSpacer size="m" />
    </>
  );
};
