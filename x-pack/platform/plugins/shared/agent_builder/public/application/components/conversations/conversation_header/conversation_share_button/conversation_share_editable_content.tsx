/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiCallOut,
  EuiComboBox,
  EuiFormRow,
  EuiIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  type EuiComboBoxOptionOption,
} from '@elastic/eui';
import { ConversationAccessControlMode } from '@kbn/agent-builder-common';
import {
  getUserDisplayName,
  UserAvatar,
  type UserProfileWithAvatar,
} from '@kbn/user-profile-components';
import { ConversationAccessModeSelect } from './conversation_access_mode_select';
import { ConversationParticipantsList } from './conversation_participants_list';
import { currentMembersLabel, searchUsersLabel } from './conversation_share_i18n';

const UserSearchOption: React.FC<{
  profile: UserProfileWithAvatar;
}> = ({ profile }) => {
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

export const ConversationShareEditableContent: React.FC<{
  access: {
    mode: ConversationAccessControlMode;
    errorMessage?: string;
    isSaving: boolean;
    onChange: (nextAccessMode: ConversationAccessControlMode) => void;
  };
  members: {
    ownerProfile?: UserProfileWithAvatar;
    profiles: UserProfileWithAvatar[];
    onRemove: (id: string) => void;
  };
  userSearch: {
    memberIds: string[];
    ownerId?: string;
    suggestedProfiles: UserProfileWithAvatar[];
    isSearching: boolean;
    onAdd: (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => void;
    onSearch: (value: string) => void;
  };
}> = ({ access, members, userSearch }) => {
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
      <EuiFormRow label={currentMembersLabel} fullWidth>
        <EuiComboBox<string>
          compressed
          fullWidth
          async
          placeholder={searchUsersLabel}
          aria-label={searchUsersLabel}
          options={userOptions}
          selectedOptions={[]}
          onChange={userSearch.onAdd}
          onSearchChange={userSearch.onSearch}
          isLoading={userSearch.isSearching}
          isDisabled={access.isSaving}
          isClearable={false}
          prepend={
            <EuiIcon
              type="magnify"
              color="subdued"
              data-test-subj="agentBuilderConversationSharingUserSearchIcon"
              aria-hidden={true}
            />
          }
          singleSelection={{ asPlainText: true }}
          renderOption={(option) => {
            const profile = option.value ? suggestedProfileByUid.get(option.value) : undefined;

            if (!profile) {
              return null;
            }

            return <UserSearchOption key={option.key ?? option.value} profile={profile} />;
          }}
          rowHeight={48}
          data-test-subj="agentBuilderConversationSharingUserSearch"
        />
      </EuiFormRow>

      <EuiSpacer size="s" />

      <ConversationParticipantsList
        ownerProfile={members.ownerProfile}
        memberProfiles={members.profiles}
        isSaving={access.isSaving}
        onRemoveUser={members.onRemove}
      />
    </>
  );
};
