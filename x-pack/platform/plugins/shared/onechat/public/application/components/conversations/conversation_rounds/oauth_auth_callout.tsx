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
  serverId: string;
}

export const OAuthAuthCallout: React.FC<OAuthAuthCalloutProps> = ({ serverName, serverId }) => {
  const { oauthManager } = useOnechatServices();
  const [hasValidToken, setHasValidToken] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [hasAuthenticated, setHasAuthenticated] = useState(false);

  // Check if user already has a valid token
  useEffect(() => {
    const checkToken = async () => {
      try {
        const token = await oauthManager.getValidToken(serverId);
        setHasValidToken(!!token);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Failed to check OAuth token:', error);
        setHasValidToken(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkToken();
  }, [serverId, oauthManager, hasAuthenticated]);

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
