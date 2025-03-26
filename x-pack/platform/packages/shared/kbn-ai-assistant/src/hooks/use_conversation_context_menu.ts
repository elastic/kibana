/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';
import type { Message, Conversation } from '@kbn/observability-ai-assistant-plugin/common';
import { useAIAssistantAppService } from './use_ai_assistant_app_service';
import { useKibana } from './use_kibana';
import { deserializeMessage } from '../utils/deserialize_message';

export interface CopyConversationToClipboardParams {
  conversation: Conversation;
  messages: Message[];
}

export interface UseConversationContextMenuResult {
  deleteConversation: (id: string) => Promise<void>;
  copyConversationToClipboard: (conversation: Conversation) => void;
  copyUrl: (id: string) => void;
}

export function useConversationContextMenu({
  setIsUpdatingConversationList,
  refreshConversations,
}: {
  setIsUpdatingConversationList: (isUpdating: boolean) => void;
  refreshConversations: () => void;
}): UseConversationContextMenuResult {
  const service = useAIAssistantAppService();

  const { notifications, http } = useKibana().services;

  const handleDeleteConversation = async (id: string) => {
    setIsUpdatingConversationList(true);

    try {
      await service.callApi(
        'DELETE /internal/observability_ai_assistant/conversation/{conversationId}',
        {
          params: {
            path: {
              conversationId: id,
            },
          },
          signal: null,
        }
      );

      refreshConversations();
    } catch (err) {
      notifications!.toasts.addError(err, {
        title: i18n.translate('xpack.aiAssistant.flyout.deleteConversationErrorToast', {
          defaultMessage: 'Could not delete conversation',
        }),
        toastMessage: err.body?.message,
      });
    }

    setIsUpdatingConversationList(false);
  };

  const handleCopyConversationToClipboard = (conversation: Conversation) => {
    try {
      const deserializedMessages = conversation.messages.map(deserializeMessage);

      const content = JSON.stringify({
        title: conversation.conversation.title,
        systemMessage: conversation.systemMessage,
        messages: deserializedMessages,
      });

      navigator.clipboard?.writeText(content || '');

      notifications!.toasts.addSuccess({
        title: i18n.translate('xpack.aiAssistant.copyConversationSuccessToast', {
          defaultMessage: 'Conversation content copied to clipboard in JSON format',
        }),
      });
    } catch (error) {
      notifications!.toasts.addError(error, {
        title: i18n.translate('xpack.aiAssistant.copyConversationErrorToast', {
          defaultMessage: 'Could not copy conversation',
        }),
      });
    }
  };

  const handleCopyUrl = (id: string) => {
    try {
      const conversationUrl = http?.basePath.prepend(
        `/app/observabilityAIAssistant/conversations/${id}`
      );

      if (!conversationUrl) {
        throw new Error('Conversation URL does not exist');
      }

      const urlToCopy = new URL(conversationUrl, window.location.origin).toString();
      navigator.clipboard?.writeText(urlToCopy);

      notifications!.toasts.addSuccess({
        title: i18n.translate('xpack.aiAssistant.copyUrlSuccessToast', {
          defaultMessage: 'Conversation URL copied to clipboard',
        }),
      });
    } catch (error) {
      notifications!.toasts.addError(error, {
        title: i18n.translate('xpack.aiAssistant.copyUrlErrorToast', {
          defaultMessage: 'Could not copy conversation URL',
        }),
      });
    }
  };

  return {
    deleteConversation: handleDeleteConversation,
    copyConversationToClipboard: handleCopyConversationToClipboard,
    copyUrl: handleCopyUrl,
  };
}
