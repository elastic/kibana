/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import {
  AGENT_BUILDER_UI_EBT,
  ConversationAccessControlMode,
  normalizeConversationAccessControl,
} from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { useConversation } from '../../../../hooks/use_conversation';
import {
  participantsCountAriaLabel,
  publicAccessAriaLabel,
  publicLabel,
} from './conversation_share_i18n';

interface ConversationSharePopoverButtonProps {
  onClick: () => void;
}

export const ConversationSharePopoverButton: React.FC<ConversationSharePopoverButtonProps> = ({
  onClick,
}) => {
  const { conversation } = useConversation();
  const { access_mode: accessMode, entries } = normalizeConversationAccessControl(
    conversation?.access_control
  );

  const isPublic = accessMode === ConversationAccessControlMode.Public;
  // Access-control entries only hold invited members, so the author accounts for the extra one.
  const participantCount = entries.length + 1;

  return (
    <EuiButtonEmpty
      size="s"
      color="text"
      iconType={isPublic ? 'globe' : 'users'}
      aria-label={isPublic ? publicAccessAriaLabel : participantsCountAriaLabel(participantCount)}
      onClick={onClick}
      data-test-subj="agentBuilderConversationInviteButton"
      {...getEbtProps({
        element: AGENT_BUILDER_UI_EBT.element.pageContent,
        action: AGENT_BUILDER_UI_EBT.action.conversation.OPEN_SHARE,
        detail: 'conversation',
      })}
    >
      {isPublic ? publicLabel : participantCount}
    </EuiButtonEmpty>
  );
};
