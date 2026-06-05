/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer } from '@elastic/eui';
import type { ConversationRoundStep } from '@kbn/agent-builder-common/chat/conversation';
import {
  isBackgroundAgentCompleteStep,
  isToolCallStep,
} from '@kbn/agent-builder-common/chat/conversation';
import type {
  VersionedAttachment,
  AttachmentVersionRef,
} from '@kbn/agent-builder-common/attachments';
import { StepItem } from './step_item';

interface RoundEventsProps {
  steps: ConversationRoundStep[];
  conversationAttachments?: VersionedAttachment[];
  attachmentRefs?: AttachmentVersionRef[];
  conversationId?: string;
}

export const RoundEvents: React.FC<RoundEventsProps> = ({
  steps,
  conversationAttachments,
  attachmentRefs,
  conversationId,
}) => {
  if (steps.length === 0) return null;

  return (
    <EuiFlexGroup direction="column" gutterSize="s" data-test-subj="agentBuilderThinkingPanel">
      <EuiFlexItem grow={false}>
        <EuiFlexGroup direction="column" gutterSize="s">
          {steps.map((step, index) => (
            <EuiFlexItem grow={false} key={getStepKey(step, index)}>
              <StepItem
                step={step}
                steps={steps}
                conversationAttachments={conversationAttachments}
                attachmentRefs={attachmentRefs}
                conversationId={conversationId}
              />
            </EuiFlexItem>
          ))}
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
