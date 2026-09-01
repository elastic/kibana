/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiIcon, EuiText, useEuiTheme } from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ConversationOriginType, type ConversationRoundOrigin } from '@kbn/agent-builder-common';
import type { AgentDefinition } from '@kbn/agent-builder-common/agents';
import moment from 'moment';
import { useRoundAuthorProfile } from '../../../hooks/use_round_author_profile';
import { getRoundAuthorHeaderName, type RoundAuthor } from './round_author_helpers';

const labels = {
  agentBadge: i18n.translate('xpack.agentBuilder.roundAuthor.agentBadge', {
    defaultMessage: 'Agent',
  }),
  viaSlack: i18n.translate('xpack.agentBuilder.roundAuthor.viaSlack', {
    defaultMessage: 'via Slack',
  }),
};

const RoundAuthorName: React.FC<{ name?: string }> = ({ name }) => <strong>{name}</strong>;

const roundAuthorDetailItemStyles = ({ euiTheme }: UseEuiTheme) => css`
  display: inline-flex;
  align-items: center;
  gap: ${euiTheme.size.xs};
  color: ${euiTheme.colors.textSubdued};
`;

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
  const { euiTheme } = useEuiTheme();

  return (
    <EuiBadge
      color="hollow"
      iconType="productAgent"
      css={css`
        background-color: ${euiTheme.colors.backgroundLightAssistance};
        color: ${euiTheme.colors.backgroundFilledAssistance};
        border: none;
        box-shadow: none;
      `}
    >
      {labels.agentBadge}
    </EuiBadge>
  );
};

const RoundOrigin: React.FC<{ origin: ConversationRoundOrigin }> = ({ origin }) => {
  const euiThemeContext = useEuiTheme();

  return (
    <span css={roundAuthorDetailItemStyles(euiThemeContext)}>
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
  const euiThemeContext = useEuiTheme();

  return <span css={roundAuthorDetailItemStyles(euiThemeContext)}>{time}</span>;
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
  const time = moment(startedAt).format('LT');
  const isAgent = Boolean(agent);
  const authorProfile = useRoundAuthorProfile({ agent, author, origin });
  const name = getRoundAuthorHeaderName({ agent, author, authorProfile });

  return (
    <EuiText
      size="xs"
      css={css`
        min-block-size: ${euiTheme.size.l};
        display: flex;
        align-items: center;
        line-height: ${euiTheme.size.base};
      `}
    >
      <span
        css={css`
          display: inline-flex;
          align-items: center;
          gap: ${euiTheme.size.xs};
          flex-wrap: wrap;
        `}
      >
        {isAgent ? (
          <>
            {name && <RoundAuthorName name={name} />}
            <RoundAgentBadge />
            <RoundAuthorSeparator />
          </>
        ) : (
          name && (
            <>
              <RoundAuthorName name={name} />
              <RoundAuthorSeparator />
            </>
          )
        )}
        {origin && (
          <>
            <RoundOrigin origin={origin} />
            <RoundAuthorSeparator />
          </>
        )}
        <RoundTime time={time} />
      </span>
    </EuiText>
  );
};
