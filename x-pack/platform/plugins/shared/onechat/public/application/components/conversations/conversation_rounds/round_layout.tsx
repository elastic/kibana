/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import React, { ReactNode } from 'react';
import { i18n } from '@kbn/i18n';

interface RoundLayoutProps {
  input: ReactNode;
  output: ReactNode;
}

export const RoundLayout: React.FC<RoundLayoutProps> = ({ input, output }) => {
  const { euiTheme } = useEuiTheme();
  const inputContainerStyles = css`
    width: 100%;
    align-self: end;
    max-inline-size: 80%;
    background-color: ${euiTheme.colors.backgroundBasePrimary};
  `;
  const labels = {
    container: i18n.translate('xpack.onechat.round.container', {
      defaultMessage: 'Conversation round',
    }),
    userMessage: i18n.translate('xpack.onechat.round.userInput', {
      defaultMessage: 'User input',
    }),
  };
  return (
    <EuiFlexGroup direction="column" gutterSize="l" aria-label={labels.container}>
      <EuiFlexItem grow={false}>
        <EuiPanel
          css={inputContainerStyles}
          paddingSize="m"
          hasShadow={false}
          hasBorder={false}
          aria-label={labels.userMessage}
        >
          {input}
        </EuiPanel>
      </EuiFlexItem>

      <EuiFlexItem grow={false}>{output}</EuiFlexItem>
    </EuiFlexGroup>
  );
};
