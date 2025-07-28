/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { css } from '@emotion/react';
import { EuiBadge, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { i18n } from '@kbn/i18n';

interface RoundTimerProps {
  elapsedTime: number;
  isStopped: boolean;
}

const secondsSuffix = i18n.translate('xpack.onechat.round.timer.secondsSuffix', {
  defaultMessage: 's',
});

export const RoundTimer: React.FC<RoundTimerProps> = ({ elapsedTime, isStopped }) => {
  const { euiTheme } = useEuiTheme();

  const loadingStyles = css`
    background-color: ${euiTheme.colors.backgroundBaseSubdued};
    color: ${euiTheme.colors.textSubdued};
  `;

  const successStyles = css`
    background-color: ${euiTheme.colors.backgroundBaseSuccess};
    color: ${euiTheme.colors.success};
  `;

  return (
    <EuiBadge css={isStopped ? successStyles : loadingStyles}>
      {`${elapsedTime}${secondsSuffix}`}
    </EuiBadge>
  );
};
