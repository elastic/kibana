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
import { UserAvatar } from '@kbn/user-profile-components';
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
  const { data: resolvedAuthorProfiles = [] } = useUserProfiles({
    uids: !hasUserProfileAuthor && author?.id ? [author.id] : [],
    enabled: shouldResolveAuthorProfile,
  });
  const resolvedAuthorProfile = hasUserProfileAuthor ? author : resolvedAuthorProfiles[0];
  const name = getRoundAuthorHeaderName({ agent, author, resolvedAuthorProfile });
  const showSlackOrigin = !isAgent && origin?.type === ConversationOriginType.Slack;
  const showAgentBadge = isAgent;
  const showSeparatorBeforeTime = Boolean(name) || showAgentBadge || showSlackOrigin;

  const headerStyles = css`
    line-height: ${euiTheme.size.base};
  `;

  const attributionStyles = css`
    display: inline-flex;
    align-items: center;
    gap: ${euiTheme.size.xs};
    flex-wrap: wrap;
  `;

  const metadataStyles = css`
    display: inline-flex;
    align-items: center;
    gap: ${euiTheme.size.xs};
    color: ${euiTheme.colors.textSubdued};
  `;

  const separatorStyles = css`
    color: ${euiTheme.colors.textSubdued};
  `;

  const agentBadgeStyles = css`
    background-color: #f2e6ff;
    color: #5e2ca5;
    border: none;
    box-shadow: none;
  `;

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false} css={headerStyles}>
      <EuiFlexItem grow={false}>
        {agent ? (
          <AgentAvatar agent={agent} size="s" iconPaddingSize="none" />
        ) : resolvedAuthorProfile ? (
          <UserAvatar
            user={resolvedAuthorProfile.user}
            avatar={resolvedAuthorProfile.data?.avatar}
            size="s"
          />
        ) : name ? (
          <EuiAvatar size="s" name={name} />
        ) : null}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <span css={attributionStyles}>
            {name && <strong>{name}</strong>}
            {showAgentBadge && (
              <>
                {name && <span css={separatorStyles}>&middot;</span>}
                <EuiBadge color="hollow" iconType="productAgent" css={agentBadgeStyles}>
                  {labels.agentBadge}
                </EuiBadge>
              </>
            )}
            {showSlackOrigin && (
              <>
                <span css={separatorStyles}>&middot;</span>
                <span css={metadataStyles}>
                  <EuiIcon type="logoSlack" size="s" aria-hidden={true} />
                  {labels.viaSlack}
                </span>
              </>
            )}
            {time && (
              <>
                {showSeparatorBeforeTime && <span css={separatorStyles}>&middot;</span>}
                <span css={metadataStyles}>{time}</span>
              </>
            )}
          </span>
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
