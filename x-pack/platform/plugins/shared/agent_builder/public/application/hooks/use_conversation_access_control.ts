/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQuery, useQueryClient } from '@kbn/react-query';
import type { UserProfileAvatarData, UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { Conversation } from '@kbn/agent-builder-common';
import {
  normalizeConversationAccessControl,
  type ConversationAccessControl,
} from '@kbn/agent-builder-common';
import type { UpdateConversationAccessControlRequestBody } from '../../../common/http_api/conversations';
import { queryKeys } from '../query_keys';
import { mutationKeys } from '../mutation_keys';
import { useKibana } from './use_kibana';
import { useAgentBuilderServices } from './use_agent_builder_service';

export const useConversationAccessControlProfiles = ({
  uids,
  enabled,
}: {
  uids: string[];
  enabled: boolean;
}) => {
  const {
    services: { userProfile },
  } = useKibana();

  const dedupedUids = Array.from(new Set(uids)).sort();

  return useQuery({
    queryKey: queryKeys.security.ownerProfiles(dedupedUids),
    enabled: enabled && dedupedUids.length > 0,
    queryFn: async (): Promise<UserProfileWithAvatar[]> => {
      return await userProfile.bulkGet<{ avatar?: UserProfileAvatarData }>({
        uids: new Set(dedupedUids),
        dataPath: 'avatar',
      });
    },
  });
};

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
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });

      onSuccess?.(normalizedAccessControl);
    },
    onError,
  });
};
