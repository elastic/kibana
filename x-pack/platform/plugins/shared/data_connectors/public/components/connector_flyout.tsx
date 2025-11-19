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
  EuiFormRow,
  EuiFieldPassword,
  EuiForm,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
  EuiButtonEmpty,
  EuiSpacer,
  EuiCallOut,
  EuiCheckbox,
} from '@elastic/eui';
import { getConnectorIconPath } from '../pages/data_connectors_landing';

export type ConnectorType = 'google_drive' | 'notion' | 'brave_search' | 'slack' | string;

// Map feature IDs to display labels
const FEATURE_LABELS: Record<string, string> = {
  search_web: 'Search Web',
  search_messages: 'Search Messages',
  search_channels: 'Search Channels',
  search_files: 'Search Files',
  search: 'Search',
  list: 'List Files',
  get: 'Get File Metadata',
  download: 'Download File',
};

export interface OAuthConfig {
  provider: string;
  scopes: string[];
  initiatePath: string;
  fetchSecretsPath: string;
  oauthBaseUrl?: string;
}

export interface ConnectorFlyoutProps {
  connectorType: string;
  connectorName: string;
  defaultFeatures?: string[];
  oauthConfig?: OAuthConfig;
  onClose: () => void;
  onSave?: (data: { apiKey: string; features: string[] }) => Promise<void>;
  onConnectionSuccess?: () => void;
  isEditing?: boolean;
  connectorId?: string; // ID of existing connector when editing
}

export const ConnectorFlyout: React.FC<ConnectorFlyoutProps> = ({
  connectorType,
  connectorName,
  defaultFeatures = [],
  oauthConfig,
  onClose,
  onSave,
  onConnectionSuccess,
  isEditing = false,
  connectorId,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [features, setFeatures] = useState<string[]>(defaultFeatures);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regenerateWorkflows, setRegenerateWorkflows] = useState(false);
  const { services } = useKibana();
  const httpClient = services.http;

  // Determine if this connector uses OAuth authentication
  const isOAuth = Boolean(oauthConfig);

  // Handle API key authentication
  const handleApiKeySave = async () => {
    if (!apiKey.trim()) {
      setError('API Key is required');
      return;
    }

    if (!onSave) {
      setError('Save handler not provided');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSave({ apiKey: apiKey.trim(), features });
      onClose();
    } catch (err) {
      setError((err as Error).message || 'Failed to save connector');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle OAuth authentication
  const handleOAuthConnect = async () => {
    if (!oauthConfig) {
      setError('OAuth configuration not found');
      return;
    }

    setIsLoading(true);
    setError(null);

    if (!httpClient) {
      throw new Error('HTTP client not available');
    }

    try {
      // Build OAuth API route from config
      // The API route is /api/workplace_connectors/{provider}/initiate
      const apiRoute = `/api/workplace_connectors/${oauthConfig.provider}/initiate`;

      // Call server to initiate OAuth
      // Pass connectorId if editing, and regenerateWorkflows flag
      const response = await httpClient.post<{
        requestId: string;
        connectorId: string;
        authUrl: string;
      }>(apiRoute, {
        body: JSON.stringify({ connectorId, regenerateWorkflows }),
      } as any);

      const authUrl = response.authUrl;
      const requestId = response.requestId;
      const returnedConnectorId = response.connectorId;

      const oauthWindow = window.open(authUrl, '_blank');

      // Poll for OAuth completion
      const pollInterval = setInterval(async () => {
        try {
          if (oauthWindow?.closed) {
            clearInterval(pollInterval);

            await httpClient.get('/api/workplace_connectors/oauth/complete', {
              query: {
                requestId,
                connectorId: returnedConnectorId,
              },
            });
            setIsLoading(false);
            onConnectionSuccess?.();
            onClose();
          }
        } catch (err) {
          clearInterval(pollInterval);
          setError((err as Error).message || 'Failed to complete OAuth authentication');
          setIsLoading(false);
        }
      }, 1000);
    } catch (err) {
      setError((err as Error).message || 'Failed to start authentication');
      setIsLoading(false);
    }
  };

  const flyoutId = `${connectorType}FlyoutTitle`;
  const iconPath = getConnectorIconPath(connectorType);
  const description = isOAuth
    ? `Connect to ${connectorName} to enable federated search. OAuth authorization will be handled automatically.`
    : `Enter your ${connectorName} API credentials to connect this connector.`;
  const connectDescription = isOAuth
    ? `Click Connect to authenticate with ${connectorName}. You'll be redirected to complete the OAuth flow in a new tab.`
    : '';

  return (
    <EuiFlyout onClose={onClose} size="s" aria-labelledby={flyoutId}>
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <img src={iconPath} alt={`${connectorName} logo`} width={32} height={32} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2 id={flyoutId}>Connect to {connectorName}</h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText color="subdued" size="s">
          <p>{description}</p>
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

        {isOAuth ? (
          // OAuth authentication flow
          <>
            <EuiText>
              <p>{connectDescription}</p>
            </EuiText>
            {isEditing && (
              <>
                <EuiSpacer size="m" />
                <EuiCheckbox
                  id="regenerate-workflows"
                  label="Regenerate workflows and tools"
                  checked={regenerateWorkflows}
                  onChange={(e) => setRegenerateWorkflows(e.target.checked)}
                />
              </>
            )}
          </>
        ) : (
          // API key authentication form
          <EuiForm fullWidth>
            <EuiTitle size="xs">
              <h3>API Key Credentials</h3>
            </EuiTitle>
            <EuiSpacer size="s" />

            <EuiFormRow
              label="API Key"
              helpText={`Enter your ${connectorName} API key`}
              isInvalid={!!error && !apiKey.trim()}
              error={error && !apiKey.trim() ? ['API Key is required'] : []}
              fullWidth
            >
              <EuiFieldPassword
                type="dual"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter API key"
                isInvalid={!!error && !apiKey.trim()}
                fullWidth
              />
            </EuiFormRow>

            <EuiSpacer size="m" />

            <EuiTitle size="xs">
              <h3>Configuration</h3>
            </EuiTitle>
            <EuiSpacer size="s" />

            {/* Dynamic features based on connector type */}
            {defaultFeatures.length > 0 && (
              <EuiFormRow label="Enable functionality" fullWidth>
                <EuiFlexGroup gutterSize="s" direction="column">
                  {defaultFeatures.map((featureId) => (
                    <EuiFlexItem key={featureId} grow={false}>
                      <EuiCheckbox
                        id={`feature-${featureId}`}
                        label={FEATURE_LABELS[featureId] || featureId}
                        checked={features.includes(featureId)}
                        onChange={(e) =>
                          setFeatures((prev) =>
                            e.target.checked
                              ? Array.from(new Set([...prev, featureId]))
                              : prev.filter((f) => f !== featureId)
                          )
                        }
                      />
                    </EuiFlexItem>
                  ))}
                </EuiFlexGroup>
              </EuiFormRow>
            )}
          </EuiForm>
        )}
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
              onClick={isOAuth ? handleOAuthConnect : handleApiKeySave}
              fill
              isLoading={isLoading}
              size="m"
              fullWidth
            >
              {isOAuth ? 'Connect' : isEditing ? 'Save' : 'Connect'}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
