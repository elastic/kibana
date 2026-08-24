/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAvatar, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import {
  agentBuilderDefaultAgentId,
  ConversationOriginType,
  type ConversationRoundAuthor,
  type ConversationRoundOrigin,
} from '@kbn/agent-builder-common';
import { AgentAvatar } from '../../common/agent_avatar';

const labels = {
  fallbackUser: i18n.translate('xpack.agentBuilder.roundAuthor.fallbackUser', {
    defaultMessage: 'Me',
  }),
  agent: i18n.translate('xpack.agentBuilder.roundAuthor.agent', {
    defaultMessage: 'Elastic AI Agent',
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

const getAuthorName = (author?: ConversationRoundAuthor): string => {
  return author?.full_name || author?.username || labels.fallbackUser;
};

interface RoundAuthorHeaderProps {
  author?: ConversationRoundAuthor;
  origin?: ConversationRoundOrigin;
  startedAt: string;
  actor: 'user' | 'agent';
}

export const RoundAuthorHeader: React.FC<RoundAuthorHeaderProps> = ({
  author,
  origin,
  startedAt,
  actor,
}) => {
  const { euiTheme } = useEuiTheme();
  const time = formatRoundTime(startedAt);
  const name = actor === 'agent' ? labels.agent : getAuthorName(author);
  const showSlackOrigin = actor === 'user' && origin?.type === ConversationOriginType.Slack;

  const headerStyles = css`
    line-height: ${euiTheme.size.base};
  `;

  const metadataStyles = css`
    display: inline-flex;
    align-items: center;
    gap: ${euiTheme.size.xs};
    margin-inline-start: ${euiTheme.size.xs};
    color: ${euiTheme.colors.textSubdued};
  `;

  return (
    <EuiFlexGroup gutterSize="xs" alignItems="flexStart" responsive={false} css={headerStyles}>
      <EuiFlexItem grow={false}>
        {actor === 'agent' ? (
          <AgentAvatar
            agentId={agentBuilderDefaultAgentId}
            name={labels.agent}
            symbol={undefined}
            color="subdued"
            size="s"
          />
        ) : (
          <EuiAvatar size="s" name={name} />
        )}
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiText size="xs">
          <strong>{name}</strong>
          {showSlackOrigin && (
            <span css={metadataStyles}>
              <EuiIcon type="logoSlack" size="s" aria-hidden={true} />
              {labels.viaSlack}
            </span>
          )}
          {time && (
            <div
              css={css`
                color: ${euiTheme.colors.textSubdued};
              `}
            >
              {time}
            </div>
          )}
        </EuiText>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
