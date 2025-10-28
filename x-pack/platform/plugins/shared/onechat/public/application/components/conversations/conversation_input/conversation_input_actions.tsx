/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import { ConversationAgentSelector } from '../conversation_agent_selector';
import { ConversationActionButton } from './conversation_action_button';

interface ConversationInputActionsProps {
  onSubmit: () => void;
  isSubmitDisabled: boolean;
  resetToPendingMessage: () => void;
  agentId?: string;
}

export const ConversationInputActions: React.FC<ConversationInputActionsProps> = ({
  onSubmit,
  isSubmitDisabled,
  resetToPendingMessage,
  agentId,
}) => {
  return (
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center" justifyContent="flexEnd">
        <EuiFlexItem grow={false}>
          <ConversationAgentSelector agentId={agentId} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <ConversationActionButton
            onSubmit={onSubmit}
            isSubmitDisabled={isSubmitDisabled}
            resetToPendingMessage={resetToPendingMessage}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
  );
};
