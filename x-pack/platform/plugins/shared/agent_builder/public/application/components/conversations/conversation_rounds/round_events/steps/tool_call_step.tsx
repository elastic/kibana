/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiSpacer } from '@elastic/eui';
import { useBoolean } from '@kbn/react-hooks';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import type { ToolCallStep as ToolCallStepData } from '@kbn/agent-builder-common/chat/conversation';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import { StepLayout } from '../step_layout';
import { ToolResponseFlyout } from '../flyouts/tool_response_flyout';
import { useFlyoutStack } from '../flyouts/flyout_stack_context';
import { ToolCallStepHeadline } from './tool_call_step_headline';
import { findResultImageAttachment, ToolResultImage } from './tool_result_image';

interface ToolCallStepProps {
  step: ToolCallStepData;
  conversationAttachments?: VersionedAttachment[];
}

export const ToolCallStep: React.FC<ToolCallStepProps> = ({ step, conversationAttachments }) => {
  const flyoutStack = useFlyoutStack();
  const [isFlyoutOpen, { on: openFlyout, off: closeFlyout }] = useBoolean();

  const hasResults = step.results.length > 0;
  const handleClick = flyoutStack ? () => flyoutStack.openToolStep(step) : openFlyout;
  const resultImage = findResultImageAttachment(step, conversationAttachments);

  return (
    <div data-test-subj="agentBuilderToolCallStep">
      <StepLayout
        label={<ToolCallStepHeadline step={step} hasResults={hasResults} />}
        isExpandable={false}
        onClick={handleClick}
        ebtAction={AGENT_BUILDER_UI_EBT.action.conversation.VIEW_TOOL_RESPONSE}
      />
      {resultImage && (
        <>
          <EuiSpacer size="s" />
          <ToolResultImage image={resultImage} />
        </>
      )}
      {isFlyoutOpen && <ToolResponseFlyout step={step} onClose={closeFlyout} />}
    </div>
  );
};
