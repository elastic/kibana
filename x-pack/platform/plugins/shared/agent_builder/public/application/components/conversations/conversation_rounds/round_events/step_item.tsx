/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import type { ConversationRoundStep } from '@kbn/agent-builder-common/chat/conversation';
import {
  isReasoningStep,
  isToolCallStep,
  isCompactionStep,
  isBackgroundAgentCompleteStep,
} from '@kbn/agent-builder-common/chat/conversation';
import { ReasoningStep } from './steps/reasoning_step';
import { ToolCallStep } from './steps/tool_call_step';
import { CompactionStep } from './steps/compaction_step';
import { BackgroundAgentStep } from './steps/background_agent_step';

interface StepItemProps {
  step: ConversationRoundStep;
}

export const StepItem: React.FC<StepItemProps> = ({ step }) => {
  if (isReasoningStep(step)) {
    if (step.transient) return null;
    return <ReasoningStep step={step} />;
  }
  if (isToolCallStep(step)) {
    return <ToolCallStep step={step} />;
  }
  if (isCompactionStep(step)) {
    return <CompactionStep step={step} />;
  }
  if (isBackgroundAgentCompleteStep(step)) {
    return <BackgroundAgentStep step={step} />;
  }
  return null;
};
