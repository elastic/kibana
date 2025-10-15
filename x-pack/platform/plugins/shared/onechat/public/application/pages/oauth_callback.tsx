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
 * Handles OAuth redirect callback after user authorization.
 * Exchanges authorization code for access token and redirects back to the app.
 */
export const OAuthCallbackPage: React.FC = () => {
  const { oauthManager } = useOnechatServices();
  const { navigateToOnechatUrl } = useNavigation();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleOAuthCallback = async () => {
      try {
        // Get URL parameters from callback
        const params = new URLSearchParams(window.location.search);

        // Handle the OAuth callback
        const serverId = await oauthManager.handleCallback(params);

        // Get return URL (where user came from before OAuth flow)
        const returnTo = sessionStorage.getItem('oauth.returnTo') || '/';
        sessionStorage.removeItem('oauth.returnTo');

        // Small delay to ensure token is stored
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Redirect back to original location using browser navigation
        // Using window.location instead of navigateToApp to avoid path duplication
        // since we're already in the agent_builder app
        const targetUrl = `${returnTo}`;
        // eslint-disable-next-line no-console
        console.log('OAuth callback - redirecting to:', { returnTo, targetUrl });
        // window.location.href = targetUrl;
        navigateToOnechatUrl(targetUrl.replace('/app/agent_builder', ''));
      } catch (err) {
        setError((err as Error).message || 'Authentication failed');
        setProcessing(false);
      }
    };

    handleOAuthCallback();
  }, [oauthManager]);

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
