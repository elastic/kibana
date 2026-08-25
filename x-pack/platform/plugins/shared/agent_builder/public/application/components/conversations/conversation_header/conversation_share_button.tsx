/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiHorizontalRule,
  EuiPopover,
  EuiSelect,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  useEuiTheme,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { useDebouncedValue } from '@kbn/react-hooks';
import {
  AGENT_BUILDER_UI_EBT,
  ConversationAccessControlMode,
  ConversationAccessControlRole,
  normalizeConversationAccessControl,
  type Conversation,
} from '@kbn/agent-builder-common';
import {
  getUserDisplayName,
  UserAvatar,
  type UserProfileWithAvatar,
} from '@kbn/user-profile-components';
import { getEbtProps } from '@kbn/ebt-click';
import {
  useConversation,
  useConversationPermissions,
  useHasPersistedConversation,
} from '../../../hooks/use_conversation';
import { useSuggestUsers } from '../../../hooks/use_suggest_users';
import {
  useConversationAccessControlProfiles,
  useUpdateConversationAccessControl,
} from '../../../hooks/use_conversation_access_control';

const SEARCH_DEBOUNCE_MS = 200;

const labels = {
  invite: i18n.translate('xpack.agentBuilder.conversationSharing.invite', {
    defaultMessage: 'Invite',
  }),
  sharing: i18n.translate('xpack.agentBuilder.conversationSharing.title', {
    defaultMessage: 'Sharing',
  }),
  close: i18n.translate('xpack.agentBuilder.conversationSharing.close', {
    defaultMessage: 'Close sharing',
  }),
  generalAccess: i18n.translate('xpack.agentBuilder.conversationSharing.generalAccess', {
    defaultMessage: 'General access',
  }),
  restricted: i18n.translate('xpack.agentBuilder.conversationSharing.restricted', {
    defaultMessage: 'Restricted',
  }),
  public: i18n.translate('xpack.agentBuilder.conversationSharing.public', {
    defaultMessage: 'Public',
  }),
  restrictedHelp: i18n.translate('xpack.agentBuilder.conversationSharing.restrictedHelp', {
    defaultMessage: 'Only manually added members can see this chat',
  }),
  publicHelp: i18n.translate('xpack.agentBuilder.conversationSharing.publicHelp', {
    defaultMessage: "Anyone with access to this chat's agent can see this chat",
  }),
  currentMembers: i18n.translate('xpack.agentBuilder.conversationSharing.currentMembers', {
    defaultMessage: 'Current members',
  }),
  searchUsers: i18n.translate('xpack.agentBuilder.conversationSharing.searchUsers', {
    defaultMessage: 'Search for users to add',
  }),
  author: i18n.translate('xpack.agentBuilder.conversationSharing.author', {
    defaultMessage: 'Author',
  }),
  member: i18n.translate('xpack.agentBuilder.conversationSharing.member', {
    defaultMessage: 'Member',
  }),
  removeMember: i18n.translate('xpack.agentBuilder.conversationSharing.removeMember', {
    defaultMessage: 'Remove member',
  }),
  saveError: i18n.translate('xpack.agentBuilder.conversationSharing.saveError', {
    defaultMessage: 'Failed to update sharing settings',
  }),
  publicSearchHelp: i18n.translate('xpack.agentBuilder.conversationSharing.publicSearchHelp', {
    defaultMessage: 'Switch to restricted access to add individual members.',
  }),
};

const accessModeOptions = [
  {
    value: ConversationAccessControlMode.Private,
    text: labels.restricted,
  },
  {
    value: ConversationAccessControlMode.Public,
    text: labels.public,
  },
];

