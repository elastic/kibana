/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButton } from '@elastic/eui';
import { useOnechatServices } from '../../hooks/use_onechat_service';
import { useToasts } from '../../hooks/use_toasts';

interface OAuthAuthButtonProps {
  serverName: string;
  serverId?: string; // For MCP
  toolkitId?: string; // For Composio
  provider: 'mcp' | 'composio';
  onAuthSuccess: () => void;
}

export const OAuthAuthButton: React.FC<OAuthAuthButtonProps> = ({
  serverName,
  serverId,
  toolkitId,
  provider,
  onAuthSuccess,
}) => {
  const { oauthManager, mcpService, composioService } = useOnechatServices();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { addSuccessToast, addErrorToast } = useToasts();

  const handleAuthenticate = async () => {
    setIsAuthenticating(true);

    try {
      if (provider === 'composio' && toolkitId) {
        // Composio OAuth flow - use the same OAuth callback route as MCP
        // Store current location to return after OAuth
        const currentPath = window.location.pathname;
        sessionStorage.setItem('oauth.returnTo', currentPath);

        // Build callback URL to our unified OAuth callback route
        const basePath = window.location.origin;
        const callbackUrl = `${basePath}/app/agent_builder/oauth/callback?provider=composio&toolkit=${toolkitId}`;

        // Initiate connection with callback URL
        const result = await composioService.initiateConnection(toolkitId, callbackUrl);

        // eslint-disable-next-line no-console
        console.log('Composio connection initiated:', {
          toolkitId,
          connectionId: result.connectionId,
          redirectUrl: result.redirectUrl,
        });

        // Redirect to Composio OAuth page
        // Composio will handle the OAuth flow and redirect back with status & connected_account_id
        window.location.href = result.redirectUrl;

        // Don't call onAuthSuccess - we're redirecting away
        return;
      } else if (provider === 'mcp' && serverId) {
        // MCP OAuth flow
        // eslint-disable-next-line no-console
        console.log('=== OAuth Authentication Debug ===');
        // eslint-disable-next-line no-console
        console.log(
          'Current localStorage tokens:',
          Object.keys(localStorage).filter((k) => k.includes('onechat.mcp.oauth'))
        );

        // Fetch OAuth config from backend
        const config = await mcpService.getOAuthConfig(serverId);

        // Store current location to return after OAuth
        const currentPath = window.location.pathname;
        const appPath = currentPath.replace(/\/app\/agent_builder/g, '') || '/';
        // eslint-disable-next-line no-console
        console.log('OAuth button - storing path:', { currentPath, appPath });
        sessionStorage.setItem('oauth.returnTo', appPath);

        // Initiate OAuth flow (will redirect)
        await oauthManager.initiateAuthFlow(serverId, config.serverUrl, config);

        addSuccessToast({
          title: `Successfully authenticated with ${serverName}`,
        });
      }

      onAuthSuccess();
    } catch (error) {
      addErrorToast({
        title: `Failed to authenticate with ${serverName}`,
        text: (error as Error).message,
      });
      setIsAuthenticating(false);
    }
  };

  return (
    <EuiButton
      onClick={handleAuthenticate}
      isLoading={isAuthenticating}
      iconType="lock"
      color="primary"
      size="s"
    >
      Authenticate with {serverName}
    </EuiButton>
  );
};
