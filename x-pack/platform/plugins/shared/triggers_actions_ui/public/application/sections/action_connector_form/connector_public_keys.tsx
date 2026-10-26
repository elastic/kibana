/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useMemo, useState } from 'react';
import { EuiCallOut, EuiCopy, EuiFieldText, EuiFormRow, EuiSpacer } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { buildPath } from '@kbn/core-http-browser';
import { DEFAULT_SPACE_ID, getSpaceIdFromPath } from '@kbn/core-spaces-common';
import {
  buildConnectorPublicKeyUrls,
  CONNECTOR_PUBLIC_KEYS_API_PATH,
  SSF_DISCOVERY_PATH_PREFIX,
} from '@kbn/actions-plugin/common';
import { useKibana } from '../../../common/lib/kibana';

export const ConnectorPublicKeys = ({
  connectorTypeId,
  connectorId,
}: {
  connectorTypeId: string;
  connectorId?: string;
}) => {
  const { http } = useKibana().services;
  const { spaceId } = getSpaceIdFromPath(http.basePath.get(), http.basePath.serverBasePath);
  const urls = useMemo(() => {
    const { publicBaseUrl } = http.basePath;
    if (!connectorId || !publicBaseUrl) return undefined;
    return buildConnectorPublicKeyUrls({ publicBaseUrl, spaceId, connectorTypeId, connectorId });
  }, [http.basePath, spaceId, connectorTypeId, connectorId]);
  const [discovery, setDiscovery] = useState<{ issuer: string } | 'missing'>();
  useEffect(() => {
    if (!connectorId) return;
    let isMounted = true;
    // Signed tokens use the issuer stored with the key, which can differ from the current origin.
    const spacePath = spaceId === DEFAULT_SPACE_ID ? '' : '/s/{space_id}';
    http
      .get<{ issuer: string }>(
        buildPath(
          `${http.basePath.serverBasePath}${SSF_DISCOVERY_PATH_PREFIX}${spacePath}${CONNECTOR_PUBLIC_KEYS_API_PATH}`,
          { space_id: spaceId, connector_type_id: connectorTypeId, connector_id: connectorId }
        ),
        { prependBasePath: false }
      )
      .then(
        ({ issuer }) => isMounted && setDiscovery({ issuer }),
        () => isMounted && setDiscovery('missing')
      );
    return () => {
      isMounted = false;
    };
  }, [http, spaceId, connectorTypeId, connectorId]);
  const issuer = discovery !== 'missing' ? discovery?.issuer : undefined;
  const fields = [
    {
      label: i18n.translate('xpack.triggersActionsUI.publicKeys.issuerLabel', {
        defaultMessage: 'Issuer URL',
      }),
      value: issuer,
    },
    {
      label: i18n.translate('xpack.triggersActionsUI.publicKeys.jwksLabel', {
        defaultMessage: 'Public key URL (JWKS)',
      }),
      value: issuer && urls?.jwksUrl,
    },
    {
      label: i18n.translate('xpack.triggersActionsUI.publicKeys.discoveryLabel', {
        defaultMessage: 'Discovery URL',
      }),
      value: issuer && urls?.discoveryUrl,
    },
  ];
  return (
    <>
      {!connectorId && (
        <EuiCallOut
          announceOnMount
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
      )}
      {discovery === 'missing' && (
        <KbnWarningCallout
          announceOnMount
          size="s"
          data-test-subj="connectorPublicKeysMissing"
          title={i18n.translate('xpack.triggersActionsUI.publicKeys.missingTitle', {
            defaultMessage: 'This connector has no signing key',
          })}
          text={i18n.translate('xpack.triggersActionsUI.publicKeys.missingDescription', {
            defaultMessage: 'Create a new connector to get a signing key.',
          })}
        />
      )}
      {fields.map(({ label, value }) =>
        value ? (
          <EuiFormRow key={label} label={label} fullWidth>
            <EuiCopy textToCopy={value} tooltipProps={{ display: 'block' }}>
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
