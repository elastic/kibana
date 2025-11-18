/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiText, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import React from 'react';
import { docLinks } from '../../../../common/doc_links';
import { TechPreviewBadge } from './tech_preview';

export const WelcomeText: React.FC<{}> = () => {
  const labels = {
    container: i18n.translate('xpack.agentBuilder.newConversationPrompt.container', {
      defaultMessage: 'New conversation welcome prompt',
    }),
    title: i18n.translate('xpack.agentBuilder.newConversationPrompt.title', {
      defaultMessage: 'Welcome to Elastic Agent Builder',
    }),
    subtitle: (
      <FormattedMessage
        id="xpack.agentBuilder.newConversationPrompt.subtitle"
        defaultMessage="Work interactively with your AI {agentsLink} using the chat interface. Your selected agent answers questions by searching your data with its assigned {toolsLink}."
        values={{
          agentsLink: (
            <EuiLink href={docLinks.agentBuilderAgents} target="_blank">
              {i18n.translate('xpack.agentBuilder.newConversationPrompt.agentsLinkText', {
                defaultMessage: 'agents',
              })}
            </EuiLink>
          ),
          toolsLink: (
            <EuiLink href={docLinks.tools} target="_blank">
              {i18n.translate('xpack.agentBuilder.newConversationPrompt.toolsLinkText', {
                defaultMessage: 'tools',
              })}
            </EuiLink>
          ),
        }}
      />
    ),
  };
  return (
    <EuiFlexGroup
      direction="column"
      alignItems="center"
      justifyContent="center"
      aria-label={labels.container}
    >
      <EuiFlexItem grow={false}>
        <EuiIcon color="primary" size="xxl" type="logoElastic" />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <TechPreviewBadge />
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
    </EuiFlexGroup>
  );
};
