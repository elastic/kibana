/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import type { UnknownAttachment } from '@kbn/agent-builder-common/attachments';
import { ActionButtonType, type ActionButton } from '@kbn/agent-builder-browser/attachments';
import { useConversationContext } from '../../../../../context/conversation/conversation_context';
import { useConversationId } from '../../../../../context/conversation/use_conversation_id';
import { useAgentId } from '../../../../../hooks/use_conversation';
import { useAgentBuilderServices } from '../../../../../hooks/use_agent_builder_service';
import {
  shouldOfferSidebarConversation,
  useIsAgentWorkspaceMount,
} from '../../../../../hooks/use_navigation';
import { useOptionalConversationSpineContext } from '../../../../../../agent_first/conversation_spine/conversation_spine_context';
import { useCanvasContext } from './canvas_context';

const GROUP_ATTACHMENT_TYPE = 'group';

export const pickCartActivationButton = (buttons: ActionButton[]): ActionButton | undefined => {
  const enabledButtons = buttons.filter((button) => !button.disabled);

  const primaryButton = enabledButtons.find(
    (button) => button.type === ActionButtonType.PRIMARY
  );
  if (primaryButton) {
    return primaryButton;
  }

  return enabledButtons.find((button) => button.type === ActionButtonType.SECONDARY);
};

export const useAttachmentCartActivation = () => {
  const { openCanvas, closeCanvas } = useCanvasContext();
  const spineContext = useOptionalConversationSpineContext();
  const { conversationActions, isEmbeddedContext } = useConversationContext();
  const conversationId = useConversationId();
  const agentId = useAgentId();
  const isAgentWorkspaceMount = useIsAgentWorkspaceMount();
  const { attachmentsService, openSidebarConversation: openSidebarConversationInternal } =
    useAgentBuilderServices();

  const isSidebar = isEmbeddedContext;

  const offerSidebarConversation = shouldOfferSidebarConversation(
    isSidebar,
    isAgentWorkspaceMount
  );

  const openSidebarConversation = useCallback(() => {
    openSidebarConversationInternal({ conversationId });
  }, [conversationId, openSidebarConversationInternal]);

  const activateAttachment = useCallback(
    async (attachment: UnknownAttachment) => {
      if (!conversationId) {
        return;
      }

      if (attachment.type === GROUP_ATTACHMENT_TYPE) {
        return;
      }

      const uiDefinition = attachmentsService.getAttachmentUiDefinition(attachment.type);
      if (!uiDefinition) {
        return;
      }

      const hasActionButtons = uiDefinition.getActionButtons !== undefined;
      const hasCanvasContent = uiDefinition.renderCanvasContent !== undefined;

      if (!hasActionButtons && !hasCanvasContent) {
        return;
      }

      closeCanvas();

      const updateOrigin = async (origin: string) => {
        const result = await attachmentsService.updateOrigin(
          conversationId,
          attachment.id,
          origin
        );
        conversationActions.invalidateConversation();
        return result;
      };

      const openCanvasForAttachment = () => {
        if (isAgentWorkspaceMount && !isSidebar && spineContext) {
          spineContext.openAttachmentPreview(attachment);
          return;
        }
        openCanvas(attachment, isSidebar);
      };

      if (hasActionButtons) {
        const buttons =
          uiDefinition.getActionButtons?.({
            attachment,
            isSidebar,
            agentId,
            updateOrigin,
            openCanvas: openCanvasForAttachment,
            openSidebarConversation: offerSidebarConversation
              ? openSidebarConversation
              : undefined,
            isCanvas: false,
            openTarget: 'nativeApp',
          }) ?? [];

        const activationButton = pickCartActivationButton(buttons);
        if (activationButton) {
          await activationButton.handler();
          return;
        }
      }

      if (hasCanvasContent) {
        openCanvasForAttachment();
      }
    },
    [
      attachmentsService,
      closeCanvas,
      conversationActions,
      conversationId,
      agentId,
      isSidebar,
      offerSidebarConversation,
      openCanvas,
      openSidebarConversation,
      spineContext,
    ]
  );

  return { activateAttachment };
};
