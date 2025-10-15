/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiCallOut, EuiLoadingSpinner, EuiPanel, EuiSpacer, EuiText } from '@elastic/eui';
import { useOnechatServices } from '../hooks/use_onechat_service';
import { useNavigation } from '../hooks/use_navigation';

/**
 * OAuth Callback Page
 *
 * Handles OAuth redirect callbacks after user authorization.
 * - For MCP: Exchanges authorization code for access token and stores in localStorage
 * - For Composio: Verifies connection was established (tokens managed by Composio)
 * Then redirects back to the original location.
 */
export const OAuthCallbackPage: React.FC = () => {
  const { oauthManager, composioService } = useOnechatServices();
  const { navigateToOnechatUrl } = useNavigation();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Get URL parameters from callback
        const params = new URLSearchParams(window.location.search);
        const provider = params.get('provider');

        if (provider === 'composio') {
          // Handle Composio OAuth callback
          const toolkitId = params.get('toolkit');

          if (!toolkitId) {
            throw new Error('Missing toolkit parameter in Composio callback');
          }

          // eslint-disable-next-line no-console
          console.log('Composio callback received for toolkit:', toolkitId);
          // eslint-disable-next-line no-console
          console.log('Callback params:', Object.fromEntries(params.entries()));

          // Composio sends the connection result in the callback URL
          const status = params.get('status');
          const connectedAccountId = params.get('connected_account_id');

          // Check if user cancelled or if there was an error
          if (status === 'cancelled') {
            throw new Error('Authentication was cancelled');
          }

          const error = params.get('error');
          if (error) {
            const errorDescription = params.get('error_description');
            throw new Error(`Composio authentication failed: ${errorDescription || error}`);
          }

          // Check if OAuth was successful
          if (status === 'success' && connectedAccountId) {
            // eslint-disable-next-line no-console
            console.log('Composio callback successful, waiting for connection:', {
              toolkitId,
              connectedAccountId,
            });

            // Wait for the connection to be fully established
            const connection = await composioService.waitForConnection(connectedAccountId);

            // eslint-disable-next-line no-console
            console.log('Composio connection established:', connection);

            // Store authentication status in localStorage so the UI knows user is authenticated
            // Use the same pattern as MCP OAuth
            localStorage.setItem(
              `onechat.composio.auth.${toolkitId}`,
              JSON.stringify({
                connectedAccountId: connection.connectionId,
                appName: connection.appName,
                status: connection.status,
                authenticatedAt: new Date().toISOString(),
              })
            );
          } else {
            throw new Error(
              'Composio authentication failed: Missing status or connected_account_id'
            );
          }
        } else {
          // Handle MCP OAuth callback (default)
          // eslint-disable-next-line no-console
          console.log('=== MCP OAuth Callback ===');
          // eslint-disable-next-line no-console
          console.log('URL params:', Object.fromEntries(params.entries()));

          const serverId = await oauthManager.handleCallback(params);

          // eslint-disable-next-line no-console
          console.log('MCP OAuth authentication successful for server:', serverId);

          // Verify token was stored
          const token = await oauthManager.getValidToken(serverId);
          // eslint-disable-next-line no-console
          console.log('Token verification after storage:', {
            serverId,
            hasToken: !!token,
            tokenPreview: token ? token.substring(0, 20) + '...' : 'none',
          });

          // Check localStorage directly - scan for any keys with this serverId
          const allKeys = Object.keys(localStorage).filter(
            (k) => k.includes(`onechat.mcp.oauth`) && k.endsWith(`.${serverId}`)
          );
          // eslint-disable-next-line no-console
          console.log('localStorage keys for this server:', allKeys);
          if (allKeys.length > 0) {
            const storedData = localStorage.getItem(allKeys[0]);
            // eslint-disable-next-line no-console
            console.log('Stored token data:', storedData ? JSON.parse(storedData) : null);
          }
        }

        // Get return URL (where user came from before OAuth flow)
        const returnTo = sessionStorage.getItem('oauth.returnTo') || '/';
        sessionStorage.removeItem('oauth.returnTo');

        // Check if there's a message to auto-retry
        // Note: We don't remove it here - the conversation component will handle it
        const lastMessage = sessionStorage.getItem('oauth.lastMessage');
        if (lastMessage) {
          // eslint-disable-next-line no-console
          console.log('Message pending for auto-retry after OAuth:', lastMessage);
        }

        // Small delay to ensure everything is stored
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Redirect back to original location
        const targetUrl = `${returnTo}`;
        // eslint-disable-next-line no-console
        console.log('OAuth callback - redirecting to:', { returnTo, targetUrl });
        navigateToOnechatUrl(targetUrl.replace('/app/agent_builder', ''));
      } catch (err) {
        setError((err as Error).message || 'Authentication failed');
        setProcessing(false);
      }
    };

    handleOAuthCallback();
  }, [oauthManager, composioService, navigateToOnechatUrl]);

  if (error) {
    return (
      <EuiPanel paddingSize="l">
        <EuiCallOut color="danger" title="Authentication Error" iconType="error">
          <p>{error}</p>
          <EuiSpacer size="m" />
          <EuiText size="s">
            <p>Please try again or contact your administrator if the problem persists.</p>
          </EuiText>
        </EuiCallOut>
      </EuiPanel>
    );
  }

  return (
    <EuiPanel paddingSize="l">
      <div style={{ textAlign: 'center' }}>
        <EuiLoadingSpinner size="xl" />
        <EuiSpacer size="l" />
        <EuiText>
          <p>{processing ? 'Completing authentication...' : 'Redirecting...'}</p>
        </EuiText>
      </div>
    </EuiPanel>
  );
};
