/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiCollapsibleNavGroup,
  EuiFlexGroup,
  EuiListGroup,
  EuiListGroupItem,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

export interface ConversationsPanelProps {
  conversationIds: string[];
  selectedConversationId?: string;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
}

export const ConversationsPanel: React.FC<ConversationsPanelProps> = ({
  conversationIds,
  selectedConversationId,
  onSelectConversation,
  onNewConversation,
}) => {
  const [isListOpen, setIsListOpen] = useState(conversationIds.length > 1);

  const listItems = useMemo(
    () =>
      conversationIds.map((id, index) => ({
        id,
        label:
          conversationIds.length === 1
            ? i18n.translate('xpack.agentBuilder.caseAiWorkspace.defaultThread', {
                defaultMessage: 'Triage thread',
              })
            : i18n.translate('xpack.agentBuilder.caseAiWorkspace.threadLabel', {
                defaultMessage: 'Thread {number}',
                values: { number: index + 1 },
              }),
      })),
    [conversationIds]
  );

  const conversationSummary =
    conversationIds.length === 0
      ? i18n.translate('xpack.agentBuilder.caseAiWorkspace.noConversations', {
          defaultMessage: 'No conversations yet',
        })
      : i18n.translate('xpack.agentBuilder.caseAiWorkspace.conversationCount', {
          defaultMessage: '{count, plural, one {# conversation} other {# conversations}}',
          values: { count: conversationIds.length },
        });

  return (
    <div data-test-subj="caseAiWorkspaceConversations">
      <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
        <EuiTitle size="xxs">
          <h3>
            {i18n.translate('xpack.agentBuilder.caseAiWorkspace.conversationsTitle', {
              defaultMessage: 'Conversations',
            })}
          </h3>
        </EuiTitle>
        <EuiButtonEmpty
          size="s"
          iconType="plus"
          onClick={onNewConversation}
          data-test-subj="caseAiWorkspaceNewConversation"
        >
          {i18n.translate('xpack.agentBuilder.caseAiWorkspace.newConversation', {
            defaultMessage: 'New conversation',
          })}
        </EuiButtonEmpty>
        {conversationIds.length <= 1 ? (
          <EuiText size="xs" color="subdued">
            {conversationSummary}
          </EuiText>
        ) : (
          <EuiCollapsibleNavGroup
            title={conversationSummary}
            isCollapsible
            initialIsOpen={isListOpen}
            onToggle={(isOpen) => setIsListOpen(isOpen)}
          >
            <EuiListGroup flush gutterSize="none" maxWidth={false}>
              {listItems.map((item) => (
                <EuiListGroupItem
                  key={item.id}
                  label={item.label}
                  size="s"
                  isActive={selectedConversationId === item.id}
                  onClick={() => onSelectConversation(item.id)}
                  data-test-subj={`caseAiWorkspaceConversation-${item.id}`}
                />
              ))}
            </EuiListGroup>
          </EuiCollapsibleNavGroup>
        )}
      </EuiFlexGroup>
    </div>
  );
};
