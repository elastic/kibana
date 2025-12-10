/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { ConversationRound, ConversationRoundStep } from '@kbn/onechat-common';
import { isReasoningStep } from '@kbn/onechat-common';
import { EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import { css, keyframes } from '@emotion/react';
import { RoundThinkingTitle } from './round_thinking_title';
import { RoundThinkingPanel } from './round_thinking_panel';

interface RoundThinkingProps {
  rawRound: ConversationRound;
  steps: ConversationRoundStep[];
  isLoading: boolean;
}

const bounceIn = keyframes`
  0% {
    opacity: 0;
    transform: scale(0.9);
  }
  70% {
    opacity: 1;
    transform: scale(1.02);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
`;

export const RoundThinking: React.FC<RoundThinkingProps> = ({ steps, isLoading, rawRound }) => {
  const { euiTheme } = useEuiTheme();
  const [showThinkingPanel, setShowThinkingPanel] = useState(false);

  const toggleThinkingPanel = () => {
    setShowThinkingPanel(!showThinkingPanel);
  };

  const bounceInStyles = css`
    animation: ${bounceIn} ${euiTheme.animation.normal} ease-out;
    transform-origin: top left;
  `;

  if (showThinkingPanel) {
    return (
      <EuiFlexGroup css={bounceInStyles} responsive={false}>
        <EuiFlexItem>
          <RoundThinkingPanel
            steps={steps}
            isLoading={isLoading}
            rawRound={rawRound}
            onClose={toggleThinkingPanel}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    );
  }

  const hasSteps =
    steps.length > 0 && steps.some((step) => !isReasoningStep(step) || step.transient !== true);

  return (
    <RoundThinkingTitle isLoading={isLoading} hasSteps={hasSteps} onShow={toggleThinkingPanel} />
  );
};
