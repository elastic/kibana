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
import type { ConversationAccessControlMode } from '@kbn/agent-builder-common';
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
  accessMode: ConversationAccessControlMode;
  errorMessage?: string;
  isPublic: boolean;
  isSaving: boolean;
  isSearchingUsers: boolean;
  memberProfiles: UserProfileWithAvatar[];
  onAccessModeChange: (nextAccessMode: ConversationAccessControlMode) => void;
  onAddUser: (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => void;
  onRemoveUser: (id: string) => void;
  ownerProfile?: UserProfileWithAvatar;
  setSearchValue: (value: string) => void;
  suggestedProfileByUid: Map<string, UserProfileWithAvatar>;
  userOptions: Array<EuiComboBoxOptionOption<string>>;
}> = ({
  accessMode,
  errorMessage,
  isPublic,
  isSaving,
  isSearchingUsers,
  memberProfiles,
  onAccessModeChange,
  onAddUser,
  onRemoveUser,
  ownerProfile,
  setSearchValue,
  suggestedProfileByUid,
  userOptions,
}) => {
  const editableHeader = (
    <>
      {errorMessage ? (
        <>
          <EuiCallOut announceOnMount color="danger" size="s" title={errorMessage} />
          <EuiSpacer size="m" />
        </>
      ) : null}

      <ConversationAccessModeSelect
        accessMode={accessMode}
        isSaving={isSaving}
        onAccessModeChange={onAccessModeChange}
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
          onChange={onAddUser}
          onSearchChange={setSearchValue}
          isLoading={isSearchingUsers}
          isDisabled={isSaving}
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
        ownerProfile={ownerProfile}
        memberProfiles={memberProfiles}
        isSaving={isSaving}
        onRemoveUser={onRemoveUser}
      />
    </>
  );
};
