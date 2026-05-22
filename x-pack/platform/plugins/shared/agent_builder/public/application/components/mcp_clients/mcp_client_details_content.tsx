/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonIcon, EuiCallOut, EuiCopy, EuiFlexGroup } from '@elastic/eui';
import { OAuthClientType } from '@kbn/agent-builder-common';
import fileSaver from 'file-saver';
import { isEmpty } from 'lodash';
import useToggle from 'react-use/lib/useToggle';
import type {
  CreateOAuthClientResponse,
  GetOAuthClientResponse,
} from '../../../../common/http_api/oauth_clients';
import { MCP_SERVER_PATH } from '../../../../common/mcp';
import { labels } from '../../utils/i18n';
import { McpClientDetailsField } from './mcp_client_details_field';

export type McpClientDetailsPresentation = 'modal' | 'flyout';
export type McpClientDetailsData = CreateOAuthClientResponse | GetOAuthClientResponse;

const hasClientSecret = (
  details: McpClientDetailsData
): details is CreateOAuthClientResponse & { client_secret: string } =>
  'client_secret' in details && !isEmpty(details.client_secret);

const isConfidentialClient = (details: McpClientDetailsData): boolean =>
  details.type === OAuthClientType.CONFIDENTIAL;

const maskSecret = (secret: string) => '•'.repeat(secret.length);

const buildMcpServerUrl = (resource: string): string =>
  `${resource.replace(/\/+$/, '')}${MCP_SERVER_PATH}`;

export interface McpClientDetailsContentProps {
  clientDetails: McpClientDetailsData;
  presentation: McpClientDetailsPresentation;
}

export const McpClientDetailsContent = ({
  clientDetails,
  presentation,
}: McpClientDetailsContentProps) => {
  const [isSecretVisible, toggleSecretVisibility] = useToggle(false);

  const { client_name, id, resource } = clientDetails;

  const clientName = client_name;
  const mcpServerUrl = buildMcpServerUrl(resource);
  const showSecretField = presentation === 'modal' && hasClientSecret(clientDetails);
  const showSecretRequiredCallout =
    presentation === 'flyout' && isConfidentialClient(clientDetails);

  const handleDownloadSecret = useCallback(() => {
    if (!hasClientSecret(clientDetails)) return;
    const blob = new Blob([clientDetails.client_secret], { type: 'text/plain' });
    fileSaver.saveAs(blob, `${clientName}_secret.txt`);
  }, [clientDetails, clientName]);

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      <McpClientDetailsField
        label={labels.tools.mcpClients.details.clientIdLabel}
        actions={[
          <EuiCopy textToCopy={id}>
            {(copy) => (
              <EuiButtonIcon
                iconType="copy"
                color="text"
                aria-label={labels.tools.mcpClients.details.copyClientId}
                onClick={copy}
              />
            )}
          </EuiCopy>,
        ]}
      >
        {id}
      </McpClientDetailsField>
      <McpClientDetailsField
        label={labels.tools.mcpClients.details.serverUrlLabel}
        actions={[
          <EuiCopy textToCopy={mcpServerUrl}>
            {(copy) => (
              <EuiButtonIcon
                iconType="copy"
                color="text"
                aria-label={labels.tools.mcpClients.details.copyServerUrl}
                onClick={copy}
              />
            )}
          </EuiCopy>,
        ]}
      >
        {mcpServerUrl}
      </McpClientDetailsField>
      {showSecretField && (
        <McpClientDetailsField
          label={labels.tools.mcpClients.details.modal.clientSecretLabel}
          actions={[
            <EuiButtonIcon
              iconType="download"
              color="text"
              aria-label={labels.tools.mcpClients.details.modal.downloadSecret}
              onClick={handleDownloadSecret}
            />,
            <EuiButtonIcon
              iconType={isSecretVisible ? 'eyeClosed' : 'eye'}
              color="text"
              aria-label={labels.tools.mcpClients.details.modal.toggleSecretVisibility}
              onClick={toggleSecretVisibility}
            />,
            <EuiCopy textToCopy={clientDetails.client_secret}>
              {(copy) => (
                <EuiButtonIcon
                  iconType="copy"
                  color="text"
                  aria-label={labels.tools.mcpClients.details.modal.copySecret}
                  onClick={copy}
                />
              )}
            </EuiCopy>,
          ]}
          append={
            <EuiCallOut
              announceOnMount
              color="warning"
              size="s"
              title={labels.tools.mcpClients.details.modal.secretWarning}
            />
          }
        >
          {isSecretVisible ? clientDetails.client_secret : maskSecret(clientDetails.client_secret)}
        </McpClientDetailsField>
      )}
      {showSecretRequiredCallout && (
        <EuiCallOut
          announceOnMount={false}
          color="warning"
          title={labels.tools.mcpClients.details.flyout.clientSecretRequiredTitle}
        >
          <p>{labels.tools.mcpClients.details.flyout.clientSecretRequiredBody}</p>
        </EuiCallOut>
      )}
    </EuiFlexGroup>
  );
};
