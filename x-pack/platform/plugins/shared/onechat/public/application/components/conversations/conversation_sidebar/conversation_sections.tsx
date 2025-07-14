/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiListGroup, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { Conversation } from '@kbn/onechat-common';
import React, { useMemo } from 'react';
import { groupConversationsByTime } from '../../../utils/group_conversations';
import { ConversationItem } from './conversation_item';
import { NoConversationsPrompt } from './no_conversations_prompt';

interface ConversationSectionsProps {
  conversations: Conversation[];
}

const emptyStyles = css`
  align-self: center;
  justify-content: center;
`;

export const ConversationSections: React.FC<ConversationSectionsProps> = ({ conversations }) => {
  const timeSections = useMemo(() => {
    if (!conversations || conversations.length === 0) {
      return [];
    }
    return groupConversationsByTime(conversations);
  }, [conversations]);

  if (timeSections.length === 0) {
    return (
      <EuiFlexItem css={emptyStyles}>
        <NoConversationsPrompt />
      </EuiFlexItem>
    );
  }

  return (
    <>
      {timeSections.map(({ label, conversations: sectionConversations }) => (
        <EuiFlexItem key={label} grow={false}>
          <EuiFlexGroup direction="column" gutterSize="s">
            <EuiText size="xs" color="subdued">
              {label}
            </EuiText>

            <EuiListGroup
              aria-label={i18n.translate('xpack.onechat.conversationSidebar.section', {
                defaultMessage: 'Conversations from {sectionLabel}',
                values: { sectionLabel: label },
              })}
              flush
            >
              {sectionConversations.map((conversation) => (
                <ConversationItem key={conversation.id} conversation={conversation} />
              ))}
            </EuiListGroup>
          </EuiFlexGroup>
        </EuiFlexItem>
      ))}
    </>
  );
};
