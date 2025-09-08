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

// Height offset for conversation UI elements to make last round expand to fill viewport
const CONVERSATION_UI_OFFSET = 248;

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
  const [shouldExpandToFillViewport, setShouldExpandToFillViewport] = useState(false);

  useEffect(() => {
    if (isCurrentRound && isResponseLoading) {
      setShouldExpandToFillViewport(true);
    } else if (!isCurrentRound) {
      setShouldExpandToFillViewport(false);
    }
  }, [isCurrentRound, isResponseLoading]);

  const { euiTheme } = useEuiTheme();
  const inputContainerStyles = css`
    width: 100%;
    align-self: end;
    max-inline-size: 80%;
    background-color: ${euiTheme.colors.backgroundBasePrimary};
  `;

  const outputContainerStyles = css`
    ${shouldExpandToFillViewport ? `min-height: calc(100vh - ${CONVERSATION_UI_OFFSET}px);` : ''}
  `;

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

      <EuiFlexItem grow={false} css={outputContainerStyles}>
        <EuiFlexGroup direction="row" gutterSize="m">
          <EuiFlexItem grow={false}>{outputIcon}</EuiFlexItem>
          <EuiFlexItem>{output}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
