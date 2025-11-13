/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
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
import { BraveLogo } from './brave_logo';

export interface ConnectorFlyoutProps {
  connectorType: string;
  connectorName: string;
  defaultFeatures?: string[];
  onClose: () => void;
  onSave: (data: { apiKey: string; features: string[] }) => Promise<void>;
  isEditing?: boolean;
}

// Map feature IDs to display labels
const FEATURE_LABELS: Record<string, string> = {
  search_web: 'Search Web',
  search_messages: 'Search Messages',
  search_channels: 'Search Channels',
  search_files: 'Search Files',
};

export const ConnectorFlyout: React.FC<ConnectorFlyoutProps> = ({
  connectorName,
  defaultFeatures = [],
  onClose,
  onSave,
  isEditing,
}) => {
  const [apiKey, setApiKey] = useState('');
  const [features, setFeatures] = useState<string[]>(defaultFeatures);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError('API Key is required');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSave({ apiKey: apiKey.trim(), features });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save connector');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <EuiFlyout onClose={onClose} size="s" aria-labelledby="connectorFlyoutTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup gutterSize="m" alignItems="center" responsive={false}>
          <EuiFlexItem grow={false}>
            <BraveLogo size={32} />
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiTitle size="m">
              <h2 id="connectorFlyoutTitle">Connect to {connectorName}</h2>
            </EuiTitle>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EuiText color="subdued" size="s">
          <p>Enter your {connectorName} API credentials to connect this connector.</p>
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

        <EuiForm fullWidth>
          <EuiTitle size="xs">
            <h3>Credentials</h3>
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
      </EuiFlyoutBody>

      <EuiFlyoutFooter>
        <EuiFlexGroup gutterSize="m">
          <EuiFlexItem>
            <EuiButtonEmpty onClick={onClose} disabled={isLoading} size="m">
              Cancel
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiButton onClick={handleSave} fill isLoading={isLoading} size="m" fullWidth>
              {isEditing ? 'Save' : 'Connect'}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
