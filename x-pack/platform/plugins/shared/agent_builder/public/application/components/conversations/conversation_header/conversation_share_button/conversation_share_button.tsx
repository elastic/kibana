/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiPopover,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
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
import {
  useConversation,
  useConversationPermissions,
  useIsUnpersistedConversation,
} from '../../../../hooks/use_conversation';
import {
  hasInviteMembersSummary,
  useUpdateConversationAccessControl,
} from '../../../../hooks/use_conversation_access_control';
import { useSuggestUsers } from '../../../../hooks/use_suggest_users';
import { useUserProfiles } from '../../../../hooks/use_user_profiles';
import { ConversationParticipantsList } from './conversation_participants_list';
import { ConversationShareEditableContent } from './conversation_share_editable_content';
import {
  closeLabel,
  participantsLabel,
  saveErrorLabel,
  sharingLabel,
} from './conversation_share_i18n';
import { ConversationSharePopoverButton } from './conversation_share_popover_button';

const SEARCH_DEBOUNCE_MS = 200;
const POPOVER_WIDTH = 470;
const POPOVER_HEADER_MIN_HEIGHT = 48;

export const ConversationShareButton: React.FC = () => {
  const { update_access_control: canUpdateAccessControl } = useConversationPermissions();
  const { conversation } = useConversation();
  const isUnpersistedConversation = useIsUnpersistedConversation(conversation);
  const accessControl = normalizeConversationAccessControl(conversation?.access_control);
  const canOpenSharePopover = canUpdateAccessControl || hasInviteMembersSummary(accessControl);

  if (!conversation || isUnpersistedConversation || !canOpenSharePopover) {
    return null;
  }

  return <ConversationSharePopover conversation={conversation} />;
};

interface ConversationSharePopoverProps {
  conversation: Conversation;
}

const ConversationSharePopover: React.FC<ConversationSharePopoverProps> = ({ conversation }) => {
  const { euiTheme } = useEuiTheme();
  const { update_access_control: canUpdateAccessControl } = useConversationPermissions();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [accessMode, setAccessMode] = useState(ConversationAccessControlMode.Private);
  const [memberIds, setMemberIds] = useState<string[]>([]);
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
  const { data: profiles = [] } = useUserProfiles({
    uids: profileUids,
    enabled: isPopoverOpen,
  });
  const profileByUid = new Map(profiles.map((profile) => [profile.uid, profile]));

  const debouncedSearch = useDebouncedValue(searchValue, SEARCH_DEBOUNCE_MS);
  const suggestedUsersSearch = searchValue ? debouncedSearch : '';
  const { data: suggestedProfiles = [], isFetching: isSearchingUsers } = useSuggestUsers(
    suggestedUsersSearch,
    {
      enabled:
        canUpdateAccessControl &&
        isPopoverOpen &&
        accessMode === ConversationAccessControlMode.Private,
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

  const closePopover = () => {
    setIsPopoverOpen(false);
    setSearchValue('');
  };

  const onPopoverButtonClick = () => {
    if (isPopoverOpen) {
      setSearchValue('');
    }

    setIsPopoverOpen(!isPopoverOpen);
  };

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

  const onAddUser = (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
    const nextId = selectedOptions[0]?.value;
    if (!nextId || memberIds.includes(nextId)) {
      return;
    }

    const nextMemberIds = [...memberIds, nextId];
    setMemberIds(nextMemberIds);
    setSearchValue('');
    saveAccessControl(accessMode, nextMemberIds);
  };

  const onRemoveUser = (id: string) => {
    const nextMemberIds = memberIds.filter((memberId) => memberId !== id);
    setMemberIds(nextMemberIds);
    saveAccessControl(accessMode, nextMemberIds);
  };

  const isPublic = accessMode === ConversationAccessControlMode.Public;
  const ownerProfile = ownerId ? profileByUid.get(ownerId) : undefined;
  const memberProfiles = memberIds
    .map((memberId) => {
      return profileByUid.get(memberId);
    })
    .filter((profile): profile is UserProfileWithAvatar => Boolean(profile))
    .sort((firstProfile, secondProfile) =>
      getUserDisplayName(firstProfile.user).localeCompare(getUserDisplayName(secondProfile.user))
    );

  return (
    <EuiPopover
      button={<ConversationSharePopoverButton onClick={onPopoverButtonClick} />}
      isOpen={isPopoverOpen}
      closePopover={closePopover}
      panelPaddingSize="none"
      anchorPosition="downRight"
      aria-label={canUpdateAccessControl ? sharingLabel : participantsLabel}
    >
      <div
        css={css`
          width: ${POPOVER_WIDTH}px;
          max-width: calc(100vw - ${euiTheme.size.xl});
        `}
        data-test-subj="agentBuilderConversationSharingPopover"
      >
        <EuiFlexGroup
          alignItems="center"
          justifyContent="spaceBetween"
          gutterSize="s"
          responsive={false}
          css={css`
            min-height: ${POPOVER_HEADER_MIN_HEIGHT}px;
            padding: 0 ${euiTheme.size.m};
          `}
        >
          <EuiFlexItem>
            <EuiTitle size="xxxs">
              <h2>{canUpdateAccessControl ? sharingLabel : participantsLabel}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={closeLabel} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="cross"
                size="s"
                color="text"
                aria-label={closeLabel}
                onClick={closePopover}
                data-test-subj="agentBuilderConversationSharingCloseButton"
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="none" />
        <div
          css={css`
            ${canUpdateAccessControl
              ? css`
                  padding: ${euiTheme.size.m};
                  padding-bottom: ${isPublic ? euiTheme.size.l : euiTheme.size.s};
                `
              : css`
                  padding: ${euiTheme.size.s} ${euiTheme.size.m} 0;
                `}
          `}
        >
          {canUpdateAccessControl ? (
            <ConversationShareEditableContent
              access={{
                mode: accessMode,
                errorMessage,
                isSaving,
                onChange: onAccessModeChange,
              }}
              members={{
                ownerProfile,
                profiles: memberProfiles,
                onRemove: onRemoveUser,
              }}
              userSearch={{
                ownerId,
                memberIds,
                suggestedProfiles,
                isSearching: isSearchingUsers,
                onAdd: onAddUser,
                onSearch: setSearchValue,
              }}
            />
          ) : (
            <ConversationParticipantsList
              ownerProfile={ownerProfile}
              memberProfiles={memberProfiles}
              isSaving={isSaving}
              onRemoveUser={onRemoveUser}
            />
          )}
        </div>
      </div>
    </EuiPopover>
  );
};
