/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiAccordion,
  EuiButton,
  EuiCallOut,
  EuiCodeBlock,
  EuiText,
  EuiPanel,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  useEuiTheme,
  EuiSpacer,
} from '@elastic/eui';
import React, { useState } from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { formatOnechatErrorMessage } from '@kbn/onechat-browser';
import { css } from '@emotion/react';
import type { ConversationRoundStep } from '@kbn/onechat-common/chat/conversation';
import { isToolCallStep } from '@kbn/onechat-common/chat/conversation';
import { detectOAuthError } from '../../../../utils/oauth_error_detector';
import { extractServerIdFromToolId } from '../../../../utils/mcp_utils';
import { OAuthAuthButton } from '../oauth_auth_button';

interface RoundErrorProps {
  error: unknown;
  onRetry: () => void;
  steps: ConversationRoundStep[];
}

const getStackTrace = (error: unknown) => {
  if (error instanceof Error && typeof error.stack === 'string') {
    return error.stack;
  }

  // Fallback to onechat error formatter
  return formatOnechatErrorMessage(error);
};

export const RoundError: React.FC<RoundErrorProps> = ({ error, onRetry, steps }) => {
  const { euiTheme } = useEuiTheme();
  const [hasAuthenticated, setHasAuthenticated] = useState(false);

  const codeBlockStyles = css`
    word-break: break-all;
    border-radius: ${euiTheme.border.radius.small};
  `;

  // Check if this is an OAuth authentication error
  const errorAsError = error instanceof Error ? error : new Error(String(error));
  const oauthError = detectOAuthError(errorAsError);

  if (oauthError.isOAuthError && oauthError.serverName) {
    // Extract serverId from the last attempted tool in steps
    let serverId: string | undefined;
    
    // Find the last tool call step to get the tool ID
    for (let i = steps.length - 1; i >= 0; i--) {
      if (isToolCallStep(steps[i])) {
        const toolId = steps[i].toolId;
        serverId = extractServerIdFromToolId(toolId);
        if (serverId) break;
      }
    }

    if (serverId) {
      return (
        <EuiCallOut title="Authentication Required" color="warning" iconType="lock">
          <EuiText size="s">
            <p>
              This tool requires you to authenticate with {oauthError.serverName}. Click the button
              below to authorize access.
            </p>
          </EuiText>
          <EuiSpacer size="m" />
          <EuiFlexGroup gutterSize="s" alignItems="center">
            <EuiFlexItem grow={false}>
              <OAuthAuthButton
                serverName={oauthError.serverName}
                serverId={serverId}
                onAuthSuccess={() => setHasAuthenticated(true)}
              />
            </EuiFlexItem>
            {hasAuthenticated && (
              <EuiFlexItem grow={false}>
                <EuiButton onClick={onRetry} iconType="refresh" size="s">
                  Retry
                </EuiButton>
              </EuiFlexItem>
            )}
          </EuiFlexGroup>
        </EuiCallOut>
      );
    }
  }

  // Original error display for non-OAuth errors
  return (
    <EuiAccordion
      id="round-error"
      buttonContent={
        <FormattedMessage
          id="xpack.onechat.round.error.title"
          defaultMessage="There was an error, expand for detailed information."
        />
      }
      extraAction={
        <EuiButtonEmpty size="s" onClick={onRetry}>
          <FormattedMessage id="xpack.onechat.round.error.tryAgain" defaultMessage="Try again?" />
        </EuiButtonEmpty>
      }
    >
      <EuiSpacer size="s" />
      <EuiPanel hasBorder={false} hasShadow={false} paddingSize="l" color="subdued">
        <EuiFlexGroup direction="column" gutterSize="l">
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  <h4>
                    <FormattedMessage
                      id="xpack.onechat.round.error.whatHappened"
                      defaultMessage="What happened"
                    />
                  </h4>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s">
                  <p>
                    <FormattedMessage
                      id="xpack.onechat.round.error.whatHappenedDescription"
                      defaultMessage="Something in the query caused the model to freeze mid-thought. Performance debugging can be broad - try narrowing your question. See the error log below for specifics."
                    />
                  </p>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup direction="column" gutterSize="s">
              <EuiFlexItem grow={false}>
                <EuiText size="xs">
                  <h4>
                    <FormattedMessage
                      id="xpack.onechat.round.error.log"
                      defaultMessage="Error log"
                    />
                  </h4>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiCodeBlock
                  css={codeBlockStyles}
                  language="text"
                  fontSize="s"
                  paddingSize="m"
                  isCopyable
                  lineNumbers
                  transparentBackground
                  overflowHeight={500}
                >
                  {getStackTrace(error)}
                </EuiCodeBlock>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiPanel>
    </EuiAccordion>
  );
};
