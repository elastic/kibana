/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type {
  ConversationRoundStep,
  ToolCallStep,
} from '@kbn/agent-builder-common/chat/conversation';
import {
  isBackgroundAgentCompleteStep,
  isToolCallStep,
} from '@kbn/agent-builder-common/chat/conversation';
import type {
  VersionedAttachment,
  AttachmentVersionRef,
} from '@kbn/agent-builder-common/attachments';
import { StepItem } from './step_item';
import { ToolCallGroup } from './steps/tool_call_group';

interface RoundEventsProps {
  steps: ConversationRoundStep[];
  conversationAttachments?: VersionedAttachment[];
  attachmentRefs?: AttachmentVersionRef[];
  conversationId?: string;
}

export type DisplayItem =
  | { kind: 'step'; step: ConversationRoundStep; index: number }
  | { kind: 'group'; groupId: string; steps: ToolCallStep[] };

export const buildDisplayItems = (steps: ConversationRoundStep[]): DisplayItem[] => {
  // Count tool calls per group id so we know which groups have >1 member
  const groupCounts = new Map<string, number>();
  for (const step of steps) {
    if (isToolCallStep(step) && step.tool_call_group_id) {
      groupCounts.set(step.tool_call_group_id, (groupCounts.get(step.tool_call_group_id) ?? 0) + 1);
    }
  }

  const items: DisplayItem[] = [];
  const seenGroupIds = new Set<string>();

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const groupId = isToolCallStep(step) ? step.tool_call_group_id : undefined;

    if (groupId && (groupCounts.get(groupId) ?? 0) > 1) {
      if (!seenGroupIds.has(groupId)) {
        seenGroupIds.add(groupId);
        const groupSteps = steps.filter(
          (s): s is ToolCallStep => isToolCallStep(s) && s.tool_call_group_id === groupId
        );
        items.push({ kind: 'group', groupId, steps: groupSteps });
      }
    } else {
      items.push({ kind: 'step', step, index: i });
    }
  }

  return items;
};

export const RoundEvents: React.FC<RoundEventsProps> = ({
  steps,
  conversationAttachments,
  attachmentRefs,
  conversationId,
}) => {
  if (steps.length === 0) return null;

  const displayItems = buildDisplayItems(steps);

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="agentBuilderThinkingPanel">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="column" gutterSize="s">
          {displayItems.map((item) => {
            if (item.kind === 'group') {
              return (
                <EuiFlexItem grow={false} key={`group-${item.groupId}`}>
                  <ToolCallGroup steps={item.steps} />
                </EuiFlexItem>
              );
            }
            return (
              <EuiFlexItem grow={false} key={getStepKey(item.step, item.index)}>
                <StepItem
                  step={item.step}
                  steps={steps}
                  conversationAttachments={conversationAttachments}
                  attachmentRefs={attachmentRefs}
                  conversationId={conversationId}
                />
              </EuiFlexItem>
            );
          })}
        </EuiFlexGroup>
        <EuiSpacer size="xs" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const getStepKey = (step: ConversationRoundStep, index: number): string => {
  if (isToolCallStep(step)) return `tool-${step.tool_call_id}`;
  if (isBackgroundAgentCompleteStep(step)) return `bg-${step.execution_id}`;
  return `step-${index}-${step.type}`;
};
