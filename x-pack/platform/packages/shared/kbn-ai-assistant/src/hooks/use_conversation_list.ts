/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import {
  type AbortableAsyncState,
  type Conversation,
  useAbortableAsync,
} from '@kbn/observability-ai-assistant-plugin/public';
import { useAIAssistantAppService } from './use_ai_assistant_app_service';
import { useKibana } from './use_kibana';
export interface UseConversationListResult {
  isLoading: boolean;
  conversations: AbortableAsyncState<{ conversations: Conversation[] }>;
  deleteConversation: (id: string) => Promise<void>;
}

export function useConversationList(): UseConversationListResult {
  const service = useAIAssistantAppService();

  const [isUpdatingList, setIsUpdatingList] = useState(false);

  const {
    services: { notifications },
  } = useKibana();

  const conversations = useAbortableAsync(
    ({ signal }) => {
      setIsUpdatingList(true);
      return service.callApi('POST /internal/observability_ai_assistant/conversations', {
        signal,
      });
    },
    [service]
  );

  useEffect(() => {
    setIsUpdatingList(conversations.loading);
  }, [conversations.loading]);

  const handleDeleteConversation = async (id: string) => {
    setIsUpdatingList(true);

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

      conversations.refresh();
    } catch (err) {
      notifications!.toasts.addError(err, {
        title: i18n.translate('xpack.aiAssistant.flyout.failedToDeleteConversation', {
          defaultMessage: 'Could not delete conversation',
        }),
      });
    }
  };

  return {
    deleteConversation: (id: string) => {
      setIsUpdatingList(true);
      return handleDeleteConversation(id).finally(() => {
        setIsUpdatingList(false);
      });
    },
    conversations,
    isLoading: conversations.loading || isUpdatingList,
  };
}
