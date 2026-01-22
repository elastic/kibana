/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCallOut, EuiFlexGroup, EuiLink, useEuiTheme } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import { useKibana } from '../application/hooks/use_kibana';
import { useAgentBuilderServices } from '../application/hooks/use_agent_builder_service';
import { useConversationList } from '../application/hooks/use_conversation_list';
import { useSendMessage } from '../application/context/send_message/send_message_context';
import { useHasConnectorsAllPrivileges } from '../application/hooks/use_has_connectors_all_privileges';
import { storageKeys } from '../application/storage_keys';

export const EmbeddableWelcomeMessage = () => {
  const {
    services: { application },
  } = useKibana();
  const { euiTheme } = useEuiTheme();
  const { docLinksService } = useAgentBuilderServices();
  const hasAccessToGenAiSettings = useHasConnectorsAllPrivileges();

  const [showCallOut, setShowCallOut] = useState(
    !localStorage.getItem(storageKeys.welcomeMessageDismissed)
  );

  const onDismiss = () => {
    localStorage.setItem(storageKeys.welcomeMessageDismissed, 'true');
    setShowCallOut(false);
  };

  const { isResponseLoading } = useSendMessage();

  // Dismiss the welcome message automatically when a message has been sent
  useEffect(() => {
    if (isResponseLoading) {
      onDismiss();
    }
  }, [isResponseLoading]);

  const { conversations = [], isLoading } = useConversationList();
  const hasNoConversations = isLoading === false && conversations.length === 0;

  // Only render the Welcome Message if the user has NO conversations AND the welcome message has not been dismissed
  if (!showCallOut || !hasNoConversations) return null;

  const documentationLink = (
    <EuiLink href={docLinksService.agentBuilder} target="_blank" external>
      <FormattedMessage
        id="xpack.agentBuilder.welcomeMessage.documentationLink"
        defaultMessage="documentation"
      />
    </EuiLink>
  );

  const genAiSettingsLink = (
    <EuiLink
      href={application.getUrlForApp('management', { path: '/ai/genAiSettings' })}
      target="_blank"
      external
    >
      <FormattedMessage
        id="xpack.agentBuilder.welcomeMessage.genAiSettingsLink"
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
            id="xpack.agentBuilder.welcomeMessage.title"
            defaultMessage="Welcome to our new agentic experience"
          />
        }
        iconType="info"
        onDismiss={onDismiss}
      >
        {hasAccessToGenAiSettings ? (
          <FormattedMessage
            id="xpack.agentBuilder.welcomeMessage.contentAdvanced"
            defaultMessage="Based on the new <strong>Agent Builder</strong> platform, <strong>AI Agent</strong> is the new agentic chat experience for this space. Learn more in our {documentationLink} or switch back to the default experience in the {genAiSettingsLink}."
            values={{
              strong: (chunks: React.ReactNode) => <strong>{chunks}</strong>,
              documentationLink,
              genAiSettingsLink,
            }}
          />
        ) : (
          <FormattedMessage
            id="xpack.agentBuilder.welcomeMessage.content"
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
