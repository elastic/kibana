/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useCallback, useEffect } from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  useEuiTheme,
  useEuiShadow,
  EuiSkeletonCircle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type {
  AuthorizationPromptDefinition,
  PromptResponse,
} from '@kbn/agent-builder-common/agents/prompts';
import { ConnectorIconsMap } from '@kbn/connector-specs/icons';
import { connectorsSpecs } from '@kbn/connector-specs';
import { useOAuthAuthorize, OAUTH_BROADCAST_CHANNEL } from '@kbn/triggers-actions-ui-plugin/public';
import { useGetConnector } from '../../../../hooks/tools/use_mcp_connectors';
import { borderRadiusXlStyles } from '../../../../../common.styles';

const labels = {
  title: i18n.translate('xpack.agentBuilder.authorizationPrompt.title', {
    defaultMessage: 'Authorization required',
  }),
  messageWithDisplayName: (displayName: string) =>
    i18n.translate('xpack.agentBuilder.authorizationPrompt.message', {
      defaultMessage: 'You need to authorize this {displayName} action to proceed.',
      values: { displayName },
    }),
  message: i18n.translate('xpack.agentBuilder.authorizationPrompt.message', {
    defaultMessage: 'You need to authorize this action to proceed.',
  }),
  confirmText: i18n.translate('xpack.agentBuilder.authorizationPrompt.confirmText', {
    defaultMessage: 'Authorize',
  }),
  cancelText: i18n.translate('xpack.agentBuilder.authorizationPrompt.cancelText', {
    defaultMessage: 'Cancel',
  }),
};

const specMap = new Map(
  Object.values(connectorsSpecs).map((spec) => [spec.metadata.id, spec.metadata.displayName])
);

export interface AuthorizationPromptProps {
  prompt: AuthorizationPromptDefinition;
  resumeRound: (opts: { promptId: string; promptResponse: PromptResponse }) => void;
  isLoading?: boolean;
}

export const AuthorizationPrompt: React.FC<AuthorizationPromptProps> = ({
  prompt,
  resumeRound,
  isLoading = false,
}) => {
  const { euiTheme } = useEuiTheme();
  const { connector, isLoading: isConnectorLoading } = useGetConnector({
    connectorId: prompt.connector_id,
  });
  const { authorize, isAuthorizing } = useOAuthAuthorize();

  // Listen for OAuth authorization success via BroadcastChannel
  useEffect(() => {
    const channel = new BroadcastChannel(OAUTH_BROADCAST_CHANNEL);

    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'oauth_authorization_success') {
        resumeRound({ promptId: prompt.connector_id, promptResponse: { authorized: true } });
      }
    };

    channel.addEventListener('message', handleMessage);

    return () => {
      channel.removeEventListener('message', handleMessage);
      channel.close();
    };
  }, [prompt.connector_id, resumeRound]);

  const handleConfirm = useCallback(async () => {
    try {
      await authorize(prompt.connector_id);
      // The OAuth flow will open in a new tab
      // We'll receive a message via BroadcastChannel when it completes
    } catch (error) {
      // If there's an error starting the OAuth flow, treat as unauthorized
      resumeRound({ promptId: prompt.connector_id, promptResponse: { authorized: false } });
    }
  }, [authorize, prompt.connector_id, resumeRound]);

  const handleCancel = useCallback(() => {
    resumeRound({ promptId: prompt.connector_id, promptResponse: { authorized: false } });
  }, [resumeRound, prompt.connector_id]);

  const title = i18n.translate('xpack.agentBuilder.authorizationPrompt.title', {
    defaultMessage: 'Authorization required',
  });
  const confirmText = labels.confirmText;
  const cancelText = labels.cancelText;

  const containerStyles = css`
    background-color: ${euiTheme.colors.backgroundBasePlain};
    ${borderRadiusXlStyles}
    border: 1px solid ${euiTheme.colors.borderStrongWarning};
    padding: ${euiTheme.size.base};
    ${useEuiShadow('s')};
  `;

  const headerStyles = css`
    padding-bottom: ${euiTheme.size.s};
    border-bottom: 1px solid ${euiTheme.colors.lightShade};
    margin-bottom: ${euiTheme.size.s};
  `;

  const titleStyles = css`
    font-weight: ${euiTheme.font.weight.semiBold};
    font-size: ${euiTheme.size.base};
    color: ${euiTheme.colors.textParagraph};
  `;

  const iconContainerStyles = css`
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background-color: ${euiTheme.colors.backgroundLightWarning};
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  `;

  if (!connector) {
    return null;
  }

  const { actionTypeId } = connector;

  const displayName = specMap.get(actionTypeId);
  const message = displayName ? labels.messageWithDisplayName(displayName) : labels.message;
  const LazyConnectorIcon = actionTypeId ? ConnectorIconsMap.get(actionTypeId) : undefined;

  return (
    <EuiFlexGroup
      direction="column"
      responsive={false}
      css={containerStyles}
      gutterSize="none"
      data-test-subj="agentBuilderAuthorizationPrompt"
    >
      {/* Header with icon and title */}
      <EuiFlexGroup
        direction="row"
        alignItems="center"
        gutterSize="m"
        responsive={false}
        css={headerStyles}
      >
        <EuiFlexItem grow={false}>
          <div css={iconContainerStyles}>
            {isConnectorLoading ? (
              <EuiSkeletonCircle size="m" />
            ) : LazyConnectorIcon ? (
              <Suspense fallback={<EuiSkeletonCircle size="m" />}>
                <LazyConnectorIcon size="l" />
              </Suspense>
            ) : (
              <EuiIcon type="help" color="warning" size="m" />
            )}
          </div>
        </EuiFlexItem>
        <EuiFlexItem>
          <span css={titleStyles}>{title}</span>
        </EuiFlexItem>
      </EuiFlexGroup>

      {/* Message */}
      <EuiFlexItem grow={false}>
        <EuiText size="s" color="subdued">
          <p style={{ margin: 0, marginBottom: euiTheme.size.m }}>{message}</p>
        </EuiText>
      </EuiFlexItem>

      {/* Action buttons */}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false}>
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              onClick={handleCancel}
              disabled={isLoading || isAuthorizing}
              size="s"
              color="text"
              data-test-subj="agentBuilderAuthorizationPromptCancelButton"
            >
              {cancelText}
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              onClick={handleConfirm}
              isLoading={isLoading || isAuthorizing}
              fill
              size="s"
              color="warning"
              data-test-subj="agentBuilderAuthorizationPromptConfirmButton"
            >
              {confirmText}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
