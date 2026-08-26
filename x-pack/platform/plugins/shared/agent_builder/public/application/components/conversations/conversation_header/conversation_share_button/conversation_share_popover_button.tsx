/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import {
  EuiAvatar,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  useEuiTheme,
} from '@elastic/eui';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import { getEbtProps } from '@kbn/ebt-click';
import { UserAvatar, type UserProfileWithAvatar } from '@kbn/user-profile-components';
import { useInviteMembersSummary } from '../../../../hooks/use_conversation_access_control';
import { inviteLabel, sharingLabel } from './conversation_share_i18n';

const ConversationShareTriggerButton: React.FC<{
  ariaLabel: string;
  children: React.ReactNode;
  onClick: () => void;
}> = ({ ariaLabel, children, onClick }) => {
  return (
    <EuiButtonEmpty
      size="s"
      color="text"
      aria-label={ariaLabel}
      onClick={onClick}
      data-test-subj="agentBuilderConversationInviteButton"
      {...getEbtProps({
        element: AGENT_BUILDER_UI_EBT.element.pageContent,
        action: AGENT_BUILDER_UI_EBT.action.conversation.OPEN_SHARE,
        detail: 'conversation',
      })}
    >
      {children}
    </EuiButtonEmpty>
  );
};

const InviteMembersButton: React.FC<{
  onClick: () => void;
}> = ({ onClick }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <ConversationShareTriggerButton ariaLabel={inviteLabel} onClick={onClick}>
      <span
        css={css`
          display: inline-flex;
          align-items: center;
          gap: ${euiTheme.size.xs};
        `}
      >
        <EuiIcon type="users" color="inherit" aria-hidden={true} />
        <span>{inviteLabel}</span>
      </span>
    </ConversationShareTriggerButton>
  );
};

const InviteMembersSummaryButton: React.FC<{
  canUpdateAccessControl: boolean;
  extraCount: number;
  onClick: () => void;
  profiles: UserProfileWithAvatar[];
}> = ({ canUpdateAccessControl, extraCount, onClick, profiles }) => {
  const { euiTheme } = useEuiTheme();
  const avatarStyles = css`
    border: ${euiTheme.border.width.thick} solid ${euiTheme.colors.emptyShade};
  `;
  const avatarOverlap = euiTheme.size.s;

  return (
    <ConversationShareTriggerButton
      ariaLabel={canUpdateAccessControl ? inviteLabel : sharingLabel}
      onClick={onClick}
    >
      <EuiFlexGroup
        alignItems="center"
        gutterSize="none"
        responsive={false}
        data-test-subj="agentBuilderConversationInviteMembersSummary"
      >
        {profiles.map((profile, index) => (
          <EuiFlexItem
            key={profile.uid}
            grow={false}
            css={css`
              margin-inline-start: ${index === 0 ? 0 : `-${avatarOverlap}`};
              z-index: ${profiles.length - index + 1};
            `}
          >
            <UserAvatar
              user={profile.user}
              avatar={profile.data?.avatar}
              size="s"
              css={avatarStyles}
              data-test-subj={`agentBuilderConversationInviteMemberAvatar-${profile.uid}`}
            />
          </EuiFlexItem>
        ))}

        {extraCount > 0 ? (
          <EuiFlexItem
            grow={false}
            css={css`
              margin-inline-start: calc(-${avatarOverlap} + 1px);
            `}
          >
            <EuiAvatar
              name={`${extraCount} more members`}
              initials={`+${extraCount}`}
              size="s"
              color={euiTheme.colors.primary}
              css={avatarStyles}
              data-test-subj="agentBuilderConversationInviteMembersExtraCount"
            />
          </EuiFlexItem>
        ) : null}
      </EuiFlexGroup>
    </ConversationShareTriggerButton>
  );
};

export const ConversationSharePopoverButton: React.FC<{
  canUpdateAccessControl: boolean;
  onClick: () => void;
}> = ({ canUpdateAccessControl, onClick }) => {
  const { profiles, extraCount, shouldShowSummary } = useInviteMembersSummary();

  if (!shouldShowSummary) {
    if (!canUpdateAccessControl) {
      return null;
    }

    return <InviteMembersButton onClick={onClick} />;
  }

  return (
    <InviteMembersSummaryButton
      canUpdateAccessControl={canUpdateAccessControl}
      extraCount={extraCount}
      onClick={onClick}
      profiles={profiles}
    />
  );
};
