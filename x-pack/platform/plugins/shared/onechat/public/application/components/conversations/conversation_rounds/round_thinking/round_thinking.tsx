/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import type { ConversationRound, ConversationRoundStep } from '@kbn/onechat-common';
import { RoundThinkingTitle } from './round_thinking_title';
import { RoundThinkingPanel } from './round_thinking_panel';

interface RoundThinkingProps {
  rawRound: ConversationRound;
  steps: ConversationRoundStep[];
  isLoading: boolean;
}

export const RoundThinking: React.FC<RoundThinkingProps> = ({ steps, isLoading, rawRound }) => {
  const [showThinkingPanel, setShowThinkingPanel] = useState(false);

  const toggleThinkingPanel = () => {
    setShowThinkingPanel(!showThinkingPanel);
  };

  // TODO: Implement error logic to show an error round here
  if (showThinkingPanel) {
    return (
      <RoundThinkingPanel
        steps={steps}
        isLoading={isLoading}
        rawRound={rawRound}
        onClose={toggleThinkingPanel}
      />
    );
  }

  return (
    <RoundThinkingTitle
      isLoading={isLoading}
      isError={false}
      hasSteps={steps.length > 0}
      onShow={toggleThinkingPanel}
    />
  );
};
