/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, euiTextBreakWord, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ReactNode } from 'react';
import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';

interface RoundLayoutProps {
  input: ReactNode;
  outputIcon: ReactNode;
  output: ReactNode;
  isResponseLoading: boolean;
  isCurrentRound: boolean;
  scrollContainerHeight: number;
}

const labels = {
  container: i18n.translate('xpack.agentBuilder.round.container', {
    defaultMessage: 'Conversation round',
  }),
  userMessage: i18n.translate('xpack.agentBuilder.round.userInput', {
    defaultMessage: 'User input',
  }),
};

export const RoundLayout: React.FC<RoundLayoutProps> = ({
  input,
  outputIcon,
  output,
  isResponseLoading,
  isCurrentRound,
  scrollContainerHeight,
}) => {
  const [roundContainerMinHeight, setRoundContainerMinHeight] = useState(0);

  useEffect(() => {
    if (isCurrentRound && isResponseLoading) {
      setRoundContainerMinHeight(scrollContainerHeight);
    } else if (!isCurrentRound) {
      setRoundContainerMinHeight(0);
    }
  }, [isCurrentRound, isResponseLoading, scrollContainerHeight]);

  const { euiTheme } = useEuiTheme();
  const inputContainerStyles = css`
    align-self: end;
    max-inline-size: 80%;
    background-color: ${euiTheme.colors.backgroundBasePrimary};
    ${euiTextBreakWord()}
  `;

  const roundContainerStyles = css`
    ${roundContainerMinHeight > 0 ? `min-height: ${roundContainerMinHeight}px;` : ''}
  `;

  return (
    <EuiFlexGroup
      direction="column"
      gutterSize="l"
      aria-label={labels.container}
      css={roundContainerStyles}
    >
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

      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="row" gutterSize="m">
          <EuiFlexItem grow={false}>{outputIcon}</EuiFlexItem>
          <EuiFlexItem>{output}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
