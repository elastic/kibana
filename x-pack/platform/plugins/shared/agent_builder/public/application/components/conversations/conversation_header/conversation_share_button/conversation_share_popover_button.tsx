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
import { useConversationPermissions } from '../../../../hooks/use_conversation';
import { useInviteMembersSummary } from '../../../../hooks/use_conversation_access_control';
import { extraMembersLabel, inviteLabel, sharingLabel } from './conversation_share_i18n';

const EXTRA_COUNT_AVATAR_OVERLAP_OFFSET = 1;

interface ConversationShareTriggerButtonProps {
  ariaLabel: string;
  children: React.ReactNode;
  onClick: () => void;
}

const ConversationShareTriggerButton: React.FC<ConversationShareTriggerButtonProps> = ({
  ariaLabel,
  children,
  onClick,
}) => {
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

interface InviteMembersButtonProps {
  onClick: () => void;
}

const InviteMembersButton: React.FC<InviteMembersButtonProps> = ({ onClick }) => {
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

interface InviteMembersSummaryButtonProps {
  canUpdateAccessControl: boolean;
  extraCount: number;
  onClick: () => void;
  profiles: UserProfileWithAvatar[];
}

const InviteMembersSummaryButton: React.FC<InviteMembersSummaryButtonProps> = ({
  canUpdateAccessControl,
  extraCount,
  onClick,
  profiles,
}) => {
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
              margin-inline-start: calc(-${avatarOverlap} + ${EXTRA_COUNT_AVATAR_OVERLAP_OFFSET}px);
            `}
          >
            <EuiAvatar
              name={extraMembersLabel(extraCount)}
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

interface ConversationSharePopoverButtonProps {
  onClick: () => void;
}

export const ConversationSharePopoverButton: React.FC<ConversationSharePopoverButtonProps> = ({
  onClick,
}) => {
  const { update_access_control: canUpdateAccessControl } = useConversationPermissions();
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
