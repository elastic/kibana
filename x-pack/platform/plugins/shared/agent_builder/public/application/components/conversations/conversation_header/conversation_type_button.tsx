/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButton } from '@elastic/eui';
import { CONVERSATION_TEMPLATES } from '../../../../../common/templates';
import { useConversationId } from '../../../context/conversation/use_conversation_id';
import { useConversation } from '../../../hooks/use_conversation';

export const ConversationTypeButton: React.FC = () => {
  const conversationId = useConversationId();
  const { conversation } = useConversation();

  if (!conversationId || !conversation?.template_id) {
    return null;
  }

  const appliedTemplate = CONVERSATION_TEMPLATES.find(
    (template) => template.id === conversation.template_id
  );

  return (
    <EuiButton
      size="s"
      color="text"
      fill={false}
      onClick={() => {}}
      data-test-subj="agentBuilderConversationTypeButton"
    >
      {appliedTemplate?.name ?? conversation.template_id}
    </EuiButton>
  );
};
