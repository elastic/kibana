/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiPanel, useEuiTheme, euiTextBreakWord, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import React from 'react';

const labels = {
  userMessage: i18n.translate('xpack.onechat.round.userInput', {
    defaultMessage: 'User input',
  }),
};

// TODO: migrate to EUI
const borderRadius = '12px 12px 0 12px';

interface RoundInputProps {
  input: string;
}

export const RoundInput = ({ input }: RoundInputProps) => {
  const { euiTheme } = useEuiTheme();

  const backgroundColorStyle = {
    background: `linear-gradient(
          90deg,
          ${euiTheme.colors.backgroundBasePrimary} 0%,
          ${euiTheme.colors.backgroundBasePrimary} 70%,
          ${euiTheme.colors.backgroundBaseSubdued} 100%
        )`,
  };

  const inputContainerStyles = css`
    align-self: end;
    max-inline-size: 90%;
    background: ${backgroundColorStyle.background};
    ${euiTextBreakWord()}
    border-radius: ${borderRadius};
  `;

  return (
    <EuiPanel
      css={inputContainerStyles}
      paddingSize="l"
      hasShadow={false}
      hasBorder={false}
      aria-label={labels.userMessage}
    >
      <EuiText size="s">{input}</EuiText>
    </EuiPanel>
  );
};
