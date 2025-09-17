/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiTitle,
  EuiLink,
  EuiButton,
  useEuiTheme,
} from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { useNavigation } from '../../hooks/use_navigation';
import { appPaths } from '../../utils/app_paths';
import { ConversationContent } from './conversation_grid';

const fullHeightStyles = css`
  height: 100%;
`;

export const NewConversationPrompt: React.FC<{}> = () => {
  const { euiTheme } = useEuiTheme();
  const { createOnechatUrl } = useNavigation();
  const promptStyles = css`
    max-inline-size: calc(${euiTheme.size.l} * 19);
    padding: ${euiTheme.size.l};
    margin: 0 auto;
  `;
  const labels = {
    container: i18n.translate('xpack.onechat.newConversationPrompt.container', {
      defaultMessage: 'New conversation welcome prompt',
    }),
    title: i18n.translate('xpack.onechat.newConversationPrompt.title', {
      defaultMessage: 'Welcome to Elastic Agent Builder',
    }),
    subtitle: (
      <FormattedMessage
        id="xpack.onechat.newConversationPrompt.subtitle"
        defaultMessage="Work interactively with your AI {agentsLink} using the chat interface. Your selected agent answers questions by searching your data with its assigned {toolsLink}."
        values={{
          agentsLink: (
            <EuiLink href={createOnechatUrl(appPaths.agents.list)}>
              {i18n.translate('xpack.onechat.newConversationPrompt.agentsLinkText', {
                defaultMessage: 'agents',
              })}
            </EuiLink>
          ),
          toolsLink: (
            <EuiLink href={createOnechatUrl(appPaths.tools.list)}>
              {i18n.translate('xpack.onechat.newConversationPrompt.toolsLinkText', {
                defaultMessage: 'tools',
              })}
            </EuiLink>
          ),
        }}
      />
    ),
  };
  return (
    <ConversationContent css={fullHeightStyles}>
      <EuiFlexGroup
        css={promptStyles}
        direction="column"
        alignItems="center"
        justifyContent="center"
        aria-label={labels.container}
      >
        <EuiFlexItem grow={false}>
          <EuiIcon color="primary" size="xxl" type="logoElastic" />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle>
            <h2>{labels.title}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiText textAlign="center" color="subdued">
            <p>{labels.subtitle}</p>
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            href="#"
            target="_blank"
            size="m"
            aria-label={i18n.translate(
              'xpack.onechat.newConversationPrompt.agentBuilderDocsAriaLabel',
              {
                defaultMessage: 'Read Agent Builder documentation',
              }
            )}
          >
            {i18n.translate('xpack.onechat.newConversationPrompt.agentBuilderDocs', {
              defaultMessage: 'Read the docs',
            })}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </ConversationContent>
  );
};
