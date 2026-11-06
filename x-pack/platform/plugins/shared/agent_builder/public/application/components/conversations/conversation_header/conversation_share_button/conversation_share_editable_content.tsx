/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiButton,
  EuiCallOut,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  EuiTitle,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { ConversationAccessControlMode } from '@kbn/agent-builder-common';
import {
  getUserDisplayName,
  UserAvatar,
  type UserProfileWithAvatar,
} from '@kbn/user-profile-components';
import { ConversationAccessModeSelect } from './conversation_access_mode_select';
import {
  ConversationShareUsersSection,
  type ConversationShareUsers,
} from './conversation_share_users_section';
import { addUsersLabel, inviteUsersLabel, searchUsersLabel } from './conversation_share_i18n';

const USER_SEARCH_OPTION_ROW_HEIGHT = 48;

interface UserSearchOptionProps {
  profile: UserProfileWithAvatar;
}

const UserSearchOption: React.FC<UserSearchOptionProps> = ({ profile }) => {
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

interface ConversationShareAccessProps {
  mode: ConversationAccessControlMode;
  errorMessage?: string;
  isSaving: boolean;
  onChange: (nextAccessMode: ConversationAccessControlMode) => void;
}

interface ConversationShareUserSearchProps {
  memberIds: string[];
  ownerId?: string;
  suggestedProfiles: UserProfileWithAvatar[];
  selectedOptions: Array<EuiComboBoxOptionOption<string>>;
  isSearching: boolean;
  onSelect: (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => void;
  onSearch: (value: string) => void;
  onAdd: () => void;
}

interface ConversationShareEditableContentProps {
  access: ConversationShareAccessProps;
  users: ConversationShareUsers;
  userSearch: ConversationShareUserSearchProps;
  agentName?: string;
}

export const ConversationShareEditableContent: React.FC<ConversationShareEditableContentProps> = ({
  access,
  users,
  userSearch,
  agentName,
}) => {
  const isPublic = access.mode === ConversationAccessControlMode.Public;
  const excludedIds = new Set([userSearch.ownerId, ...userSearch.memberIds].filter(Boolean));
  const suggestedProfileByUid = new Map(
    userSearch.suggestedProfiles.map((profile) => [profile.uid, profile])
  );
  const userOptions = userSearch.suggestedProfiles
    .filter((profile) => !excludedIds.has(profile.uid))
    .map((profile) => ({
      label: getUserDisplayName(profile.user),
      value: profile.uid,
      key: profile.uid,
    }));

  const editableHeader = (
    <>
      {access.errorMessage ? (
        <>
          <EuiCallOut announceOnMount color="danger" size="s" title={access.errorMessage} />
          <EuiSpacer size="m" />
        </>
      ) : null}

      <ConversationAccessModeSelect
        accessMode={access.mode}
        isSaving={access.isSaving}
        onAccessModeChange={access.onChange}
      />
    </>
  );

  if (isPublic) {
    return editableHeader;
  }

  return (
    <>
      {editableHeader}

      <EuiSpacer size="l" />
      <EuiFlexGroup
        direction="column"
        gutterSize="s"
        data-test-subj="agentBuilderConversationSharingInviteSection"
      >
        <EuiTitle size="xxxs">
          <h4>{inviteUsersLabel}</h4>
        </EuiTitle>
        <EuiFlexGroup gutterSize="s" alignItems="flexStart" responsive={false}>
          <EuiFlexItem>
            <EuiComboBox<string>
              fullWidth
              async
              placeholder={searchUsersLabel}
              aria-label={searchUsersLabel}
              options={userOptions}
              selectedOptions={userSearch.selectedOptions}
              onChange={userSearch.onSelect}
              onSearchChange={userSearch.onSearch}
              isLoading={userSearch.isSearching}
              isDisabled={access.isSaving}
              renderOption={(option) => {
                const profile = option.value ? suggestedProfileByUid.get(option.value) : undefined;

                if (!profile) {
                  return null;
                }

                return <UserSearchOption key={option.key ?? option.value} profile={profile} />;
              }}
              rowHeight={USER_SEARCH_OPTION_ROW_HEIGHT}
              data-test-subj="agentBuilderConversationSharingUserSearch"
            />
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              iconType="plus"
              onClick={userSearch.onAdd}
              isDisabled={userSearch.selectedOptions.length === 0}
              isLoading={access.isSaving}
              data-test-subj="agentBuilderConversationSharingAddUsersButton"
            >
              {addUsersLabel}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexGroup>

      <EuiSpacer size="l" />
      <ConversationShareUsersSection
        users={users}
        isSaving={access.isSaving}
        agentName={agentName}
      />
    </>
  );
};
