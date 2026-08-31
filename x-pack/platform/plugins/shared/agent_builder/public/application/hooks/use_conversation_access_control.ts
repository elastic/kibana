/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMutation, useQueryClient } from '@kbn/react-query';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import type { Conversation } from '@kbn/agent-builder-common';
import {
  ConversationAccessControlMode,
  normalizeConversationAccessControl,
  type ConversationAccessControl,
} from '@kbn/agent-builder-common';
import type { UpdateConversationAccessControlRequestBody } from '../../../common/http_api/conversations';
import { queryKeys } from '../query_keys';
import { mutationKeys } from '../mutation_keys';
import { useAgentBuilderServices } from './use_agent_builder_service';
import { useConversation } from './use_conversation';
import { useUserProfiles } from './use_user_profiles';

export const hasInviteMembersSummary = (accessControl: ConversationAccessControl) => {
  return (
    accessControl.access_mode === ConversationAccessControlMode.Private &&
    accessControl.entries.length > 0
  );
};

export const useInviteMembersSummary = () => {
  const { conversation } = useConversation();

  const accessControl = normalizeConversationAccessControl(conversation?.access_control);
  const hasSummary = hasInviteMembersSummary(accessControl);

  const memberIdsByLatestAdded = [...accessControl.entries]
    .sort((firstEntry, secondEntry) => {
      const firstAddedAtTime = Date.parse(firstEntry.added_at);
      const secondAddedAtTime = Date.parse(secondEntry.added_at);

      return secondAddedAtTime - firstAddedAtTime;
    })
    .map((entry) => entry.id);

  const visibleMemberIds = memberIdsByLatestAdded.slice(0, 2);

  const { data: visibleMemberProfiles = [] } = useUserProfiles({
    uids: visibleMemberIds,
    enabled: hasSummary && visibleMemberIds.length > 0,
  });

  const visibleMemberProfileByUid = new Map(
    visibleMemberProfiles.map((profile) => [profile.uid, profile])
  );
  const profiles = visibleMemberIds
    .map((memberId) => visibleMemberProfileByUid.get(memberId))
    .filter((profile): profile is UserProfileWithAvatar => Boolean(profile));

  return {
    profiles,
    extraCount: Math.max(accessControl.entries.length - profiles.length, 0),
    shouldShowSummary: hasSummary && profiles.length > 0,
  };
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

      // Refresh conversation queries so lists pick up access-control-derived state such as
      // public/private mode. This can also refetch byId because the all key is a prefix match.
      queryClient.invalidateQueries({ queryKey: queryKeys.conversations.all });

      onSuccess?.(normalizedAccessControl);
    },
    onError,
  });
};
