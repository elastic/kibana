/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';
import { EuiBadge, EuiButton, EuiFlexGroup, EuiFlexItem, EuiPanel, EuiText } from '@elastic/eui';
import { isPublicConversation } from '@kbn/agent-builder-common';
import { FormattedRelativePreferenceDate } from '../../formatted_date';
import type { FoundConversation } from './use_find_conversations';
import * as i18n from './translations';

export interface ConversationRowProps {
  conversation: FoundConversation;
  agentName: string;
  isAttached: boolean;
  isAttachInFlight: boolean;
  isAttachingAny: boolean;
  onAttach: (conversation: FoundConversation) => void;
}

const ConversationRowComponent: React.FC<ConversationRowProps> = ({
  conversation,
  agentName,
  isAttached,
  isAttachInFlight,
  isAttachingAny,
  onAttach,
}) => {
  const handleClick = useCallback(() => onAttach(conversation), [onAttach, conversation]);
  const title = conversation.title || i18n.UNTITLED_CONVERSATION;

  return (
    <EuiPanel
      hasBorder
      hasShadow={false}
      paddingSize="m"
      data-test-subj={`cases-attach-conversation-card-${conversation.id}`}
    >
      <EuiFlexGroup
        justifyContent="spaceBetween"
        alignItems="center"
        gutterSize="m"
        responsive={false}
      >
        <EuiFlexItem css={{ minWidth: 0 }}>
          <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
            <EuiFlexItem grow={false}>
              <EuiText size="s" className="eui-textTruncate" title={title}>
                <strong>{title}</strong>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexGroup gutterSize="xs" responsive={false} wrap>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow">{agentName}</EuiBadge>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiBadge color="hollow" data-test-subj="cases-attach-conversation-visibility">
                    {isPublicConversation(conversation.access_control)
                      ? i18n.VISIBILITY_PUBLIC
                      : i18n.VISIBILITY_PRIVATE}
                  </EuiBadge>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiText size="xs" color="subdued">
                {`${i18n.UPDATED} `}
                <FormattedRelativePreferenceDate value={conversation.updated_at} />
              </EuiText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            color={isAttached ? 'success' : 'primary'}
            iconType={isAttached ? 'check' : 'plusCircle'}
            isLoading={isAttachInFlight}
            isDisabled={isAttachingAny || isAttached}
            onClick={handleClick}
            aria-label={i18n.ATTACH_ACTION_ARIA_LABEL(title)}
            data-test-subj={`cases-attach-conversation-button-${conversation.id}`}
          >
            {isAttached ? i18n.ATTACHED_ACTION : i18n.ATTACH_ACTION}
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

ConversationRowComponent.displayName = 'ConversationRow';

export const ConversationRow = React.memo(ConversationRowComponent);
