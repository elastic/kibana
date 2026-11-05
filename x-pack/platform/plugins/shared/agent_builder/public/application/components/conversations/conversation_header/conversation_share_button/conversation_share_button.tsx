/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiButtonEmpty } from '@elastic/eui';
import {
  AGENT_BUILDER_UI_EBT,
  isPrivatelySharedConversation,
  normalizeConversationAccessControl,
} from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { useConversation, useConversationPermissions } from '../../../../hooks/use_conversation';
import { ConversationShareFlyout } from './conversation_share_flyout';
import { shareLabel } from './conversation_share_i18n';

export const ConversationShareButton: React.FC = () => {
  const { update_access_control: canUpdateAccessControl } = useConversationPermissions();
  const { conversation } = useConversation();
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);
  const accessControl = normalizeConversationAccessControl(conversation?.access_control);
  const canOpenShareFlyout = canUpdateAccessControl || isPrivatelySharedConversation(accessControl);

  if (!conversation || !canOpenShareFlyout) {
    return null;
  }

  return (
    <>
      <EuiButtonEmpty
        size="s"
        color="text"
        iconType="share"
        onClick={() => setIsFlyoutOpen((isOpen) => !isOpen)}
        data-test-subj="agentBuilderConversationInviteButton"
        {...getEbtProps({
          element: AGENT_BUILDER_UI_EBT.element.pageContent,
          action: AGENT_BUILDER_UI_EBT.action.conversation.OPEN_SHARE,
          detail: 'conversation',
        })}
      >
        {shareLabel}
      </EuiButtonEmpty>
      {isFlyoutOpen ? (
        // Keyed so switching chats with the flyout open starts fresh, without carrying pending invites over.
        <ConversationShareFlyout
          key={conversation.id}
          conversation={conversation}
          onClose={() => setIsFlyoutOpen(false)}
        />
      ) : null}
    </>
  );
};
