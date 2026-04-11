/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import {
  EuiButton,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { useConversationContext } from '../../../context/conversation/conversation_context';
import { useSendMessage } from '../../../context/send_message/send_message_context';
import { useAgentBuilderAgents } from '../../../hooks/agents/use_agents';
import { useAgentId } from '../../../hooks/use_conversation';
import { AgentAvatar } from '../../common/agent_avatar';
import { EmbeddableConversationList } from './embeddable_conversation_list';

const labels = {
  newChat: i18n.translate('xpack.agentBuilder.embeddableConversationsView.newChat', {
    defaultMessage: 'New chat',
  }),
  searchPlaceholder: i18n.translate(
    'xpack.agentBuilder.embeddableConversationsView.searchPlaceholder',
    { defaultMessage: 'Search chats' }
  ),
  availableAgents: i18n.translate(
    'xpack.agentBuilder.embeddableConversationsView.availableAgents',
    { defaultMessage: 'Available agents' }
  ),
};

interface ConversationsPopoverViewProps {
  panelHeight: number;
  panelWidth: number;
  onSwitchToAgents: () => void;
  onClose: () => void;
}

export const ConversationsPopoverView: React.FC<ConversationsPopoverViewProps> = ({
  panelHeight,
  panelWidth,
  onSwitchToAgents,
  onClose,
}) => {
  const [searchValue, setSearchValue] = useState('');

  const { euiTheme } = useEuiTheme();
  const { setConversationId } = useConversationContext();
  const { removeError } = useSendMessage();
  const { agents } = useAgentBuilderAgents();
  const agentId = useAgentId();

  const currentAgent = agents.find((a) => a.id === agentId);

  const handleNewChat = () => {
    removeError();
    setConversationId?.(undefined);
    onClose();
  };

  const agentRowStyles = css`
    padding: ${euiTheme.size.base};
    cursor: pointer;
    &:hover {
      background: ${euiTheme.colors.backgroundBaseSubdued};
    }
  `;

  const searchRowStyles = css`
    padding: ${euiTheme.size.s} ${euiTheme.size.m};
  `;

  const listStyles = css`
    padding: ${euiTheme.size.xs} ${euiTheme.size.s};
    overflow-y: auto;
    min-height: 0;
  `;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="none"
      css={css`
        width: ${panelWidth}px;
        height: ${panelHeight}px;
      `}
    >
      {/* Agent row — click to switch to agents view */}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup
          alignItems="center"
          gutterSize="s"
          responsive={false}
          css={agentRowStyles}
          onClick={onSwitchToAgents}
          data-test-subj="agentBuilderEmbeddableAgentRow"
        >
          {currentAgent && (
            <EuiFlexItem grow={false}>
              <AgentAvatar agent={currentAgent} size="l" color="subdued" shape="circle" />
            </EuiFlexItem>
          )}
          <EuiFlexItem grow>
            <EuiText size="s">
              <strong>{currentAgent?.name}</strong>
            </EuiText>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiIcon type="arrowRight" aria-label={labels.availableAgents} color="text" size="m" />
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiHorizontalRule margin="none" />

      {/* Search + New chat */}
      <EuiFlexItem grow={false}>
        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} css={searchRowStyles}>
          <EuiFlexItem>
            <EuiFieldSearch
              compressed
              placeholder={labels.searchPlaceholder}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              data-test-subj="agentBuilderEmbeddableConversationSearch"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              size="s"
              color="text"
              iconType="plus"
              onClick={handleNewChat}
              data-test-subj="agentBuilderEmbeddableNewChatButton"
            >
              {labels.newChat}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>

      <EuiHorizontalRule margin="none" />

      {/* Conversation list — scrollable */}
      <EuiFlexItem grow css={listStyles}>
        <EmbeddableConversationList searchValue={searchValue} onClose={onClose} />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
