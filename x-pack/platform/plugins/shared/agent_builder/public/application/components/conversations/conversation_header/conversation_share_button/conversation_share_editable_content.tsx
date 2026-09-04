/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiCallOut,
  EuiComboBox,
  EuiFormRow,
  EuiIcon,
  EuiIconTip,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
  type EuiComboBoxOptionOption,
  type UseEuiTheme,
} from '@elastic/eui';
import { ConversationAccessControlMode } from '@kbn/agent-builder-common';
import {
  getUserDisplayName,
  UserAvatar,
  type UserProfileWithAvatar,
} from '@kbn/user-profile-components';
import { ConversationAccessModeSelect } from './conversation_access_mode_select';
import { ConversationParticipantsList } from './conversation_participants_list';
import {
  agentAccessHelpAriaLabel,
  agentAccessHelpLabel,
  currentMembersLabel,
  searchUsersLabel,
} from './conversation_share_i18n';

const USER_SEARCH_OPTION_ROW_HEIGHT = 48;

/**
 * `EuiComboBox` reserves a selection indicator column on every option while `singleSelection` is
 * set, and renders it as an invisible `EuiIcon type="empty"` because an option is never kept
 * selected here. Neither the column nor its flex gap is exposed as a prop, so the placeholder is
 * hidden from the options panel to keep the user rows left aligned.
 */
const hiddenOptionIndicatorCss = css`
  .euiListItemLayout__icon {
    display: none;
  }
`;

const currentMembersLabelStyle = ({ euiTheme }: UseEuiTheme) => css`
  row-gap: ${euiTheme.size.s};
`;

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

interface ConversationShareMembersProps {
  ownerProfile?: UserProfileWithAvatar;
  profiles: UserProfileWithAvatar[];
  onRemove: (id: string) => void;
}

interface ConversationShareUserSearchProps {
  memberIds: string[];
  ownerId?: string;
  suggestedProfiles: UserProfileWithAvatar[];
  isSearching: boolean;
  onAdd: (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => void;
  onSearch: (value: string) => void;
}

interface ConversationShareEditableContentProps {
  access: ConversationShareAccessProps;
  members: ConversationShareMembersProps;
  userSearch: ConversationShareUserSearchProps;
  agentName?: string;
}

export const ConversationShareEditableContent: React.FC<ConversationShareEditableContentProps> = ({
  access,
  members,
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
      <EuiFormRow
        label={
          <>
            {currentMembersLabel}{' '}
            {agentName ? (
              <EuiIconTip
                type="question"
                color="subdued"
                aria-label={agentAccessHelpAriaLabel}
                content={agentAccessHelpLabel(agentName)}
                iconProps={{ 'data-test-subj': 'agentBuilderConversationSharingAgentAccessHelp' }}
              />
            ) : null}
          </>
        }
        fullWidth
        css={currentMembersLabelStyle}
      >
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
          inputPopoverProps={{
            panelProps: { css: hiddenOptionIndicatorCss },
          }}
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
