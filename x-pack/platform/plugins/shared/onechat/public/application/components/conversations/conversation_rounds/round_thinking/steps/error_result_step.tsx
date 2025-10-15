/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiCallOut,
  EuiCodeBlock,
  EuiText,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  EuiButton,
} from '@elastic/eui';
import type { ErrorResult } from '@kbn/onechat-common/tools/tool_result';
import { OAuthAuthButton } from '../../../oauth_auth_button';

interface ErrorResultStepProps {
  result: ErrorResult;
  toolId?: string;
}

export const ErrorResultStep: React.FC<ErrorResultStepProps> = ({ result, toolId }) => {
  const [hasAuthenticated, setHasAuthenticated] = useState(false);
  
  // Check if this is an OAuth authentication error
  const message = result.data.message || '';
  const isOAuthError = message.includes('OAuth authentication required for MCP server');
  
  if (isOAuthError && toolId) {
    // Extract server name from error message
    const serverNameMatch = message.match(/OAuth authentication required for MCP server "([^"]+)"/);
    const serverName = serverNameMatch ? serverNameMatch[1] : 'Unknown Server';
    
    // Extract serverId from tool ID (format: mcp.{serverId}.{toolName})
    const toolParts = toolId.split('.');
    const serverId = toolParts.length >= 3 && toolParts[0] === 'mcp' ? toolParts[1] : undefined;
    
    if (serverId) {
      return (
        <EuiCallOut title="Authentication Required" color="warning" iconType="lock">
          <EuiText size="s">
            <p>
              This tool requires you to authenticate with {serverName}. Click the button below to
              authorize access.
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
                  ✓ Authenticated! You can now retry the conversation.
                </EuiText>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiCallOut>
      );
    }
  }
  
  // Default error rendering for non-OAuth errors
  return (
    <EuiCallOut title="Error" color="danger" iconType="error">
      <EuiText size="s">
        <p>{message}</p>
      </EuiText>
      {result.data.stack && (
        <>
          <EuiSpacer size="s" />
          <EuiCodeBlock
            language="text"
            fontSize="s"
            paddingSize="s"
            isCopyable={false}
            transparentBackground
          >
            {String(result.data.stack)}
          </EuiCodeBlock>
        </>
      )}
    </EuiCallOut>
  );
};

