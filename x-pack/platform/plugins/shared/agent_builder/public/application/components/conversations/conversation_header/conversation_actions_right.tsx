/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonIcon, EuiFlexGroup, EuiFlexItem, EuiToolTip } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { useConversationContext } from '../../../context/conversation/conversation_context';
// import { SetTypeControl } from './set_type_control';
import { ConversationSharingButton } from './conversation_sharing_button';
import { ChatInfoButton } from './chat_info_button';
import { useConversation } from '../../../hooks/use_conversation';

const labels = {
  container: i18n.translate('xpack.agentBuilder.conversationActions.container', {
    defaultMessage: 'Conversation actions',
  }),
  close: i18n.translate('xpack.agentBuilder.conversationActions.close', {
    defaultMessage: 'Close',
  }),
};

export interface ConversationRightActionsProps {
  onClose?: () => void;
}

export const ConversationRightActions: React.FC<ConversationRightActionsProps> = ({ onClose }) => {
  const { isEmbeddedContext } = useConversationContext();
  const { conversation } = useConversation();
  const hasTemplate = Boolean(conversation?.template_id);

  return (
    <EuiFlexGroup
      gutterSize="s"
      justifyContent="flexEnd"
      alignItems="center"
      aria-label={labels.container}
      responsive={false}
    >
      {/* <EuiFlexItem grow={false}>
        <SetTypeControl />
      </EuiFlexItem> */}
      <EuiFlexItem grow={false}>
        <ConversationSharingButton />
      </EuiFlexItem>
      {hasTemplate && (
        <EuiFlexItem grow={false}>
          <ChatInfoButton />
        </EuiFlexItem>
      )}
      {isEmbeddedContext && (
        <EuiFlexItem grow={false}>
          <EuiToolTip content={labels.close} disableScreenReaderOutput>
            <EuiButtonIcon
              color="text"
              iconType="cross"
              size="m"
              onClick={onClose}
              aria-label={labels.close}
              {...getEbtProps({
                element: AGENT_BUILDER_UI_EBT.element.pageContent,
                action: AGENT_BUILDER_UI_EBT.action.conversation.CLOSE,
                detail: 'conversation',
              })}
            />
          </EuiToolTip>
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
