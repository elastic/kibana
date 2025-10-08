/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import type { ReactNode } from 'react';
import React, { useEffect, useState } from 'react';
import { i18n } from '@kbn/i18n';
import { useEmbeddableMode } from '../../../context/embeddable_mode_context';

interface RoundLayoutProps {
  input: ReactNode;
  outputIcon: ReactNode;
  output: ReactNode;
  isResponseLoading: boolean;
  isCurrentRound: boolean;
  scrollContainerHeight: number;
}

const labels = {
  container: i18n.translate('xpack.onechat.round.container', {
    defaultMessage: 'Conversation round',
  }),
  userMessage: i18n.translate('xpack.onechat.round.userInput', {
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
  const { isEmbeddedMode } = useEmbeddableMode();

  useEffect(() => {
    // Disable min-height behavior in embeddable mode (e.g., flyouts)
    // as the scroll container height calculation doesn't work correctly
    if (isEmbeddedMode) {
      setRoundContainerMinHeight(0);
      return;
    }

    if (isCurrentRound && isResponseLoading) {
      setRoundContainerMinHeight(scrollContainerHeight);
    } else if (!isCurrentRound) {
      setRoundContainerMinHeight(0);
    }
  }, [isCurrentRound, isResponseLoading, scrollContainerHeight, isEmbeddedMode]);

  const { euiTheme } = useEuiTheme();
  const inputContainerStyles = css`
    width: 100%;
    align-self: end;
    max-inline-size: 80%;
    background-color: ${euiTheme.colors.backgroundBasePrimary};
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
