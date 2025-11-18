/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiAvatar, EuiLoadingElastic, useEuiTheme } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';

interface RoundIconProps {
  isLoading: boolean;
  isError: boolean;
}

const labels = {
  error: i18n.translate('xpack.agentBuilder.round.icon.error', {
    defaultMessage: 'Round has an error',
  }),
  loading: i18n.translate('xpack.agentBuilder.round.icon.loading', {
    defaultMessage: 'Round is loading',
  }),
  content: i18n.translate('xpack.agentBuilder.round.icon.content', {
    defaultMessage: 'Round content',
  }),
};

export const RoundIcon: React.FC<RoundIconProps> = ({ isLoading, isError }) => {
  const { euiTheme } = useEuiTheme();
  const loadingStyles = css`
    inline-size: ${euiTheme.size.xl};
    block-size: ${euiTheme.size.xl};
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  if (isError) {
    return (
      <EuiAvatar
        name={labels.error}
        aria-label={labels.error}
        iconType="warningFilled"
        iconColor={euiTheme.colors.textDanger}
        iconSize="m"
        color={euiTheme.colors.backgroundBaseDanger}
        size="m"
      />
    );
  }
  if (isLoading) {
    return (
      <div css={loadingStyles}>
        <EuiLoadingElastic size="l" aria-label={labels.loading} />
      </div>
    );
  }
  return (
    <EuiAvatar
      name={labels.content}
      aria-label={labels.content}
      iconType="logoElastic"
      iconSize="l"
      color={euiTheme.colors.backgroundBasePlain}
      size="m"
    />
  );
};
