/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { ConversationShareButton } from './conversation_share_button';
import { ChatInfoButton } from './chat_info_button';
import { useConversation } from '../../../hooks/use_conversation';

const labels = {
  container: i18n.translate('xpack.agentBuilder.conversationActions.container', {
    defaultMessage: 'Conversation actions',
  }),
};

export const ConversationRightActions = () => {
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
      <EuiFlexItem grow={false}>
        <ConversationShareButton />
      </EuiFlexItem>
      {hasTemplate && (
        <EuiFlexItem grow={false}>
          <ChatInfoButton />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};
