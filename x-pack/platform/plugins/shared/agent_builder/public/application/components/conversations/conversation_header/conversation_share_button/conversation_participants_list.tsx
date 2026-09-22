/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiBadge,
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import {
  getUserDisplayName,
  UserAvatar,
  type UserProfileWithAvatar,
} from '@kbn/user-profile-components';
import { useConversationPermissions } from '../../../../hooks/use_conversation';
import { authorLabel, removeMemberLabel } from './conversation_share_i18n';

const MEMBER_ROW_MIN_HEIGHT = 50;

interface UserAccessRowProps {
  profile: UserProfileWithAvatar;
  badge?: string;
  onRemove?: () => void;
  isDisabled?: boolean;
  hasBottomBorder?: boolean;
}

const UserAccessRow: React.FC<UserAccessRowProps> = ({
  profile,
  badge,
  onRemove,
  isDisabled,
  hasBottomBorder = true,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiFlexGroup
      alignItems="center"
      justifyContent="spaceBetween"
      gutterSize="s"
      responsive={false}
      css={css`
        min-height: ${MEMBER_ROW_MIN_HEIGHT}px;
        padding: ${euiTheme.size.s} 0;
        border-bottom: ${hasBottomBorder ? euiTheme.border.thin : 'none'};
      `}
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
          {badge ? (
            <EuiFlexItem grow={false}>
              <EuiBadge color="hollow">{badge}</EuiBadge>
            </EuiFlexItem>
          ) : null}

          {onRemove ? (
            <EuiFlexItem grow={false}>
              <EuiToolTip content={removeMemberLabel} disableScreenReaderOutput>
                <EuiButtonIcon
                  iconType="cross"
                  color="danger"
                  size="s"
                  aria-label={removeMemberLabel}
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
};

interface ConversationParticipantsListProps {
  ownerProfile?: UserProfileWithAvatar;
  memberProfiles: UserProfileWithAvatar[];
  isSaving: boolean;
  onRemoveUser: (id: string) => void;
}

export const ConversationParticipantsList: React.FC<ConversationParticipantsListProps> = ({
  ownerProfile,
  memberProfiles,
  isSaving,
  onRemoveUser,
}) => {
  const { update_access_control: canUpdateAccessControl } = useConversationPermissions();

  return (
    <EuiFlexGroup direction="column" gutterSize="none" responsive={false}>
      {ownerProfile ? (
        <EuiFlexItem>
          <UserAccessRow
            profile={ownerProfile}
            badge={authorLabel}
            hasBottomBorder={memberProfiles.length > 0}
          />
        </EuiFlexItem>
      ) : null}

      {memberProfiles.map((profile, index) => {
        return (
          <EuiFlexItem key={profile.uid}>
            <UserAccessRow
              profile={profile}
              hasBottomBorder={index < memberProfiles.length - 1}
              isDisabled={isSaving}
              onRemove={canUpdateAccessControl ? () => onRemoveUser(profile.uid) : undefined}
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
