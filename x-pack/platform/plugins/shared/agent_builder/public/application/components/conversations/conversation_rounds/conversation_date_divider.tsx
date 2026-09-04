/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiHorizontalRule, EuiText, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import moment from 'moment';

const formatDividerDate = (date: string): string => {
  const m = moment(date);
  const now = moment();

  if (m.isSame(now, 'day')) {
    return i18n.translate('xpack.agentBuilder.conversationDateDivider.today', {
      defaultMessage: 'Today',
    });
  }
  if (m.isSame(moment().subtract(1, 'day'), 'day')) {
    return i18n.translate('xpack.agentBuilder.conversationDateDivider.yesterday', {
      defaultMessage: 'Yesterday',
    });
  }
  if (m.isSame(now, 'year')) {
    return m.format('dddd, MMMM D');
  }
  return m.format('MMMM D, YYYY');
};

export const ConversationDateDivider: React.FC<{ date: string }> = ({ date }) => {
  const { euiTheme } = useEuiTheme();
  const label = formatDividerDate(date);

  return (
    <div
      css={css`
        display: flex;
        align-items: center;
        gap: ${euiTheme.size.s};
        padding: ${euiTheme.size.xs} 0;
      `}
      role="separator"
      aria-label={label}
    >
      <EuiHorizontalRule
        margin="none"
        css={css`
          flex: 1;
        `}
      />
      <EuiText
        size="xs"
        css={css`
          color: ${euiTheme.colors.textSubdued};
          white-space: nowrap;
          flex-shrink: 0;
          user-select: none;
        `}
      >
        {label}
      </EuiText>
      <EuiHorizontalRule
        margin="none"
        css={css`
          flex: 1;
        `}
      />
    </div>
  );
};
