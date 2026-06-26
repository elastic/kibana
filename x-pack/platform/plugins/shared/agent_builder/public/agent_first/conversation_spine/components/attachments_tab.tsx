/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ActionButton } from '@kbn/agent-builder-browser/attachments';
import type { AttachmentsService } from '../../../services/attachments/attachements_service';
import { AttachmentCartGrid } from '../../../application/components/conversations/conversation_rounds/round_response/attachments/attachment_cart_grid';
import { AttachmentHeader } from '../../../application/components/conversations/conversation_rounds/round_response/attachments/attachment_header';
import { useConversationContext } from '../../../application/context/conversation/conversation_context';
import { useConversationId } from '../../../application/context/conversation/use_conversation_id';
import { useAgentId } from '../../../application/hooks/use_conversation';
import { useAgentBuilderServices } from '../../../application/hooks/use_agent_builder_service';
import {
  shouldOfferSidebarConversation,
  useIsAgentWorkspaceMount,
} from '../../../application/hooks/use_navigation';
import { useConversationSpineContext } from '../conversation_spine_context';
import type { AttachmentsPanelView } from '../types';

interface AttachmentsTabProps {
  attachmentsService: AttachmentsService;
  attachmentsView: AttachmentsPanelView;
}

export const AttachmentsTab: React.FC<AttachmentsTabProps> = ({
  attachmentsService,
  attachmentsView,
}) => {
  const { euiTheme } = useEuiTheme();
  const conversationId = useConversationId();
  const { conversationActions } = useConversationContext();
  const agentId = useAgentId();
  const isAgentWorkspaceMount = useIsAgentWorkspaceMount();
  const { openSidebarConversation: openSidebarConversationInternal } = useAgentBuilderServices();
  const {
    closeSpine,
    closeAttachmentPreview,
    setSpineAttachmentOrigin,
    spineState,
  } = useConversationSpineContext();

  const isSidebar = spineState?.isSidebar ?? false;

  const offerSidebarConversation = shouldOfferSidebarConversation(
    isSidebar,
    isAgentWorkspaceMount
  );

  const openSidebarConversation = useCallback(() => {
    openSidebarConversationInternal({ conversationId });
  }, [conversationId, openSidebarConversationInternal]);

  const [dynamicButtons, setDynamicButtons] = useState<ActionButton[]>([]);

  const attachment =
    attachmentsView.mode === 'attachment' ? attachmentsView.attachment : undefined;

  const uiDefinition = attachment
    ? attachmentsService.getAttachmentUiDefinition(attachment.type)
    : null;

  useEffect(() => {
    setDynamicButtons([]);
  }, [attachment?.id, attachment?.version]);

  const updateOrigin = useCallback(
    async (origin: string) => {
      if (!conversationId || !attachment) {
        return;
      }
      const result = await attachmentsService.updateOrigin(
        conversationId,
        attachment.id,
        origin
      );
      setSpineAttachmentOrigin(origin);
      conversationActions.invalidateConversation();
      return result;
    },
    [
      attachmentsService,
      conversationId,
      attachment,
      setSpineAttachmentOrigin,
      conversationActions,
    ]
  );

  const registerActionButtons = useCallback((buttons: ActionButton[]) => {
    setDynamicButtons(buttons);
  }, []);

  const canvasHeaderActionButtons = useMemo(() => {
    if (!attachment || !uiDefinition) {
      return dynamicButtons;
    }
    const staticButtons =
      uiDefinition.getActionButtons?.({
        attachment,
        isSidebar,
        agentId,
        updateOrigin,
        openSidebarConversation: offerSidebarConversation ? openSidebarConversation : undefined,
        isCanvas: true,
      }) ?? [];
    return [...staticButtons, ...dynamicButtons];
  }, [
    attachment,
    uiDefinition,
    isSidebar,
    agentId,
    updateOrigin,
    offerSidebarConversation,
    openSidebarConversation,
    dynamicButtons,
  ]);

  const bodyStyles = css`
    flex: 1 1 auto;
    min-height: 0;
    overflow: auto;
  `;

  const previewBodyStyles = css`
    ${bodyStyles}
    padding-top: ${euiTheme.size.m};
  `;

  if (attachmentsView.mode === 'grid') {
    return (
      <div css={bodyStyles} data-test-subj="agentBuilderConversationSpineAttachmentsGrid">
        <AttachmentCartGrid />
      </div>
    );
  }

  if (!uiDefinition?.renderCanvasContent || !attachment) {
    return null;
  }

  const title = uiDefinition.getLabel?.(attachment) ?? attachment.type.toUpperCase();
  const header = uiDefinition.getHeader?.({ attachment });
  const headerIcon = header?.icon ?? uiDefinition.getIcon?.();

  return (
    <div
      css={css`
        display: flex;
        flex-direction: column;
        flex: 1 1 auto;
        min-height: 0;
      `}
      data-test-subj="agentBuilderConversationSpineAttachmentsPreview"
    >
      <AttachmentHeader
        icon={headerIcon}
        title={title}
        subtitle={header?.subtitle}
        badges={header?.badges}
        actionButtons={canvasHeaderActionButtons}
        onClose={closeAttachmentPreview}
        previewBadgeState="preview_available"
        squareBottomCorners={true}
      />
      <div css={previewBodyStyles}>
        <React.Fragment key={`${attachment.id}:${attachment.version ?? 'latest'}`}>
          {uiDefinition.renderCanvasContent(
            {
              attachment,
              isSidebar,
              openSidebarConversation: offerSidebarConversation ? openSidebarConversation : undefined,
            },
            {
              registerActionButtons,
              updateOrigin,
              closeCanvas: closeSpine,
            }
          )}
        </React.Fragment>
      </div>
    </div>
  );
};
