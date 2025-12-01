/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiFlexGroup, EuiLink, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useState } from 'react';
import { css } from '@emotion/react';
import { useKibana } from '../application/hooks/use_kibana';
import { docLinks } from '../../common/doc_links';
import { useConversationList } from '../application/hooks/use_conversation_list';

// TODO: Replace with actual user role check
const isAdminOrAdvancedUser = false;

const LOCAL_STORAGE_KEY = 'agentBuilder.embeddable.welcomeMessage.dismissed';

export const EmbeddableWelcomeMessage = () => {
  const {
    services: { application },
  } = useKibana();
  const { euiTheme } = useEuiTheme();

  const [showCallOut, setShowCallOut] = useState(!localStorage.getItem(LOCAL_STORAGE_KEY));

  const onDismiss = () => {
    localStorage.setItem(LOCAL_STORAGE_KEY, 'true');
    setShowCallOut(false);
  };

  const { conversations = [], isLoading } = useConversationList();
  const hasNoConversations = isLoading === false && conversations.length === 0;

  // Only render the Welcome Message if the user has NO conversations AND the welcome message has not been dismissed
  if (!showCallOut || hasNoConversations) return null;

  const documentationLink = (
    <EuiLink href={docLinks.agentBuilder} target="_blank" external>
      <FormattedMessage
        id="xpack.onechat.welcomeMessage.documentationLink"
        defaultMessage="documentation"
      />
    </EuiLink>
  );

  const genAiSettingsLink = (
    <EuiLink
      href={application.getUrlForApp('management', { path: '/ai/agentBuilder' })}
      target="_blank"
      external
    >
      <FormattedMessage
        id="xpack.onechat.welcomeMessage.genAiSettingsLink"
        defaultMessage="GenAI Settings"
      />
    </EuiLink>
  );

  return (
    <EuiFlexGroup
      direction="column"
      responsive={false}
      css={css`
        padding: ${euiTheme.size.base};
        flex-grow: 0;
      `}
    >
      <EuiCallOut
        title={
          <FormattedMessage
            id="xpack.onechat.welcomeMessage.title"
            defaultMessage="Welcome to our new agentic experience"
          />
        }
        iconType="info"
        onDismiss={onDismiss}
      >
        {isAdminOrAdvancedUser ? (
          <FormattedMessage
            id="xpack.onechat.welcomeMessage.contentAdvanced"
            defaultMessage="Based on the new <strong>Agent Builder</strong> platform, <strong>AI Agent</strong> is the new agentic chat experience for this space. Learn more in our {documentationLink} or switch back to the default experience in the {genAiSettingsLink}."
            values={{
              strong: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
              documentationLink,
              genAiSettingsLink,
            }}
          />
        ) : (
          <FormattedMessage
            id="xpack.onechat.welcomeMessage.content"
            defaultMessage="Based on the new <strong>Agent Builder</strong> platform, <strong>AI Agent</strong> is the new agentic chat experience for this space. Learn more in our {documentationLink}."
            values={{
              strong: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
              documentationLink,
            }}
          />
        )}
      </EuiCallOut>
    </EuiFlexGroup>
  );
};
