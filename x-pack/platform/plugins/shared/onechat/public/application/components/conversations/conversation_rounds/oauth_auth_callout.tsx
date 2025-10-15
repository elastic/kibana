/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useEffect } from 'react';
import {
  EuiCallOut,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
} from '@elastic/eui';
import { OAuthAuthButton } from '../oauth_auth_button';
import { useOnechatServices } from '../../../hooks/use_onechat_service';

interface OAuthAuthCalloutProps {
  serverName: string;
  serverId?: string; // For MCP
  toolkitId?: string; // For Composio
  provider: 'mcp' | 'composio';
}

export const OAuthAuthCallout: React.FC<OAuthAuthCalloutProps> = ({
  serverName,
  serverId,
  toolkitId,
  provider,
}) => {
  const { oauthManager, composioService } = useOnechatServices();
  const [hasValidToken, setHasValidToken] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [hasAuthenticated, setHasAuthenticated] = useState(false);

  // Check if user already has a valid token/connection
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (provider === 'mcp' && serverId) {
          // Check MCP OAuth token
          const token = await oauthManager.getValidToken(serverId);
          setHasValidToken(!!token);
        } else if (provider === 'composio' && toolkitId) {
          // First check localStorage for quick response
          const localAuth = localStorage.getItem(`onechat.composio.auth.${toolkitId}`);
          if (localAuth) {
            try {
              const authData = JSON.parse(localAuth);
              // eslint-disable-next-line no-console
              console.log('Found Composio auth in localStorage:', authData);
              setHasValidToken(true);
              setIsChecking(false);
              return;
            } catch (e) {
              // Invalid JSON, remove it
              localStorage.removeItem(`onechat.composio.auth.${toolkitId}`);
            }
          }

          // If not in localStorage, check backend
          const status = await composioService.checkConnectionStatus(toolkitId);
          setHasValidToken(status.isConnected);

          // If backend says connected, store in localStorage for next time
          if (status.isConnected) {
            localStorage.setItem(
              `onechat.composio.auth.${toolkitId}`,
              JSON.stringify({
                verified: true,
                verifiedAt: new Date().toISOString(),
              })
            );
          }
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to check authentication status:', error);
        setHasValidToken(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAuth();
  }, [serverId, toolkitId, provider, oauthManager, composioService, hasAuthenticated]);

  // Don't show anything if checking or if user already has valid token
  if (isChecking) {
    return (
      <EuiFlexGroup justifyContent="center" alignItems="center">
        <EuiFlexItem grow={false}>
          <EuiLoadingSpinner size="m" />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  if (hasValidToken) {
    return (
      <EuiCallOut title="Already Authenticated" color="success" iconType="check">
        <EuiText size="s">
          <p>You are already authenticated with {serverName}. You can retry your request now.</p>
        </EuiText>
      </EuiCallOut>
    );
  }

  return (
    <EuiCallOut title="Authentication Required" color="warning" iconType="lock">
      <EuiText size="s">
        <p>
          This tool requires you to authenticate with {serverName}. Click the button below to
          authorize access and try again.
        </p>
      </EuiText>
      <EuiSpacer size="m" />
      <EuiFlexGroup gutterSize="s" alignItems="center">
        <EuiFlexItem grow={false}>
          <OAuthAuthButton
            serverName={serverName}
            serverId={serverId}
            toolkitId={toolkitId}
            provider={provider}
            onAuthSuccess={() => setHasAuthenticated(true)}
          />
        </EuiFlexItem>
        {hasAuthenticated && (
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="success">
              ✓ Authenticated! You can now try again.
            </EuiText>
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiCallOut>
  );
};
