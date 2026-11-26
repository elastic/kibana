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

export const AuthorOrigin: React.FC<{ origin: ConversationRoundOrigin }> = ({ origin }) => {
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

export const AuthorTime: React.FC<{ startedAt: string }> = ({ startedAt }) => {
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
  /** Set to false to keep the time out of sight until it is wanted, for example on hover. */
  isTimeVisible?: boolean;
}

export const AuthorHeader: React.FC<AuthorHeaderProps> = ({
  name,
  showAgentBadge = false,
  label,
  origin,
  startedAt,
  isTimeVisible = true,
}) => {
  const { euiTheme } = useEuiTheme();
  const hasAttribution = Boolean(name || label || origin);

  const itemsStyles = css`
    display: inline-flex;
    align-items: center;
    gap: ${euiTheme.size.xs};
    flex-wrap: wrap;
  `;

  // Hidden, not removed, so the header keeps its height and the time stays reachable by keyboard.
  const timeStyles = css`
    opacity: ${isTimeVisible ? 1 : 0};
    transition: opacity ${euiTheme.animation.fast} ease;

    &:focus-within {
      opacity: 1;
    }
  `;

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
      <span css={itemsStyles}>
        {name && (
          <>
            <AuthorName name={name} />
            {showAgentBadge && <AgentBadge />}
          </>
        )}
        {label && (
          <>
            {name && <AuthorSeparator />}
            <AuthorLabel label={label} />
          </>
        )}
        {origin && (
          <>
            {(name || label) && <AuthorSeparator />}
            <AuthorOrigin origin={origin} />
          </>
        )}
        <span css={[itemsStyles, timeStyles]} data-test-subj="agentBuilderAuthorHeaderTime">
          {hasAttribution && <AuthorSeparator />}
          <AuthorTime startedAt={startedAt} />
        </span>
      </span>
    </EuiText>
  );
};
