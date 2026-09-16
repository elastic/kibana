/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { Conversation } from '@kbn/agent-builder-common';
import {
  normalizeConversationAccessControl,
  type ConversationAccessControl,
} from '@kbn/agent-builder-common';
import type { UpdateConversationAccessControlRequestBody } from '../../../common/http_api/conversations';
import { queryKeys } from '../query_keys';
import { mutationKeys } from '../mutation_keys';
import { useAgentBuilderServices } from './use_agent_builder_service';

export const useUpdateConversationAccessControl = ({
  conversationId,
  onSuccess,
  onError,
}: {
  conversationId: string;
  onSuccess?: (accessControl: ConversationAccessControl) => void;
  onError?: (error: Error) => void;
}) => {
  const { conversationsService } = useAgentBuilderServices();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: mutationKeys.updateConversationAccessControl(conversationId),
    mutationFn: (accessControl: UpdateConversationAccessControlRequestBody) =>
      conversationsService.updateAccessControl({ conversationId, accessControl }),
    onSuccess: (accessControl) => {
      const normalizedAccessControl = normalizeConversationAccessControl(accessControl);

      queryClient.setQueryData<Conversation>(
        queryKeys.conversations.byId(conversationId),
        (current) =>
          current
            ? {
                ...current,
                access_control: normalizedAccessControl,
              }
            : current
      );

      // Refresh conversation queries so lists pick up access-control-derived state such as
      // public/private mode. This can also refetch byId because the all key is a prefix match.
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });

      onSuccess?.(normalizedAccessControl);
    },
    onError,
  });
};
