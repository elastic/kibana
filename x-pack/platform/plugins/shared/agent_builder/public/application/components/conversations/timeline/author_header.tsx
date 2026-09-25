/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiBadge, EuiIcon, EuiText, EuiToolTip, useEuiTheme } from '@elastic/eui';
import type { UseEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ConversationOriginType, type ConversationRoundOrigin } from '@kbn/agent-builder-common';
import moment from 'moment';

const labels = {
  agentBadge: i18n.translate('xpack.agentBuilder.authorHeader.agentBadge', {
    defaultMessage: 'Agent',
  }),
  viaSlack: i18n.translate('xpack.agentBuilder.authorHeader.viaSlack', {
    defaultMessage: 'via Slack',
  }),
};

const AuthorName: React.FC<{ name?: string }> = ({ name }) => <strong>{name}</strong>;

const authorDetailItemStyles = ({ euiTheme }: UseEuiTheme) => css`
  display: inline-flex;
  align-items: center;
  gap: ${euiTheme.size.xs};
  color: ${euiTheme.colors.textSubdued};
`;

const AuthorSeparator: React.FC = () => {
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

const AgentBadge: React.FC = () => {
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

const AuthorOrigin: React.FC<{ origin: ConversationRoundOrigin }> = ({ origin }) => {
  const euiThemeContext = useEuiTheme();

  return (
    <span css={authorDetailItemStyles(euiThemeContext)}>
      {origin.type === ConversationOriginType.Slack && (
        <>
          <EuiIcon type="logoSlack" size="s" aria-hidden={true} />
          {labels.viaSlack}
        </>
      )}
    </span>
  );
};

const AuthorLabel: React.FC<{ label: string }> = ({ label }) => {
  const euiThemeContext = useEuiTheme();

  return <span css={authorDetailItemStyles(euiThemeContext)}>{label}</span>;
};

const AuthorTime: React.FC<{ startedAt: string }> = ({ startedAt }) => {
  const euiThemeContext = useEuiTheme();
  const m = moment(startedAt).locale(i18n.getLocale());
  const displayTime = m.format('LT');
  const fullDateTime = m.format('LLL');

  return (
    <EuiToolTip content={fullDateTime}>
      <span css={authorDetailItemStyles(euiThemeContext)} tabIndex={0}>
        {displayTime}
      </span>
    </EuiToolTip>
  );
};

interface AuthorHeaderProps {
  name?: string;
  showAgentBadge?: boolean;
  label?: string;
  origin?: ConversationRoundOrigin;
  startedAt: string;
}

export const AuthorHeader: React.FC<AuthorHeaderProps> = ({
  name,
  showAgentBadge = false,
  label,
  origin,
  startedAt,
}) => {
  const { euiTheme } = useEuiTheme();

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
        {name && (
          <>
            <AuthorName name={name} />
            {showAgentBadge && <AgentBadge />}
            <AuthorSeparator />
          </>
        )}
        {label && (
          <>
            <AuthorLabel label={label} />
            <AuthorSeparator />
          </>
        )}
        {origin && (
          <>
            <AuthorOrigin origin={origin} />
            <AuthorSeparator />
          </>
        )}
        <AuthorTime startedAt={startedAt} />
      </span>
    </EuiText>
  );
};
