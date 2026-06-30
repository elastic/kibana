/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { useCallback, useMemo } from 'react';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { isAttachmentActive } from '@kbn/agent-builder-common/attachments';
import { notifyAttachmentLinkStateChange } from '../../../../../../agent_first/attachment_link_bridge';
import { useOptionalConversationSpineContext } from '../../../../../../agent_first/conversation_spine/conversation_spine_context';
import { useConversationContext } from '../../../../../context/conversation/conversation_context';
import { useConversationId } from '../../../../../context/conversation/use_conversation_id';
import { useConversation } from '../../../../../hooks/use_conversation';
import { useAgentBuilderServices } from '../../../../../hooks/use_agent_builder_service';
import { useIsAgentWorkspaceMount } from '../../../../../hooks/use_navigation';
import { useToasts } from '../../../../../hooks/use_toasts';

const unpinAriaLabel = i18n.translate('xpack.agentBuilder.attachmentCartCard.unpinAriaLabel', {
  defaultMessage: 'Remove pinned item',
});

const unpinErrorTitle = i18n.translate('xpack.agentBuilder.attachmentCartCard.unpinErrorTitle', {
  defaultMessage: 'Could not remove pinned item',
});

export const useUnpinAttachment = (attachment: UnknownAttachment) => {
  const conversationId = useConversationId();
  const { attachments: pendingAttachments, removeAttachment, conversationActions } =
    useConversationContext();
  const { conversation } = useConversation();
  const { attachmentsService } = useAgentBuilderServices();
  const { addErrorToast } = useToasts();
  const isAgentWorkspaceMount = useIsAgentWorkspaceMount();
  const spineContext = useOptionalConversationSpineContext();

  const canUnpin =
    isAgentWorkspaceMount &&
    Boolean(attachment.id) &&
    attachment.type !== 'screen_context';

  const unpin = useCallback(async () => {
    if (!canUnpin || !attachment.id) {
      return;
    }

    const attachmentId = attachment.id;
    const pendingIndex =
      pendingAttachments?.findIndex((pendingAttachment) => pendingAttachment.id === attachmentId) ??
      -1;

    if (pendingIndex >= 0) {
      removeAttachment?.(pendingIndex);
    }

    const persistedAttachment = conversation?.attachments?.find(
      (persisted) => persisted.id === attachmentId
    );
    const isPersisted = persistedAttachment != null && isAttachmentActive(persistedAttachment);

    if (isPersisted && conversationId) {
      try {
        await attachmentsService.deleteAttachment(conversationId, attachmentId);
        conversationActions.setAttachments({
          attachments: (conversation?.attachments ?? []).map((persisted) =>
            persisted.id === attachmentId ? { ...persisted, active: false } : persisted
          ),
        });
        conversationActions.invalidateConversation();
      } catch {
        addErrorToast({ title: unpinErrorTitle });
        return;
      }
    }

    if (
      spineContext?.spineState?.attachmentsView.mode === 'attachment' &&
      spineContext.spineState.attachmentsView.attachment.id === attachmentId
    ) {
      spineContext.closeAttachmentPreview();
    }

    notifyAttachmentLinkStateChange();
  }, [
    addErrorToast,
    attachment.id,
    attachmentsService,
    canUnpin,
    conversation?.attachments,
    conversationActions,
    conversationId,
    pendingAttachments,
    removeAttachment,
    spineContext,
  ]);

  return useMemo(
    () => ({
      canUnpin,
      unpin,
      unpinAriaLabel,
    }),
    [canUnpin, unpin]
  );
};
