/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import type {
  UnknownAttachment,
  ScreenContextAttachmentData,
} from '@kbn/agent-builder-common/attachments';
import type { ActionButton, AttachmentPreviewState } from '@kbn/agent-builder-browser/attachments';
import { EuiSplitPanel } from '@elastic/eui';
import { css } from '@emotion/react';
import type { AttachmentsService } from '../../../../../../services/attachments/attachements_service';
import { useConversationContext } from '../../../../../context/conversation/conversation_context';
import { useAgentBuilderServices } from '../../../../../hooks/use_agent_builder_service';
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

  const openCanvas = useCallback(() => {
    openCanvasContext(attachment, isSidebar, version);
  }, [openCanvasContext, attachment, isSidebar, version]);

  const updateOrigin = useCallback(
    async (origin: string) => {
      const result = await attachmentsService.updateOrigin(conversationId, attachment.id, origin);
      conversationActions.invalidateConversation();
      return result;
    },
    [attachmentsService, conversationId, attachment.id, conversationActions]
  );

  const openSidebarConversation = useCallback(() => {
    openSidebarConversationInternal({ conversationId });
  }, [conversationId, openSidebarConversationInternal]);

  const uiDefinition = attachmentsService.getAttachmentUiDefinition(attachment.type);
  const attachmentPreviewKey = getAttachmentPreviewKey(attachment.id, version);
  const [dynamicButtonsState, setDynamicButtonsState] = useState<{
    key: string;
    buttons: ActionButton[];
  }>({ key: attachmentPreviewKey, buttons: [] });

  const registerActionButtons = useCallback(
    (buttons: ActionButton[]) => {
      setDynamicButtonsState({ key: attachmentPreviewKey, buttons });
    },
    [attachmentPreviewKey]
  );

  const staticActionButtons = useMemo(
    () =>
      uiDefinition?.getActionButtons?.({
        attachment,
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
      }) ?? [],
    [
      uiDefinition,
      attachment,
      isSidebar,
      updateOrigin,
      openCanvas,
      setPreviewedAttachmentKey,
      attachmentPreviewKey,
      openSidebarConversation,
    ]
  );

  const inlineActionButtons = useMemo(
    () => [
      ...staticActionButtons,
      ...(dynamicButtonsState.key === attachmentPreviewKey ? dynamicButtonsState.buttons : []),
    ],
    [staticActionButtons, attachmentPreviewKey, dynamicButtonsState]
  );

  const isPreviewingAttachment = previewedAttachmentKey === attachmentPreviewKey;

  const resolvedPreviewBadgeState: AttachmentPreviewState =
    previewBadgeState ?? (isPreviewingAttachment ? 'previewing' : 'none');

  if (!uiDefinition) {
    return null;
  }

  const title = uiDefinition?.getLabel?.(attachment) ?? attachment.type.toUpperCase();

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
        {uiDefinition?.renderInlineContent?.(
          {
            attachment,
            isSidebar,
            screenContext,
            openSidebarConversation: isSidebar ? undefined : openSidebarConversation,
          },
          {
            registerActionButtons,
          }
        )}
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};
