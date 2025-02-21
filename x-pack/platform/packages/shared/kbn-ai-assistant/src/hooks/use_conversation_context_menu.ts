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

export interface UseConversationContextMenuProps {
  initialTitle?: string;
  setIsUpdatingConversationList: (isUpdating: boolean) => void;
  refreshConversations: () => void;
}

export interface UseConversationContextMenuResult {
  deleteConversation: (id: string) => Promise<void>;
  copyConversationToClipboard: ({
    conversation,
    messages,
  }: CopyConversationToClipboardParams) => void;
  copyUrl: (conversation: Conversation) => void;
}

export function useConversationContextMenu({
  initialTitle,
  setIsUpdatingConversationList,
  refreshConversations,
}: UseConversationContextMenuProps): UseConversationContextMenuResult {
  const service = useAIAssistantAppService();

  const {
    services: { notifications, http },
  } = useKibana();

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
        title: i18n.translate('xpack.aiAssistant.flyout.failedToDeleteConversation', {
          defaultMessage: 'Could not delete conversation',
        }),
      });
    }
  };

  const handleCopyConversationToClipboard = ({
    conversation,
    messages,
  }: CopyConversationToClipboardParams) => {
    try {
      const deserializedMessages = (conversation?.messages ?? messages).map(deserializeMessage);

      const content = JSON.stringify({
        title: conversation?.conversation.title || initialTitle,
        systemMessage: conversation?.systemMessage,
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

  const handleCopyUrl = (conversation: Conversation) => {
    try {
      const conversationId = conversation?.conversation?.id;

      if (!conversationId) {
        throw new Error('Cannot copy URL if the conversation is not stored');
      }

      const conversationUrl = http?.basePath.prepend(
        `/app/observabilityAIAssistant/conversations/${conversationId}`
      );

      if (!conversationUrl) {
        throw new Error('Conversation URL does not exist');
      }

      const urlToCopy = new URL(conversationUrl, window.location.origin).toString();
      navigator.clipboard?.writeText(urlToCopy);

      notifications!.toasts.addSuccess({
        title: i18n.translate('xpack.aiAssistant.copyUrlSuccessToast', {
          defaultMessage: 'URL copied to clipboard',
        }),
      });
    } catch (error) {
      notifications!.toasts.addError(error, {
        title: i18n.translate('xpack.aiAssistant.copyUrlErrorToast', {
          defaultMessage: 'Could not copy URL',
        }),
      });
    }
  };

  return {
    deleteConversation: async (id: string) => {
      setIsUpdatingConversationList(true);
      try {
        return await handleDeleteConversation(id);
      } finally {
        setIsUpdatingConversationList(false);
      }
    },
    copyConversationToClipboard: handleCopyConversationToClipboard,
    copyUrl: handleCopyUrl,
  };
}
