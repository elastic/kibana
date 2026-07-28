/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButtonIcon, EuiCallOut, EuiCopy, EuiFlexGroup, EuiToolTip } from '@elastic/eui';
import type { OAuthClient } from '@kbn/agent-builder-common';
import { AGENT_BUILDER_UI_EBT, OAuthClientType } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import fileSaver from 'file-saver';
import { isEmpty } from 'lodash';
import useToggle from 'react-use/lib/useToggle';
import { labels } from './translations';
import { McpClientDetailsField } from './mcp_client_details_field';

export type McpClientDetailsPresentation = 'modal' | 'flyout' | 'popover';
export type McpClientDetailsData = OAuthClient & { client_secret?: string };

const hasClientSecret = (
  details: McpClientDetailsData
): details is McpClientDetailsData & { client_secret: string } =>
  'client_secret' in details && !isEmpty(details.client_secret);

const isConfidentialClient = (details: McpClientDetailsData): boolean =>
  details.type === OAuthClientType.CONFIDENTIAL;

const maskSecret = (secret: string) => '•'.repeat(secret.length);

export interface McpClientDetailsContentProps {
  clientDetails: McpClientDetailsData;
  presentation: McpClientDetailsPresentation;
}

export const McpClientDetailsContent = ({
  clientDetails,
  presentation,
}: McpClientDetailsContentProps) => {
  const [isSecretVisible, toggleSecretVisibility] = useToggle(false);

  const { client_name: clientName, id, resource: mcpServerUrl } = clientDetails;
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
        label={labels.details.clientIdLabel}
        actions={[
          <EuiCopy textToCopy={id}>
            {(copy) => (
              <EuiToolTip content={labels.details.copyClientId} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="copy"
                  color="text"
                  aria-label={labels.details.copyClientId}
                  onClick={copy}
                />
              </EuiToolTip>
            )}
          </EuiCopy>,
        ]}
      >
        {id}
      </McpClientDetailsField>
      <McpClientDetailsField
        label={labels.details.serverUrlLabel}
        actions={[
          <EuiCopy textToCopy={mcpServerUrl}>
            {(copy) => (
              <EuiToolTip content={labels.details.copyServerUrl} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="copy"
                  color="text"
                  aria-label={labels.details.copyServerUrl}
                  onClick={copy}
                />
              </EuiToolTip>
            )}
          </EuiCopy>,
        ]}
      >
        {mcpServerUrl}
      </McpClientDetailsField>
      {showSecretField && (
        <McpClientDetailsField
          label={labels.details.modal.clientSecretLabel}
          actions={[
            <EuiToolTip content={labels.details.modal.downloadSecret} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="download"
                color="text"
                aria-label={labels.details.modal.downloadSecret}
                onClick={handleDownloadSecret}
              />
            </EuiToolTip>,
            <EuiToolTip
              content={labels.details.modal.toggleSecretVisibility}
              disableScreenReaderOutput
            >
              <EuiButtonIcon
                iconType={isSecretVisible ? 'eyeClosed' : 'eye'}
                color="text"
                aria-label={labels.details.modal.toggleSecretVisibility}
                onClick={toggleSecretVisibility}
              />
            </EuiToolTip>,
            <EuiCopy textToCopy={clientDetails.client_secret}>
              {(copy) => (
                <EuiToolTip content={labels.details.modal.copySecret} disableScreenReaderOutput>
                  <EuiButtonIcon
                    iconType="copy"
                    color="text"
                    aria-label={labels.details.modal.copySecret}
                    onClick={copy}
                    {...getEbtProps({
                      element: AGENT_BUILDER_UI_EBT.element.pageContent,
                      action: AGENT_BUILDER_UI_EBT.action.globalManagement.MCP_CLIENT_COPY_SECRET,
                      detail: AGENT_BUILDER_UI_EBT.entity.MCP_CLIENT,
                    })}
                  />
                </EuiToolTip>
              )}
            </EuiCopy>,
          ]}
          append={
            <EuiCallOut
              announceOnMount
              color="warning"
              size="s"
              title={labels.details.modal.secretWarning}
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
          title={labels.details.flyout.clientSecretRequiredTitle}
        >
          <p>{labels.details.flyout.clientSecretRequiredBody}</p>
        </EuiCallOut>
      )}
    </EuiFlexGroup>
  );
};
