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

export interface GoogleDriveConnectorFlyoutProps {
  onClose: () => void;
  isEditing?: boolean;
  onConnectionSuccess?: () => void;
}

export const GoogleDriveConnectorFlyout: React.FC<GoogleDriveConnectorFlyoutProps> = ({
  onClose,
  isEditing = false,
  onConnectionSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { services } = useKibana();
  const httpClient = services.http;

  const handleConnect = async () => {
    setIsLoading(true);
    setError(null);

    console.log('handleConnect');
    try {
      if (!httpClient) {
        throw new Error('HTTP client not available');
      }

      // Call server to initiate OAuth
      const response = await httpClient.post<{ requestId: string; connectorId: string; authUrl: string }>(
        '/api/workplace_connectors/google/initiate',
      );

      const google_url = response.authUrl;
      const requestId = response.requestId;
      const connectorId = response.connectorId;

      const oauthWindow = window.open(google_url, '_blank');

      console.log('response', JSON.stringify(response));
      console.log('requestId', requestId);

      const pollInterval = setInterval(async () => {
        try {
          if (oauthWindow?.closed) {
            clearInterval(pollInterval);

              await httpClient.get('/api/workplace_connectors/oauth/complete', {
                query: {
                  requestId: requestId,
                  connectorId: connectorId,
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

  return (
    <EuiFlyout onClose={onClose} size="s" aria-labelledby="googleDriveFlyoutTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <GoogleDriveLogo size={32} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2 id="googleDriveFlyoutTitle">Connect to Google Drive</h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText color="subdued" size="s">
          <p>Connect to Google Drive to enable federated search. OAuth authorization will be handled automatically.</p>
        </EuiText>
      </EuiFlyoutHeader>

      <EuiFlyoutBody>
        {error && (
          <>
            <EuiCallOut title="Error" color="danger" iconType="error">
              <p>{error}</p>
            </EuiCallOut>
            <EuiSpacer size="m" />
          </>
        )}

        <EuiText>
          <p>
            Click Connect to authenticate with Google Drive. You'll be redirected to complete the OAuth flow in a new tab.
          </p>
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
            <EuiButton
              onClick={handleConnect}
              fill
              isLoading={isLoading}
              size="m"
              fullWidth
            >
              Connect
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
