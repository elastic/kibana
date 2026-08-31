/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiAvatar,
  EuiBadge,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { UserAvatar, type UserProfileWithAvatar } from '@kbn/user-profile-components';
import { ConversationOriginType, type ConversationRoundOrigin } from '@kbn/agent-builder-common';
import type { AgentDefinition } from '@kbn/agent-builder-common/agents';
import { useUserProfiles } from '../../../hooks/use_user_profiles';
import { AgentAvatar } from '../../common/agent_avatar';
import { getRoundAuthorHeaderName, isUserProfileAuthor, type RoundAuthor } from './round_author';

const labels = {
  agentBadge: i18n.translate('xpack.agentBuilder.roundAuthor.agentBadge', {
    defaultMessage: 'Agent',
  }),
  viaSlack: i18n.translate('xpack.agentBuilder.roundAuthor.viaSlack', {
    defaultMessage: 'via Slack',
  }),
};

const formatRoundTime = (startedAt: string): string => {
  const date = new Date(startedAt);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

interface RoundAuthorAvatarProps {
  agent?: AgentDefinition;
  authorProfile?: UserProfileWithAvatar;
  name?: string;
}

const RoundAuthorAvatar: React.FC<RoundAuthorAvatarProps> = ({ agent, authorProfile, name }) => {
  if (agent) {
    return <AgentAvatar agent={agent} size="s" iconPaddingSize="none" />;
  }

  if (authorProfile) {
    return <UserAvatar user={authorProfile.user} avatar={authorProfile.data?.avatar} size="s" />;
  }

  if (name) {
    return <EuiAvatar size="s" name={name} />;
  }

  return null;
};

const RoundAuthorName: React.FC<{ name?: string }> = ({ name }) => <strong>{name}</strong>;

const RoundAuthorSeparator: React.FC = () => {
  const { euiTheme } = useEuiTheme();

  return (
    <span
      css={css`
        color: ${euiTheme.colors.textSubdued};
      `}
    >
      &middot;
    </span>
  );
};

const RoundAgentBadge: React.FC = () => {
  return (
    <EuiBadge
      color="hollow"
      iconType="productAgent"
      css={css`
        background-color: #f2e6ff;
        color: #5e2ca5;
        border: none;
        box-shadow: none;
      `}
    >
      {labels.agentBadge}
    </EuiBadge>
  );
};

const RoundOrigin: React.FC<{ origin: ConversationRoundOrigin }> = ({ origin }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <span
      css={css`
        display: inline-flex;
        align-items: center;
        gap: ${euiTheme.size.xs};
        color: ${euiTheme.colors.textSubdued};
      `}
    >
      {origin.type === ConversationOriginType.Slack && (
        <>
          <EuiIcon type="logoSlack" size="s" aria-hidden={true} />
          {labels.viaSlack}
        </>
      )}
    </span>
  );
};

const RoundTime: React.FC<{ time: string }> = ({ time }) => {
  const { euiTheme } = useEuiTheme();

  return (
    <span
      css={css`
        display: inline-flex;
        align-items: center;
        gap: ${euiTheme.size.xs};
        color: ${euiTheme.colors.textSubdued};
      `}
    >
      {time}
    </span>
  );
};

interface RoundAuthorHeaderProps {
  author?: RoundAuthor;
  origin?: ConversationRoundOrigin;
  startedAt: string;
  agent?: AgentDefinition;
}

export const RoundAuthorHeader: React.FC<RoundAuthorHeaderProps> = ({
  author,
  origin,
  startedAt,
  agent,
}) => {
  const { euiTheme } = useEuiTheme();
  const time = formatRoundTime(startedAt);
  const isAgent = Boolean(agent);
  const hasUserProfileAuthor = isUserProfileAuthor(author);
  const shouldResolveAuthorProfile =
    !isAgent && !hasUserProfileAuthor && !origin && Boolean(author?.id);
  const { data: authorProfiles = [] } = useUserProfiles({
    uids: !hasUserProfileAuthor && author?.id ? [author.id] : [],
    enabled: shouldResolveAuthorProfile,
  });
  const authorProfile = hasUserProfileAuthor ? author : authorProfiles[0];
  const name = getRoundAuthorHeaderName({ agent, author, authorProfile });

  return (
    <EuiFlexGroup
      gutterSize="s"
      alignItems="center"
      responsive={false}
      css={css`
        line-height: ${euiTheme.size.base};
      `}
    >
      <EuiFlexItem grow={false}>
        <RoundAuthorAvatar agent={agent} authorProfile={authorProfile} name={name} />
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <span
            css={css`
              display: inline-flex;
              align-items: center;
              gap: ${euiTheme.size.xs};
              flex-wrap: wrap;
            `}
          >
            {name && <RoundAuthorName name={name} />}
            {isAgent && (
              <>
                <RoundAgentBadge />
              </>
            )}
            {origin && (
              <>
                <RoundAuthorSeparator />
                <RoundOrigin origin={origin} />
              </>
            )}
            {time && (
              <>
                <RoundAuthorSeparator />
                <RoundTime time={time} />
              </>
            )}
          </span>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
