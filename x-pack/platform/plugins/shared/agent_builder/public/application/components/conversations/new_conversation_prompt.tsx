/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiTitle, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';
import { observabilityAgentId } from '@kbn/agent-builder-common';
import { i18n } from '@kbn/i18n';
import { useObservabilityNightshiftEnabled } from '../../hooks/use_observability_nightshift_enabled';
import { useAgentId } from '../../hooks/use_conversation';
import { ObservabilityNightshiftWelcome } from './observability_nightshift/observability_nightshift_welcome';
import { ConversationInput } from './conversation_input/conversation_input';
import {
  conversationElementPaddingStyles,
  conversationElementWidthStyles,
} from './conversation.styles';
import { useConversationContext } from '../../context/conversation/conversation_context';

const titleStyles = css`
  font-weight: 400;
`;

export const NewConversationPrompt: React.FC<{}> = () => {
  const { euiTheme } = useEuiTheme();
  const { isEmbeddedContext } = useConversationContext();
  const agentId = useAgentId() ?? '';
  const isObservabilityAgent = agentId === observabilityAgentId;
  const [observabilityNightshiftEnabled] = useObservabilityNightshiftEnabled();
  const welcomeTitle = i18n.translate('xpack.agentBuilder.conversations.newConversationPrompt', {
    defaultMessage: 'How can I help you?',
  });

  const centerFlexItemStyles = css`
    justify-content: center;
    align-items: center;
    gap: ${euiTheme.size.base};
  `;

  const inputPaddingStyles = css`
    padding-bottom: ${euiTheme.size.base};
  `;

  return (
    <EuiFlexGroup
      responsive={false}
      alignItems="center"
      direction="column"
      justifyContent="center"
      gutterSize="l"
      css={conversationElementWidthStyles}
      data-test-subj="agentBuilderWelcomePage"
    >
      <EuiFlexItem grow={isEmbeddedContext ? true : false} css={centerFlexItemStyles}>
        {isObservabilityAgent && observabilityNightshiftEnabled ? (
          <ObservabilityNightshiftWelcome state="critical" />
        ) : (
          <EuiTitle size="m" css={titleStyles}>
            <h2>{welcomeTitle}</h2>
          </EuiTitle>
        )}
      </EuiFlexItem>
      <EuiFlexItem
        grow={false}
        css={[conversationElementWidthStyles, conversationElementPaddingStyles, inputPaddingStyles]}
      >
        <ConversationInput />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
