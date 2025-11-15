/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import {
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiTitle,
  EuiText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiSpacer,
  EuiCallOut,
} from '@elastic/eui';
import { GoogleDriveLogo } from './google_drive_logo';
import { NotionLogo } from './notion_logo';

export type ConnectorType = 'google_drive' | 'notion';

interface ConnectorConfig {
  displayName: string;
  logo: React.ComponentType<{ size?: number; width?: number; height?: number }>;
  apiRoute: string;
  description: string;
  connectDescription: string;
}

const CONNECTOR_CONFIGS: Record<ConnectorType, ConnectorConfig> = {
  google_drive: {
    displayName: 'Google Drive',
    logo: GoogleDriveLogo,
    apiRoute: '/api/workplace_connectors/google/initiate',
    description:
      'Connect to Google Drive to enable federated search. OAuth authorization will be handled automatically.',
    connectDescription:
      "Click Connect to authenticate with Google Drive. You'll be redirected to complete the OAuth flow in a new tab.",
  },
  notion: {
    displayName: 'Notion',
    logo: NotionLogo,
    apiRoute: '/api/workplace_connectors/notion/initiate',
    description:
      'Connect to Notion to enable federated search. OAuth authorization will be handled automatically.',
    connectDescription:
      "Click Connect to authenticate with Notion. You'll be redirected to complete the OAuth flow in a new tab.",
  },
};

export interface KSCConnectorFlyoutProps {
  connectorType: ConnectorType;
  onClose: () => void;
  isEditing?: boolean;
  onConnectionSuccess?: () => void;
}

export const KSCConnectorFlyout: React.FC<KSCConnectorFlyoutProps> = ({
  connectorType,
  onClose,
  isEditing = false,
  onConnectionSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { services } = useKibana();
  const httpClient = services.http;

  const config = CONNECTOR_CONFIGS[connectorType];
  const LogoComponent = config.logo;

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);

    console.log('handleConnect');
    try {
      if (!httpClient) {
        throw new Error('HTTP client not available');
      }

      // Call server to initiate OAuth
      const response = await httpClient.post<{
        requestId: string;
        connectorId: string;
        authUrl: string;
      }>(config.apiRoute);

      const authUrl = response.authUrl;
      const requestId = response.requestId;
      const connectorId = response.connectorId;

      const oauthWindow = window.open(authUrl, '_blank');

      console.log('response', JSON.stringify(response));
      console.log('requestId', requestId);

      const pollInterval = setInterval(async () => {
        try {
          if (oauthWindow?.closed) {
            clearInterval(pollInterval);

            await httpClient.get('/api/workplace_connectors/oauth/complete', {
              query: {
                requestId,
                connectorId,
              },
            });
            console.log('OAuth completed successfully');
            setIsLoading(false);
            onConnectionSuccess?.();
          }
        } catch (err) {
          clearInterval(pollInterval);
          console.error('Failed to complete OAuth:', err);
          setIsLoading(false);
        }
      }, 1000);

      onClose();
    } catch (err) {
      setError((err as Error).message || 'Failed to start authentication');
      setIsLoading(false);
    }
  };

  const flyoutId = `${connectorType}FlyoutTitle`;

  return (
    <EuiFlyout onClose={onClose} size="s" aria-labelledby={flyoutId}>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <LogoComponent size={32} width={32} height={32} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2 id={flyoutId}>Connect to {config.displayName}</h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText color="subdued" size="s">
          <p>{config.description}</p>
        </EuiText>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {error && (
          <>
            <EuiCallOut announceOnMount title="Error" color="danger" iconType="error">
              <p>{error}</p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}

        <EuiText>
          <p>{config.connectDescription}</p>
        </EuiText>
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem>
            <EuiButtonEmpty onClick={onClose} disabled={isLoading} size="m">
              Cancel
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton onClick={handleConnect} fill isLoading={isLoading} size="m" fullWidth>
              Connect
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
