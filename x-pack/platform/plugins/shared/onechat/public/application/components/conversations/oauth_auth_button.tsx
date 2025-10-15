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
  serverId: string;
  onAuthSuccess: () => void;
}

export const OAuthAuthButton: React.FC<OAuthAuthButtonProps> = ({
  serverName,
  serverId,
  onAuthSuccess,
}) => {
  const { oauthManager, mcpService } = useOnechatServices();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { addSuccessToast, addErrorToast } = useToasts();

  const handleAuthenticate = async () => {
    setIsAuthenticating(true);

    // eslint-disable-next-line no-console
    console.log('=== OAuth Authentication Debug ===');
    // eslint-disable-next-line no-console
    console.log(
      'Current localStorage tokens:',
      Object.keys(localStorage).filter((k) => k.includes('onechat.mcp.oauth'))
    );

    try {
      // Fetch OAuth config from backend
      const config = await mcpService.getOAuthConfig(serverId);

      // Store current location to return after OAuth
      // Strip /app/agent_builder prefix(es) to get the relative path within the app
      const currentPath = window.location.pathname;
      // Handle cases where path might be doubled: /app/agent_builder/app/agent_builder/...
      // Remove ALL /app/agent_builder occurrences and keep the route path
      const appPath = currentPath.replace(/\/app\/agent_builder/g, '') || '/';
      // eslint-disable-next-line no-console
      console.log('OAuth button - storing path:', { currentPath, appPath });
      sessionStorage.setItem('oauth.returnTo', appPath);

      // Initiate OAuth flow (will redirect)
      await oauthManager.initiateAuthFlow(serverId, config.serverUrl, config);

      // Note: This won't execute due to redirect, but kept for consistency
      addSuccessToast({
        title: `Successfully authenticated with ${serverName}`,
      });

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
