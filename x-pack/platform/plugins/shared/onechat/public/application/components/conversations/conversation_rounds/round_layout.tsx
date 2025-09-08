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

// A new round should have a min-height equal to the scroll container height
const getScrollContainerHeight = () => {
  const container = document.querySelector(
    '[id="onechatConversationScrollContainer"]'
  ) as HTMLDivElement;
  return container?.clientHeight || 0;
};

interface RoundLayoutProps {
  input: ReactNode;
  outputIcon: ReactNode;
  output: ReactNode;
  isResponseLoading: boolean;
  isCurrentRound: boolean;
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
}) => {
  const [viewportOffset, setViewportOffset] = useState(0);

  useEffect(() => {
    if (isCurrentRound && isResponseLoading) {
      setViewportOffset(getScrollContainerHeight());
    } else if (!isCurrentRound) {
      setViewportOffset(0);
    }
  }, [isCurrentRound, isResponseLoading]);

  const { euiTheme } = useEuiTheme();
  const inputContainerStyles = css`
    width: 100%;
    align-self: end;
    max-inline-size: 80%;
    background-color: ${euiTheme.colors.backgroundBasePrimary};
  `;

  const roundContainerStyles = css`
    ${viewportOffset > 0 ? `min-height: ${viewportOffset}px;` : ''}
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
