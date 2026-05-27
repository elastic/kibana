/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { ConversationRoundStep } from '@kbn/agent-builder-common/chat/conversation';
import { MasterToggle } from './master_toggle';
import { StepItem } from './step_item';

interface RoundEventsProps {
  /**
   * Steps to render. The caller (`RoundLayout`) is responsible for slicing —
   * during live streaming the *latest* step is excluded here because it's
   * shown as the live indicator in the response body instead.
   */
  steps: ConversationRoundStep[];
  /**
   * Controls the master toggle's default state:
   *   - false (live round)            → expanded
   *   - true  (reloaded historical)   → collapsed
   *
   * The toggle never auto-collapses or auto-expands once mounted — the user
   * controls it from there. Ignored when `hideMasterToggle` is true.
   */
  isReloadedRound: boolean;
  /**
   * When true, skip rendering the round-level "Collapse reasoning / Show
   * reasoning" toggle entirely and always render the steps. Useful when this
   * component is nested inside another collapsible container (e.g. the
   * sub-agent execution flyout) where an additional toggle would be
   * redundant.
   *
   * Defaults to false.
   */
  hideMasterToggle?: boolean;
}

/**
 * Container for the events block — reasoning, tool calls, compaction, and
 * background-agent completion rendered together above the round response.
 */
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
  if ('tool_call_id' in step && step.tool_call_id) return `tool-${step.tool_call_id}`;
  if ('execution_id' in step && step.execution_id) return `bg-${step.execution_id}`;
  return `step-${index}-${step.type}`;
};
