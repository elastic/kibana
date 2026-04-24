/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import type {
  UnknownAttachment,
  ScreenContextAttachmentData,
} from '@kbn/agent-builder-common/attachments';
import { getLatestVersion } from '@kbn/agent-builder-common/attachments';
import type { AttachmentPreviewState } from '@kbn/agent-builder-browser/attachments';
import { EuiSplitPanel } from '@elastic/eui';
import { css } from '@emotion/react';
import type { AttachmentsService } from '../../../../../../services/attachments/attachements_service';
import { useConversationContext } from '../../../../../context/conversation/conversation_context';
import { usePersistedConversationId } from '../../../../../hooks/use_persisted_conversation_id';
import { useAgentBuilderServices } from '../../../../../hooks/use_agent_builder_service';
import { useConversation } from '../../../../../hooks/use_conversation';
import { AttachmentHeader } from './attachment_header';
import { getAttachmentPreviewKey, useCanvasContext } from './canvas_context';

interface InlineAttachmentWithActionsProps {
  attachment: UnknownAttachment;
  attachmentsService: AttachmentsService;
  isSidebar: boolean;
  conversationId: string;
  screenContext?: ScreenContextAttachmentData;
  /** Version number of the attachment being rendered, used for canvas preview comparison */
  version?: number;
  /**
   * Shared preview state for header actions/badges.
   */
  previewBadgeState?: AttachmentPreviewState;
}

/**
 * Component that renders an inline attachment with its action buttons.
 */
export const InlineAttachmentWithActions: React.FC<InlineAttachmentWithActionsProps> = ({
  attachment,
  attachmentsService,
  isSidebar,
  conversationId,
  screenContext,
  version,
  previewBadgeState,
}) => {
  const {
    openCanvas: openCanvasContext,
    previewedAttachmentKey,
    setPreviewedAttachmentKey,
  } = useCanvasContext();
  const { conversationActions } = useConversationContext();
  const { openSidebarConversation: openSidebarConversationInternal } = useAgentBuilderServices();
  const { updatePersistedConversationId } = usePersistedConversationId({});
  const { conversation } = useConversation();

  // Always use the latest version from the query cache so the inline reflects
  // mutations (enable/disable/update) without waiting for the markdown to re-parse.
  const liveAttachment = useMemo(() => {
    const versioned = conversation?.attachments?.find((a) => a.id === attachment.id);
    const latest = versioned ? getLatestVersion(versioned) : undefined;
    if (!latest) return attachment;
    return { ...attachment, data: latest.data, origin: versioned?.origin ?? attachment.origin };
  }, [attachment, conversation?.attachments]);

  const openCanvas = useCallback(() => {
    openCanvasContext(liveAttachment, isSidebar);
  }, [openCanvasContext, liveAttachment, isSidebar]);

  const updateOrigin = useCallback(
    async (origin: string) => {
      const result = await attachmentsService.updateOrigin(conversationId, attachment.id, origin);
      conversationActions.invalidateConversation();
      return result;
    },
    [attachmentsService, conversationId, attachment.id, conversationActions]
  );

  const openSidebarConversation = useCallback(() => {
    if (conversationId) {
      updatePersistedConversationId(conversationId);
    }
    openSidebarConversationInternal();
  }, [conversationId, updatePersistedConversationId, openSidebarConversationInternal]);

  const uiDefinition = attachmentsService.getAttachmentUiDefinition(liveAttachment.type);
  const attachmentPreviewKey = getAttachmentPreviewKey(liveAttachment.id, version);

  const inlineActionButtons = useMemo(
    () =>
      uiDefinition?.getActionButtons?.({
        attachment: liveAttachment,
        isSidebar,
        updateOrigin,
        openCanvas,
        openSidebarConversation: isSidebar ? undefined : openSidebarConversation,
        isCanvas: false,
        setPreviewBadgeState: (nextPreviewState) => {
          setPreviewedAttachmentKey(
            nextPreviewState === 'previewing' ? attachmentPreviewKey : null
          );
        },
      }),
    [
      uiDefinition,
      liveAttachment,
      isSidebar,
      updateOrigin,
      openCanvas,
      setPreviewedAttachmentKey,
      attachmentPreviewKey,
      openSidebarConversation,
    ]
  );

  const isPreviewingAttachment = previewedAttachmentKey === attachmentPreviewKey;

  const resolvedPreviewBadgeState: AttachmentPreviewState =
    previewBadgeState ?? (isPreviewingAttachment ? 'previewing' : 'none');

  if (!uiDefinition) {
    return null;
  }

  const title = uiDefinition?.getLabel?.(liveAttachment) ?? liveAttachment.type.toUpperCase();

  return (
    <EuiSplitPanel.Outer
      grow
      hasShadow={false}
      hasBorder={true}
      css={css`
        overflow: visible; // allow vis actions to overflow
      `}
    >
      <AttachmentHeader
        title={title}
        actionButtons={inlineActionButtons}
        previewBadgeState={resolvedPreviewBadgeState}
      />
      <EuiSplitPanel.Inner grow={false} paddingSize="none">
        {uiDefinition?.renderInlineContent?.({
          attachment: liveAttachment,
          isSidebar,
          screenContext,
          openSidebarConversation: isSidebar ? undefined : openSidebarConversation,
        })}
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
