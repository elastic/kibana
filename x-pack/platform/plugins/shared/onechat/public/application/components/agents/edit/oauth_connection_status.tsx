/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHealth,
  EuiToolTip,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useOnechatServices } from '../../../hooks/use_onechat_service';

interface OAuthConnectionStatusProps {
  mcpServerId: string;
  serverName: string;
  compact?: boolean;
}

/**
 * OAuth Connection Status Component
 * 
 * Shows the OAuth connection status for an MCP server and allows users to
 * initiate or re-initiate the OAuth flow.
 */
export const OAuthConnectionStatus: React.FC<OAuthConnectionStatusProps> = ({
  mcpServerId,
  serverName,
  compact = false,
}) => {
  const { oauthManager } = useOnechatServices();
  const [hasValidToken, setHasValidToken] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Check if user has a valid OAuth token for this server
  useEffect(() => {
    let mounted = true;

    const checkToken = async () => {
      setIsChecking(true);
      try {
        const isValid = await oauthManager.hasValidToken(mcpServerId);
        if (mounted) {
          setHasValidToken(isValid);
        }
      } catch (error) {
        console.error(`Failed to check OAuth token for ${mcpServerId}:`, error);
        if (mounted) {
          setHasValidToken(false);
        }
      } finally {
        if (mounted) {
          setIsChecking(false);
        }
      }
    };

    checkToken();

    return () => {
      mounted = false;
    };
  }, [mcpServerId, oauthManager]);

  const handleConnect = useCallback(() => {
    // Store current location to return to after OAuth flow
    sessionStorage.setItem('oauth.returnTo', window.location.pathname + window.location.search);
    
    // TODO: Get OAuth config from server configuration
    // For now, this will need to be passed from parent or fetched
    console.warn('OAuth config needs to be fetched from server config');
    
    // Placeholder: This would normally initiate the OAuth flow
    // oauthManager.initiateAuthFlow(mcpServerId, serverUrl, oauthConfig);
  }, [mcpServerId]);

  const handleDisconnect = useCallback(() => {
    oauthManager.clearToken(mcpServerId);
    setHasValidToken(false);
  }, [mcpServerId, oauthManager]);

  if (isChecking) {
    return (
      <EuiHealth color="subdued">
        {i18n.translate('xpack.onechat.oauth.checkingStatus', {
          defaultMessage: 'Checking...',
        })}
      </EuiHealth>
    );
  }

  if (compact) {
    // Compact view: just a status badge
    return (
      <EuiToolTip
        content={
          hasValidToken
            ? i18n.translate('xpack.onechat.oauth.connectedTooltip', {
                defaultMessage: 'Connected to {serverName}',
                values: { serverName },
              })
            : i18n.translate('xpack.onechat.oauth.notConnectedTooltip', {
                defaultMessage: 'Not connected to {serverName}. Click to connect.',
                values: { serverName },
              })
        }
      >
        <EuiHealth color={hasValidToken ? 'success' : 'danger'}>
          {hasValidToken
            ? i18n.translate('xpack.onechat.oauth.connected', {
                defaultMessage: 'Connected',
              })
            : i18n.translate('xpack.onechat.oauth.notConnected', {
                defaultMessage: 'Not connected',
              })}
        </EuiHealth>
      </EuiToolTip>
    );
  }

  // Full view: with connect/disconnect button
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        <EuiHealth color={hasValidToken ? 'success' : 'danger'}>
          {hasValidToken
            ? i18n.translate('xpack.onechat.oauth.connected', {
                defaultMessage: 'Connected',
              })
            : i18n.translate('xpack.onechat.oauth.notConnected', {
                defaultMessage: 'Not connected',
              })}
        </EuiHealth>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        {hasValidToken ? (
          <EuiButtonEmpty
            size="xs"
            onClick={handleDisconnect}
            aria-label={i18n.translate('xpack.onechat.oauth.disconnectAriaLabel', {
              defaultMessage: 'Disconnect from {serverName}',
              values: { serverName },
            })}
          >
            {i18n.translate('xpack.onechat.oauth.disconnect', {
              defaultMessage: 'Disconnect',
            })}
          </EuiButtonEmpty>
        ) : (
          <EuiButton
            size="s"
            onClick={handleConnect}
            aria-label={i18n.translate('xpack.onechat.oauth.connectAriaLabel', {
              defaultMessage: 'Connect to {serverName}',
              values: { serverName },
            })}
          >
            {i18n.translate('xpack.onechat.oauth.connect', {
              defaultMessage: 'Connect to {serverName}',
              values: { serverName },
            })}
          </EuiButton>
        )}
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

