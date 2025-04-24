/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';
import {
  type AbortableAsyncState,
  type Conversation,
  useAbortableAsync,
} from '@kbn/observability-ai-assistant-plugin/public';
import { useAIAssistantAppService } from './use_ai_assistant_app_service';

export interface UseConversationListResult {
  conversations: AbortableAsyncState<{ conversations: Conversation[] }>;
  isLoadingConversationList: boolean;
  setIsUpdatingConversationList: (isUpdating: boolean) => void;
  refreshConversations: () => void;
}

export function useConversationList(): UseConversationListResult {
  const service = useAIAssistantAppService();

  const [isUpdatingList, setIsUpdatingList] = useState(false);

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

  return {
    conversations,
    isLoadingConversationList: conversations.loading || isUpdatingList,
    setIsUpdatingConversationList: setIsUpdatingList,
    refreshConversations: conversations.refresh,
  };
}
