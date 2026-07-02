/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { i18n } from '@kbn/i18n';
import type { AttachmentsService } from '../../services/attachments/attachements_service';
import { useIsAgentWorkspaceMount } from '../../application/hooks/use_navigation';
import { AgentCartPushFlyout } from './agent_cart_push_flyout';
import { useOptionalConversationSpineContext } from './conversation_spine_context';
import { GenericConversationSpine } from './generic_conversation_spine';

interface ConversationSpineMountProps {
  attachmentsService: AttachmentsService;
}

const spineAriaLabel = i18n.translate('xpack.agentBuilder.conversationSpine.cartFlyout.ariaLabel', {
  defaultMessage: 'Attachment cart',
});

/**
 * Renders the generic conversation spine as a push flyout within the agent workspace column.
 */
export const ConversationSpineMount: React.FC<ConversationSpineMountProps> = ({
  attachmentsService,
}) => {
  const isAgentWorkspaceMount = useIsAgentWorkspaceMount();
  const spineContext = useOptionalConversationSpineContext();
  const isSpineActive = spineContext?.isSpineActive ?? false;
  const isCartFlyoutReady = spineContext?.isCartFlyoutReady ?? true;
  const hasAttachments = spineContext?.hasAttachments ?? false;
  const closeSpine = spineContext?.closeSpine ?? (() => undefined);

  if (!isAgentWorkspaceMount || !isSpineActive || !hasAttachments || !isCartFlyoutReady) {
    return null;
  }

  return (
    <AgentCartPushFlyout
      isOpen={true}
      onClose={() => closeSpine()}
      ariaLabel={spineAriaLabel}
      data-test-subj="agentWorkspaceConversationSpineFlyout"
    >
      <GenericConversationSpine attachmentsService={attachmentsService} />
    </AgentCartPushFlyout>
  );
};
