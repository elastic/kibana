/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ConversationRound, ConversationRoundStep } from '@kbn/agent-builder-common';
import { isReasoningStep } from '@kbn/agent-builder-common';
import { RoundThinkingTitle } from './round_thinking_title';

interface RoundThinkingProps {
  isAwaitingPrompt?: boolean;
  isLoading: boolean;
  rawRound: ConversationRound;
  steps: ConversationRoundStep[];
}

export const RoundThinking: React.FC<RoundThinkingProps> = ({
  isAwaitingPrompt,
  isLoading,
  steps,
}) => {
  const hasSteps =
    steps.length > 0 && steps.some((step) => !isReasoningStep(step) || step.transient !== true);

  return (
    <RoundThinkingTitle
      hasSteps={hasSteps}
      isAwaitingPrompt={isAwaitingPrompt}
      isLoading={isLoading}
      onShow={() => {}}
    />
  );
};
