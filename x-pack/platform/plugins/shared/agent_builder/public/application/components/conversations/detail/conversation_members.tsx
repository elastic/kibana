/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React, { useMemo } from 'react';
import type { Conversation } from '@kbn/agent-builder-common';
import {
  getConversationMembers,
  type ConversationMemberRef,
} from '@kbn/agent-builder-common';
import type { UserProfileWithAvatar } from '@kbn/user-profile-components';
import { UserAvatar, getUserDisplayName } from '@kbn/user-profile-components';
import { sortBy } from 'lodash';
import { useBulkGetUserProfiles } from '../../../hooks/use_bulk_get_user_profiles';
import { parseTemplateAssignees } from './template_assignees_utils';

const labels = {
  createdBy: i18n.translate('xpack.agentBuilder.conversationDetail.sidebar.createdBy', {
    defaultMessage: 'Created by',
  }),
  members: i18n.translate('xpack.agentBuilder.conversationDetail.sidebar.members', {
    defaultMessage: 'Members',
  }),
};

interface ConversationMembersProps {
  conversation: Conversation;
}

const getMemberSortField = (
  member: ConversationMemberRef,
  profiles: Map<string, UserProfileWithAvatar>
) => {
  const profile = member.uid ? profiles.get(member.uid) : undefined;
  if (profile) {
    return getUserDisplayName(profile.user).toLowerCase();
  }

  return member.username.toLowerCase();
};

const MemberRow: React.FC<{
  member: ConversationMemberRef;
  profile?: UserProfileWithAvatar;
}> = ({ member, profile }) => {
  const displayName = profile ? getUserDisplayName(profile.user) : member.username;

  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      <EuiFlexItem grow={false}>
        {profile ? (
          <UserAvatar user={profile.user} avatar={profile.data.avatar} size="s" />
        ) : (
          <UserAvatar user={{ username: member.username }} size="s" />
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="s">{displayName}</EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const MemberSection: React.FC<{
  headline: string;
  members: ConversationMemberRef[];
  profiles: Map<string, UserProfileWithAvatar>;
  isLoading: boolean;
  dataTestSubj: string;
}> = ({ headline, members, profiles, isLoading, dataTestSubj }) => {
  const { euiTheme } = useEuiTheme();

  const orderedMembers = useMemo(
    () => sortBy(members, (member) => getMemberSortField(member, profiles)),
    [members, profiles]
  );

  if (orderedMembers.length === 0) {
    return null;
  }

  const rowStyles = css`
    margin-top: ${euiTheme.size.m};
  `;

  return (
    <div data-test-subj={dataTestSubj}>
      <EuiTitle size="xxs">
        <h3>{headline}</h3>
      </EuiTitle>
      <EuiHorizontalRule margin="xs" />
      {isLoading && (
        <EuiFlexGroup>
          <EuiFlexItem grow={false}>
            <EuiLoadingSpinner data-test-subj={`${dataTestSubj}-loading`} />
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      {orderedMembers.map((member) => (
        <div key={member.username.toLowerCase()} css={rowStyles}>
          <MemberRow member={member} profile={member.uid ? profiles.get(member.uid) : undefined} />
        </div>
      ))}
    </div>
  );
};

export const ConversationMembers: React.FC<ConversationMembersProps> = ({ conversation }) => {
  const assignees = useMemo(
    () =>
      parseTemplateAssignees(conversation.custom_fields?.assignees).map(({ uid, username }) => ({
        uid,
        username,
      })),
    [conversation.custom_fields?.assignees]
  );

  const members = useMemo(
    () => getConversationMembers({ conversation, assignees }),
    [assignees, conversation]
  );

  const creator = useMemo(
    () => (conversation.user.username ? [{ uid: conversation.user.id, username: conversation.user.username }] : []),
    [conversation.user.id, conversation.user.username]
  );

  const profileUids = useMemo(() => {
    const uids = new Set<string>();
    for (const member of [...creator, ...members]) {
      if (member.uid) {
        uids.add(member.uid);
      }
    }
    return Array.from(uids);
  }, [creator, members]);

  const { data: profiles = new Map(), isFetching } = useBulkGetUserProfiles({ uids: profileUids });

  return (
    <>
      <MemberSection
        headline={labels.createdBy}
        members={creator}
        profiles={profiles}
        isLoading={isFetching}
        dataTestSubj="conversationDetailCreatedBy"
      />
      <MemberSection
        headline={labels.members}
        members={members}
        profiles={profiles}
        isLoading={isFetching}
        dataTestSubj="conversationDetailMembers"
      />
    </>
  );
};
