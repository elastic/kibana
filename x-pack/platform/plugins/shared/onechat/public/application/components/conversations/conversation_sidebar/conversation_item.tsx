/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiListGroupItem } from '@elastic/eui';
import { Conversation } from '@kbn/onechat-common';
import React from 'react';
import { useConversationId } from '../../../hooks/use_conversation_id';
import { useNavigation } from '../../../hooks/use_navigation';
import { appPaths } from '../../../utils/app_paths';

interface ConversationItemProps {
  conversation: Conversation;
}

export const ConversationItem: React.FC<ConversationItemProps> = ({ conversation }) => {
  const { createOnechatUrl } = useNavigation();
  const currentConversationId = useConversationId();
  const isActive = currentConversationId === conversation.id;
  return (
    <EuiListGroupItem
      color="text"
      size="s"
      href={createOnechatUrl(appPaths.chat.conversation({ conversationId: conversation.id }))}
      data-test-subj={`conversationItem-${conversation.id}`}
      label={conversation.title}
      isActive={isActive}
    />
  );
};
