/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup } from '@elastic/eui';
import { ConversationsHistoryButton } from './conversations_history_button';
import { useHasActiveConversation } from '../../../hooks/use_conversation';
import { NewConversationButton } from './new_conversation_button';

export const ConversationLeftActions: React.FC<{}> = () => {
  const hasActiveConversation = useHasActiveConversation();

  return (
    <EuiFlexGroup gutterSize="s" alignItems="center">
      <ConversationsHistoryButton />
      {hasActiveConversation && <NewConversationButton />}
    </EuiFlexGroup>
  );
};
