/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiButton, EuiButtonEmpty, EuiFlexGroup, EuiText, euiShadow } from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import type { AuthorizationPromptDefinition } from '@kbn/agent-builder-common/agents';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { formatAgentBuilderErrorMessage } from '@kbn/agent-builder-browser';
import { OAuthRedirectMode, useConnectorOAuthConnect } from '@kbn/response-ops-oauth-hooks';
import { borderRadiusXlStyles } from '../../../../../common.styles';
import { useToasts } from '../../../../hooks/use_toasts';
import { ConnectorTypeIcon } from '../../../connectors/connector_type_icon';

const labels = {
  title: i18n.translate('xpack.agentBuilder.authorizationPrompt.title', {
    defaultMessage: 'Authorization required',
  }),
  authorize: i18n.translate('xpack.agentBuilder.authorizationPrompt.authorize', {
    defaultMessage: 'Authorize',
  }),
  cancel: i18n.translate('xpack.agentBuilder.authorizationPrompt.cancel', {
    defaultMessage: 'Cancel',
  }),
  authorized: i18n.translate('xpack.agentBuilder.authorizationPrompt.authorized', {
    defaultMessage: 'Authorized',
  }),
  declined: i18n.translate('xpack.agentBuilder.authorizationPrompt.declined', {
    defaultMessage: 'Declined',
  }),
  errorToastTitle: i18n.translate('xpack.agentBuilder.authorizationPrompt.errorToastTitle', {
    defaultMessage: 'Authorization failed',
  }),
};

const containerStyles = (euiThemeContext: UseEuiTheme) => {
  const { euiTheme } = euiThemeContext;
  return css`
    background-color: ${euiTheme.colors.backgroundBasePlain};
    ${borderRadiusXlStyles}
    border: 1px solid ${euiTheme.colors.borderStrongWarning};
    padding: ${euiTheme.size.base};
    ${euiShadow(euiThemeContext, 's')};
  `;
};

const headerStyles = ({ euiTheme }: UseEuiTheme) => css`
  padding-block-end: ${euiTheme.size.m};
  border-block-end: 1px solid ${euiTheme.colors.lightShade};
`;

const titleStyles = ({ euiTheme }: UseEuiTheme) => css`
  font-weight: ${euiTheme.font.weight.semiBold};
`;

export interface AuthorizationPromptProps {
  prompt: AuthorizationPromptDefinition;
  onAuthorize: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  isDisabled?: boolean;
  isAnswered?: boolean;
  answeredValue?: boolean;
}

export const AuthorizationPrompt = ({
  prompt,
  onAuthorize,
  onCancel,
  isLoading = false,
  isDisabled = false,
  isAnswered = false,
  answeredValue,
}: AuthorizationPromptProps) => {
  const { addErrorToast } = useToasts();

  const { connect, cancelConnect, isConnecting } = useConnectorOAuthConnect({
    connectorId: prompt.connector_id,
    redirectMode: OAuthRedirectMode.NewTab,
    onSuccess: onAuthorize,
    onError: (error) => {
      addErrorToast({
        title: labels.errorToastTitle,
        text: formatAgentBuilderErrorMessage(error),
      });
    },
  });

  const handleAuthorize = useCallback(() => {
    cancelConnect();
    connect();
  }, [cancelConnect, connect]);

  const handleCancel = useCallback(() => {
    cancelConnect();
    onCancel();
  }, [cancelConnect, onCancel]);

  const isInteractionDisabled = isDisabled || isLoading || isAnswered || isConnecting;

  return (
    <EuiFlexGroup
      direction="column"
      responsive={false}
      gutterSize="m"
      css={containerStyles}
      data-test-subj="agentBuilderAuthorizationPrompt"
    >
      <EuiFlexGroup
        direction="row"
        alignItems="center"
        gutterSize="s"
        responsive={false}
        css={headerStyles}
      >
        <ConnectorTypeIcon actionTypeId={prompt.connector_type} size="l" />
        <EuiText component="span" css={titleStyles}>
          {labels.title}
        </EuiText>
      </EuiFlexGroup>

      <EuiText component="p" size="s">
        <FormattedMessage
          id="xpack.agentBuilder.authorizationPrompt.message"
          defaultMessage="You need to authorize the {connectorName} connector to continue."
          values={{
            connectorName: <strong>{prompt.connector_name}</strong>,
          }}
        />
      </EuiText>

      <EuiFlexGroup gutterSize="s" justifyContent="flexEnd" responsive={false}>
        <EuiButtonEmpty
          onClick={handleCancel}
          disabled={isInteractionDisabled}
          size="s"
          color={isAnswered && answeredValue === false ? 'danger' : 'text'}
          data-test-subj="agentBuilderAuthorizationPromptCancelButton"
          {...getEbtProps({
            element: AGENT_BUILDER_UI_EBT.element.pageContent,
            action: AGENT_BUILDER_UI_EBT.action.conversation.AUTH_PROMPT_CANCEL,
            detail: 'conversation',
          })}
        >
          {isAnswered && answeredValue === false ? labels.declined : labels.cancel}
        </EuiButtonEmpty>
        <EuiButton
          onClick={handleAuthorize}
          isLoading={isLoading || isConnecting}
          disabled={isInteractionDisabled}
          fill={!isAnswered || answeredValue === true}
          size="s"
          color={isAnswered && answeredValue === true ? 'success' : 'warning'}
          data-test-subj="agentBuilderAuthorizationPromptAuthorizeButton"
          {...getEbtProps({
            element: AGENT_BUILDER_UI_EBT.element.pageContent,
            action: AGENT_BUILDER_UI_EBT.action.conversation.AUTH_PROMPT_AUTHORIZE,
            detail: 'conversation',
          })}
        >
          {isAnswered && answeredValue === true ? labels.authorized : labels.authorize}
        </EuiButton>
      </EuiFlexGroup>
    </EuiFlexGroup>
  );
};
