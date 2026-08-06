/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { useAgentBuilderServices } from '../../../hooks/use_agent_builder_service';

const labels = {
  chatInfo: i18n.translate('xpack.agentBuilder.chatInfoButton.label', {
    defaultMessage: 'Chat info',
  }),
};

export const ChatInfoButton: React.FC = () => {
  const conversationId = useConversationId();
  const { openConversationMetadata } = useAgentBuilderServices();

  if (!conversationId) {
    return null;
  }

  return (
    <EuiButton
      size="s"
      color="text"
      fill={false}
      iconType="info"
      onClick={() => openConversationMetadata({ conversationId })}
      data-test-subj="agentBuilderChatInfoButton"
    >
      {labels.chatInfo}
    </EuiButton>
  );
};