const UserAccessRow: React.FC<{
  profile: UserProfileWithAvatar;
  badge: string;
  onRemove?: () => void;
  isDisabled?: boolean;
}> = ({ profile, badge, onRemove, isDisabled }) => (
  <EuiFlexGroup
    alignItems="center"
    justifyContent="spaceBetween"
    gutterSize="s"
    responsive={false}
    data-test-subj="agentBuilderConversationShareMemberRow"
  >
    <EuiFlexItem>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <UserAvatar user={profile.user} avatar={profile.data?.avatar} size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow>
          <EuiText size="s">{getUserDisplayName(profile.user)}</EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiBadge>{badge}</EuiBadge>
        </EuiFlexItem>

        {onRemove ? (
          <EuiFlexItem grow={false}>
            <EuiToolTip content={labels.removeMember} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="cross"
                color="text"
                size="s"
                aria-label={labels.removeMember}
                onClick={onRemove}
                isDisabled={isDisabled}
                data-test-subj="agentBuilderConversationShareRemoveMember"
              />
            </EuiToolTip>
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </EuiFlexItem>
  </EuiFlexGroup>
);

export const ConversationShareButton: React.FC = () => {
  const hasPersistedConversation = useHasPersistedConversation();
  const { update_access_control: canUpdateAccessControl } = useConversationPermissions();
  const { conversation } = useConversation();

  if (!conversation || !hasPersistedConversation || !canUpdateAccessControl) {
    return null;
  }

  return <ConversationSharePopover conversation={conversation} />;
};

const ConversationSharePopover: React.FC<{
  conversation: Conversation;
}> = ({ conversation }) => {
  const { euiTheme } = useEuiTheme();
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [accessMode, setAccessMode] = useState(ConversationAccessControlMode.Private);
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [searchValue, setSearchValue] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const accessControl = normalizeConversationAccessControl(conversation?.access_control);
  const accessControlMemberIds = accessControl.entries.map((entry) => entry.id);

  useEffect(() => {
    const nextAccessControl = normalizeConversationAccessControl(conversation?.access_control);

    setAccessMode(nextAccessControl.access_mode);
    setMemberIds(nextAccessControl.entries.map((entry) => entry.id));
  }, [conversation?.access_control]);

  const ownerId = conversation?.user.id;
  const profileUids = [ownerId, ...memberIds].filter((uid): uid is string => Boolean(uid));
  const { data: profiles = [] } = useConversationAccessControlProfiles({
    uids: profileUids,
    enabled: isPopoverOpen,
  });
  const profileByUid = new Map(profiles.map((profile) => [profile.uid, profile]));

  const debouncedSearch = useDebouncedValue(searchValue, SEARCH_DEBOUNCE_MS);
  const { data: suggestedProfiles = [], isFetching: isSearchingUsers } = useSuggestUsers(
    debouncedSearch,
    {
      enabled: isPopoverOpen && accessMode === ConversationAccessControlMode.Private,
    }
  );

  const excludedIds = new Set([conversation?.user.id, ...memberIds].filter(Boolean));
  const suggestedProfileByUid = new Map(suggestedProfiles.map((profile) => [profile.uid, profile]));
  const userOptions = suggestedProfiles
    .filter((profile) => !excludedIds.has(profile.uid))
    .map((profile) => ({
      label: getUserDisplayName(profile.user),
      value: profile.uid,
      key: profile.uid,
    }));

  const { mutate: updateAccessControl, isLoading: isSaving } = useUpdateConversationAccessControl({
    conversationId: conversation.id,
    agentId: conversation.agent_id,
    onSuccess: () => {
      setErrorMessage(undefined);
    },
    onError: () => {
      setErrorMessage(labels.saveError);
      setAccessMode(accessControl.access_mode);
      setMemberIds(accessControlMemberIds);
    },
  });

  const saveAccessControl = (
    nextAccessMode: ConversationAccessControlMode,
    nextMemberIds: string[]
  ) => {
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

  const onAccessModeChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextAccessMode = event.target.value as ConversationAccessControlMode;
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

  const renderOption = (option: EuiComboBoxOptionOption<string>) => {
    const profile = option.value ? suggestedProfileByUid.get(option.value) : undefined;
    if (!profile) {
      return option.label;
    }

    const displayName = getUserDisplayName(profile.user);
    const secondary = profile.user.email ?? profile.user.username;
    const showSecondary = secondary && secondary !== displayName;

    return (
      <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
        <EuiFlexItem grow={false}>
          <UserAvatar user={profile.user} avatar={profile.data?.avatar} size="s" />
        </EuiFlexItem>
        <EuiFlexItem grow>
          <EuiText size="s">{displayName}</EuiText>
          {showSecondary ? (
            <EuiText size="xs" color="subdued">
              {secondary}
            </EuiText>
          ) : null}
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  };

  const isPublic = accessMode === ConversationAccessControlMode.Public;
  const ownerProfile = ownerId ? profileByUid.get(ownerId) : undefined;

  return (
    <EuiPopover
      button={
        <EuiButton
          size="s"
          color="text"
          iconType="users"
          minWidth={false}
          onClick={() => setIsPopoverOpen((isOpen) => !isOpen)}
          data-test-subj="agentBuilderConversationInviteButton"
          {...getEbtProps({
            element: AGENT_BUILDER_UI_EBT.element.pageContent,
            action: AGENT_BUILDER_UI_EBT.action.conversation.OPEN_SHARE,
            detail: 'conversation',
          })}
        >
          {labels.invite}
        </EuiButton>
      }
      isOpen={isPopoverOpen}
      closePopover={() => setIsPopoverOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
      aria-label={labels.sharing}
    >
      <div
        css={css`
          width: 467px;
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
            padding: ${euiTheme.size.m};
          `}
        >
          <EuiFlexItem>
            <EuiTitle size="xxxs">
              <h2>{labels.sharing}</h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiToolTip content={labels.close} disableScreenReaderOutput>
              <EuiButtonIcon
                iconType="cross"
                size="s"
                color="text"
                aria-label={labels.close}
                onClick={() => setIsPopoverOpen(false)}
                data-test-subj="agentBuilderConversationSharingCloseButton"
              />
            </EuiToolTip>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiHorizontalRule margin="none" />
        <div
          css={css`
            padding: ${euiTheme.size.m};
          `}
        >
          {errorMessage ? (
            <>
              <EuiCallOut announceOnMount color="danger" size="s" title={errorMessage} />
              <EuiSpacer size="m" />
            </>
          ) : null}
          <EuiFormRow label={labels.generalAccess} fullWidth>
            <EuiSelect
              compressed
              fullWidth
              value={accessMode}
              options={accessModeOptions}
              onChange={onAccessModeChange}
              disabled={isSaving}
              data-test-subj="agentBuilderConversationSharingAccessModeSelect"
            />
          </EuiFormRow>
          <EuiText size="xs" color="subdued">
            {isPublic ? labels.publicHelp : labels.restrictedHelp}
          </EuiText>
          <EuiSpacer size="l" />
          <EuiFormRow
            label={labels.currentMembers}
            fullWidth
            helpText={isPublic ? labels.publicSearchHelp : undefined}
          >
            <EuiComboBox<string>
              compressed
              fullWidth
              async
              placeholder={labels.searchUsers}
              aria-label={labels.searchUsers}
              options={userOptions}
              selectedOptions={[]}
              onChange={onAddUser}
              onSearchChange={setSearchValue}
              isLoading={isSearchingUsers}
              isDisabled={isSaving || isPublic}
              isClearable={false}
              singleSelection={{ asPlainText: true }}
              renderOption={renderOption}
              rowHeight={48}
              data-test-subj="agentBuilderConversationSharingUserSearch"
            />
          </EuiFormRow>
          <EuiSpacer size="s" />
          <EuiFlexGroup direction="column" gutterSize="s" responsive={false}>
            {ownerProfile ? (
              <EuiFlexItem>
                <UserAccessRow profile={ownerProfile} badge={labels.author} />
              </EuiFlexItem>
            ) : null}

            {memberIds.map((memberId) => {
              const memberProfile = profileByUid.get(memberId);

              if (!memberProfile) {
                return null;
              }

              return (
                <EuiFlexItem key={memberId}>
                  <UserAccessRow
                    profile={memberProfile}
                    badge={labels.member}
                    isDisabled={isSaving}
                    onRemove={() => onRemoveUser(memberId)}
                  />
                </EuiFlexItem>
              );
            })}
          </EuiFlexGroup>
        </div>
      </div>
    </EuiPopover>
  );
};
