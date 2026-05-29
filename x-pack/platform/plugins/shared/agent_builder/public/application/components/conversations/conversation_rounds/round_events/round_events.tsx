/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { ConversationRoundStep } from '@kbn/agent-builder-common/chat/conversation';
import {
  isBackgroundAgentCompleteStep,
  isToolCallStep,
} from '@kbn/agent-builder-common/chat/conversation';
import { MasterToggle } from './master_toggle';
import { StepItem } from './step_item';

interface RoundEventsProps {
  steps: ConversationRoundStep[];
  isReloadedRound: boolean;
  hideMasterToggle?: boolean;
}

export const RoundEvents: React.FC<RoundEventsProps> = ({
  steps,
  isReloadedRound,
  hideMasterToggle = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(!isReloadedRound);
  const toggleExpanded = useCallback(() => setIsExpanded((v) => !v), []);

  if (steps.length === 0) return null;

  const stepsVisible = hideMasterToggle || isExpanded;

  const showToggle = !hideMasterToggle;
  const togglePosition: 'above' | 'below' = isExpanded ? 'below' : 'above';

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="agentBuilderThinkingPanel">
      {showToggle && togglePosition === 'above' && (
        <EuiFlexItem grow={false}>
          <MasterToggle expanded={isExpanded} onToggle={toggleExpanded} />
        </EuiFlexItem>
      )}
      {stepsVisible && (
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column" gutterSize="s">
            {steps.map((step, index) => (
              <EuiFlexItem grow={false} key={getStepKey(step, index)}>
                <StepItem step={step} />
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
          <EuiSpacer size="xs" />
        </EuiFlexItem>
      )}
      {showToggle && togglePosition === 'below' && (
        <EuiFlexItem grow={false}>
          <MasterToggle expanded={isExpanded} onToggle={toggleExpanded} />
        </EuiFlexItem>
      )}
    </EuiFlexGroup>
  );
};

const getStepKey = (step: ConversationRoundStep, index: number): string => {
  if (isToolCallStep(step)) return `tool-${step.tool_call_id}`;
  if (isBackgroundAgentCompleteStep(step)) return `bg-${step.execution_id}`;
  return `step-${index}-${step.type}`;
};
