/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import React, { useEffect, useState } from 'react';
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

const NIGHTSHIFT_WELCOME_LOAD_MIN_MS = 1000;
const NIGHTSHIFT_WELCOME_LOAD_MAX_MS = 2000;

const randomNightshiftWelcomeLoadMs = (): number =>
  NIGHTSHIFT_WELCOME_LOAD_MIN_MS +
  Math.floor(Math.random() * (NIGHTSHIFT_WELCOME_LOAD_MAX_MS - NIGHTSHIFT_WELCOME_LOAD_MIN_MS + 1));

export const NewConversationPrompt: React.FC<{}> = () => {
  const { euiTheme } = useEuiTheme();
  const { isEmbeddedContext } = useConversationContext();
  const agentId = useAgentId() ?? '';
  const isObservabilityAgent = agentId === observabilityAgentId;
  const [observabilityNightshiftEnabled] = useObservabilityNightshiftEnabled();
  const [isNightshiftWelcomeReady, setIsNightshiftWelcomeReady] = useState(
    () => !(isObservabilityAgent && observabilityNightshiftEnabled)
  );
  const welcomeTitle = i18n.translate('xpack.agentBuilder.conversations.newConversationPrompt', {
    defaultMessage: 'How can I help you?',
  });

  const nightshiftWelcomeLoadingMessage = i18n.translate(
    'xpack.agentBuilder.observabilityNightshift.welcomeLoading',
    {
      defaultMessage: 'Loading nightshift overview…',
    }
  );

  useEffect(() => {
    if (!isObservabilityAgent || !observabilityNightshiftEnabled) {
      setIsNightshiftWelcomeReady(true);
      return;
    }

    setIsNightshiftWelcomeReady(false);
    const timeoutId = window.setTimeout(() => {
      setIsNightshiftWelcomeReady(true);
    }, randomNightshiftWelcomeLoadMs());

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [agentId, isObservabilityAgent, observabilityNightshiftEnabled]);

  const centerFlexItemStyles = css`
    justify-content: center;
    align-items: center;
    gap: ${euiTheme.size.base};
  `;

  const inputPaddingStyles = css`
    padding-bottom: ${euiTheme.size.base};
  `;

  const nightshiftLoadingPlaceholderStyles = css`
    width: 100%;
    min-height: 480px;
    justify-content: center;
    align-items: center;
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
          isNightshiftWelcomeReady ? (
            <ObservabilityNightshiftWelcome state="critical" />
          ) : (
            <EuiFlexGroup
              direction="column"
              alignItems="center"
              justifyContent="center"
              gutterSize="m"
              responsive={false}
              css={nightshiftLoadingPlaceholderStyles}
              data-test-subj="agentBuilderObservabilityNightshiftWelcomeLoading"
            >
              <EuiFlexItem grow={false}>
                <EuiLoadingSpinner size="xl" />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiText size="s" color="subdued" textAlign="center">
                  {nightshiftWelcomeLoadingMessage}
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          )
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
