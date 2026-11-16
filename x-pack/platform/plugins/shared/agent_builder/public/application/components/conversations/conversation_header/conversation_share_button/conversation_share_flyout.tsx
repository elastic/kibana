/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import {
  EuiFlyout,
  EuiFlyoutBody,
  EuiSpacer,
  EuiTitle,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { useDebouncedValue } from '@kbn/react-hooks';
import {
  ConversationAccessControlMode,
  ConversationAccessControlRole,
  normalizeConversationAccessControl,
  type Conversation,
} from '@kbn/agent-builder-common';
import { getUserDisplayName, type UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useConversationPermissions } from '../../../../hooks/use_conversation';
import { useUpdateConversationAccessControl } from '../../../../hooks/use_conversation_access_control';
import { useConversationFlyoutSessionProps } from '../../../../hooks/use_conversation_flyout_session_props';
import { useAgentBuilderAgentById } from '../../../../hooks/agents/use_agent_by_id';
import { useSuggestUsers } from '../../../../hooks/use_suggest_users';
import { useUserProfiles } from '../../../../hooks/use_user_profiles';
import { ConversationShareEditableContent } from './conversation_share_editable_content';
import { ConversationShareUsersSection } from './conversation_share_users_section';
import {
  closeLabel,
  participantsLabel,
  saveErrorLabel,
  shareThisChatLabel,
} from './conversation_share_i18n';

const SEARCH_DEBOUNCE_MS = 200;
const FLYOUT_WIDTH = 600;

interface ConversationShareFlyoutProps {
  conversation: Conversation;
  onClose: () => void;
}

export const ConversationShareFlyout: React.FC<ConversationShareFlyoutProps> = ({
  conversation,
  onClose,
}) => {
  const { update_access_control: canUpdateAccessControl } = useConversationPermissions();
  const title = canUpdateAccessControl ? shareThisChatLabel : participantsLabel;
  const flyoutSessionProps = useConversationFlyoutSessionProps(title);
  const [accessMode, setAccessMode] = useState(ConversationAccessControlMode.Private);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [pendingOptions, setPendingOptions] = useState<Array<EuiComboBoxOptionOption<string>>>([]);
  const [searchValue, setSearchValue] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const accessControl = normalizeConversationAccessControl(conversation.access_control);
  const accessControlMemberIds = accessControl.entries.map((entry) => entry.id);

  useEffect(() => {
    const nextAccessControl = normalizeConversationAccessControl(conversation.access_control);

    setAccessMode(nextAccessControl.access_mode);
    setMemberIds(nextAccessControl.entries.map((entry) => entry.id));
  }, [conversation.access_control]);

  const ownerId = conversation.user.id;
  const profileUids = [ownerId, ...memberIds].filter((uid): uid is string => Boolean(uid));
  const { data: profiles = [] } = useUserProfiles({ uids: profileUids, enabled: true });
  const profileByUid = new Map(profiles.map((profile) => [profile.uid, profile]));

  const { agent } = useAgentBuilderAgentById(conversation.agent_id);

  const debouncedSearch = useDebouncedValue(searchValue, SEARCH_DEBOUNCE_MS);
  const suggestedUsersSearch = searchValue ? debouncedSearch : '';
  const { data: suggestedProfiles = [], isFetching: isSearchingUsers } = useSuggestUsers(
    suggestedUsersSearch,
    {
      enabled: canUpdateAccessControl && accessMode === ConversationAccessControlMode.Private,
    }
  );

  const { mutate: updateAccessControl, isLoading: isSaving } = useUpdateConversationAccessControl({
    conversationId: conversation.id,
    onSuccess: () => {
      setErrorMessage(undefined);
    },
    onError: () => {
      setErrorMessage(saveErrorLabel);
      setAccessMode(accessControl.access_mode);
      setMemberIds(accessControlMemberIds);
    },
  });

  const saveAccessControl = (
    nextAccessMode: ConversationAccessControlMode,
    nextMemberIds: string[]
  ) => {
    if (!canUpdateAccessControl) {
      return;
    }

    updateAccessControl({
      access_mode: nextAccessMode,
      entries:
        nextAccessMode === ConversationAccessControlMode.Public
          ? []
          : nextMemberIds.map((id) => ({
              type: 'user',
              id,
              role: ConversationAccessControlRole.Member,
            })),
    });
  };

  const onAccessModeChange = (nextAccessMode: ConversationAccessControlMode) => {
    const nextMemberIds = nextAccessMode === ConversationAccessControlMode.Public ? [] : memberIds;

    setAccessMode(nextAccessMode);
    setMemberIds(nextMemberIds);
    saveAccessControl(nextAccessMode, nextMemberIds);
  };

  const onAddUsers = () => {
    const newMemberIds = pendingOptions.flatMap(({ value }) =>
      value && !memberIds.includes(value) ? [value] : []
    );

    setPendingOptions([]);
    setSearchValue('');

    if (newMemberIds.length === 0) {
      return;
    }

    const nextMemberIds = [...memberIds, ...newMemberIds];
    setMemberIds(nextMemberIds);
    saveAccessControl(accessMode, nextMemberIds);
  };

  const onRemoveUser = (id: string) => {
    const nextMemberIds = memberIds.filter((memberId) => memberId !== id);
    setMemberIds(nextMemberIds);
    saveAccessControl(accessMode, nextMemberIds);
  };

  const ownerProfile =
    (ownerId ? profileByUid.get(ownerId) : undefined) ??
    (conversation.user.username
      ? {
          uid: ownerId ?? conversation.user.username,
          user: { username: conversation.user.username },
        }
      : undefined);
  const memberProfiles = memberIds
    .map((memberId) => profileByUid.get(memberId))
    .filter((profile): profile is UserProfileWithAvatar => Boolean(profile))
    .sort((firstProfile, secondProfile) =>
      getUserDisplayName(firstProfile.user).localeCompare(getUserDisplayName(secondProfile.user))
    );
  const users = {
    ownerProfile,
    profiles: memberProfiles,
    count: memberIds.length + 1,
    onRemove: onRemoveUser,
  };

  return (
    <EuiFlyout
      type="push"
      size={FLYOUT_WIDTH}
      ownFocus={false}
      onClose={onClose}
      closeButtonProps={{ 'aria-label': closeLabel }}
      flyoutMenuDisplayMode="always"
      role="region"
      aria-label={title}
      data-test-subj="agentBuilderConversationSharingFlyout"
      {...flyoutSessionProps}
    >
      <EuiFlyoutBody>
        <EuiTitle size="s">
          <h3>{title}</h3>
        </EuiTitle>
        <EuiSpacer size="l" />
        {canUpdateAccessControl ? (
          <ConversationShareEditableContent
            access={{
              mode: accessMode,
              errorMessage,
              isSaving,
              onChange: onAccessModeChange,
            }}
            users={users}
            userSearch={{
              ownerId,
              memberIds,
              suggestedProfiles,
              selectedOptions: pendingOptions,
              isSearching: isSearchingUsers,
              onSelect: setPendingOptions,
              onSearch: setSearchValue,
              onAdd: onAddUsers,
            }}
            agentName={agent?.name}
          />
        ) : (
          <ConversationShareUsersSection users={users} isSaving={isSaving} />
        )}
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
