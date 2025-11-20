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

interface RoundInputProps {
  input: string;
}

export const RoundInput = ({ input }: RoundInputProps) => {
  const { euiTheme } = useEuiTheme();
  const inputContainerStyles = css`
    align-self: end;
    max-inline-size: 80%;
    background-color: ${euiTheme.colors.backgroundBasePrimary};
    ${euiTextBreakWord()}
  `;

  return (
    <EuiPanel
      css={inputContainerStyles}
      paddingSize="m"
      hasShadow={false}
      hasBorder={false}
      aria-label={labels.userMessage}
    >
      <EuiText size="s">{input}</EuiText>
    </EuiPanel>
  );
};
