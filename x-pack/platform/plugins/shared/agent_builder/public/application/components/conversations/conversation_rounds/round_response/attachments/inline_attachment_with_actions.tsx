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
import { useAgentId } from '../../../../../hooks/use_conversation';
import { useAgentBuilderServices } from '../../../../../hooks/use_agent_builder_service';
import { AttachmentHeader } from './attachment_header';
import { getAttachmentPreviewKey, useCanvasContext } from './canvas_context';

interface InlineAttachmentWithActionsProps {
  attachment: UnknownAttachment;
  attachmentsService: AttachmentsService;
  isSidebar: boolean;
  conversationId: string;
  screenContext?: ScreenContextAttachmentData;
  /**
   * Shared preview state for header actions/badges.
   */
  previewBadgeState?: AttachmentPreviewState;
}

const areInlineAttachmentPropsEqual = (
  prevProps: InlineAttachmentWithActionsProps,
  nextProps: InlineAttachmentWithActionsProps
): boolean =>
  prevProps.attachment.id === nextProps.attachment.id &&
  prevProps.attachment.type === nextProps.attachment.type &&
  prevProps.attachment.hidden === nextProps.attachment.hidden &&
  prevProps.attachment.origin === nextProps.attachment.origin &&
  prevProps.attachmentsService === nextProps.attachmentsService &&
  prevProps.conversationId === nextProps.conversationId &&
  prevProps.isSidebar === nextProps.isSidebar &&
  prevProps.previewBadgeState === nextProps.previewBadgeState &&
  prevProps.screenContext === nextProps.screenContext &&
  prevProps.attachment.version === nextProps.attachment.version &&
  prevProps.attachment.versionCount === nextProps.attachment.versionCount;

/**
 * Component that renders an inline attachment with its action buttons.
 */
const InlineAttachmentWithActionsComponent: React.FC<InlineAttachmentWithActionsProps> = ({
  attachment,
  attachmentsService,
  isSidebar,
  conversationId,
  screenContext,
  previewBadgeState,
}) => {
  const {
    openCanvas: openCanvasContext,
    closeCanvas,
    previewedAttachmentKey,
    setPreviewedAttachmentKey,
  } = useCanvasContext();
  const { conversationActions } = useConversationContext();
  const agentId = useAgentId();
  const { openSidebarConversation: openSidebarConversationInternal } = useAgentBuilderServices();

  const openCanvas = useCallback(() => {
    openCanvasContext(attachment, isSidebar);
  }, [openCanvasContext, attachment, isSidebar]);

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
  const attachmentPreviewKey = getAttachmentPreviewKey(attachment.id, attachment.version);
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
        agentId,
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
      agentId,
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
  const header = uiDefinition?.getHeader?.({ attachment });
  const maxWidth = uiDefinition?.getMaxWidth?.(attachment);

  return (
    <EuiSplitPanel.Outer
      grow
      hasShadow={false}
      hasBorder={true}
      css={css`
        overflow: visible; // allow vis actions to overflow
        ${maxWidth !== undefined ? `max-width: ${maxWidth}px;` : ''}
      `}
    >
      <AttachmentHeader
        icon={header?.icon}
        title={title}
        subtitle={header?.subtitle}
        badges={header?.badges}
        actionButtons={inlineActionButtons}
        previewBadgeState={resolvedPreviewBadgeState}
        onClosePreview={closeCanvas}
      />
      <EuiSplitPanel.Inner grow={false} paddingSize="none">
        {uiDefinition?.renderInlineContent?.(
          {
            attachment,
            isSidebar,
            screenContext,
            openSidebarConversation: isSidebar ? undefined : openSidebarConversation,
          },
          { registerActionButtons }
        )}
      </EuiSplitPanel.Inner>
    </EuiSplitPanel.Outer>
  );
};

export const InlineAttachmentWithActions = React.memo(
  InlineAttachmentWithActionsComponent,
  areInlineAttachmentPropsEqual
);
InlineAttachmentWithActions.displayName = 'InlineAttachmentWithActions';
