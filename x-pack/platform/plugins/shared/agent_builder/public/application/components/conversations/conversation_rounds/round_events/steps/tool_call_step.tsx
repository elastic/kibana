/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Fragment } from 'react';
import { EuiSpacer } from '@elastic/eui';
import { useBoolean } from '@kbn/react-hooks';
import { internalTools, AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import type { ToolCallStep as ToolCallStepData } from '@kbn/agent-builder-common/chat/conversation';
import { StepLayout } from '../step_layout';
import { ToolResult } from '../results/tool_result';
import { ToolResponseFlyout } from '../flyouts/tool_response_flyout';
import { SubAgentExecutionFlyout } from '../flyouts/sub_agent_execution_flyout';
import { ToolCallStepHeadline } from './tool_call_step_headline';

interface ToolCallStepProps {
  step: ToolCallStepData;
}

export const ToolCallStep: React.FC<ToolCallStepProps> = ({ step }) => {
  const [isFlyoutOpen, { on: openFlyout, off: closeFlyout }] = useBoolean();

  const hasResults = step.results.length > 0;

  const isSubAgentCall = step.tool_id === internalTools.runSubagent;
  const subAgentExecutionId = isSubAgentCall ? getSubAgentExecutionId(step) : undefined;
  const showSubAgentFlyout = isSubAgentCall && Boolean(subAgentExecutionId);
  const canOpenFlyout = showSubAgentFlyout || hasResults;

  return (
    <div data-test-subj="agentBuilderToolCallStep">
      <StepLayout
        label={<ToolCallStepHeadline step={step} hasResults={hasResults} />}
        isExpandable={false}
        onClick={canOpenFlyout ? openFlyout : undefined}
        ebtAction={
          showSubAgentFlyout
            ? AGENT_BUILDER_UI_EBT.action.conversation.VIEW_SUB_AGENT_EXECUTION
            : AGENT_BUILDER_UI_EBT.action.conversation.VIEW_TOOL_RESPONSE
        }
      />
      {isFlyoutOpen && showSubAgentFlyout && (
        <SubAgentExecutionFlyout
          executionId={subAgentExecutionId!}
          params={step.params}
          onClose={closeFlyout}
        />
      )}
      {isFlyoutOpen && !showSubAgentFlyout && (
        <ToolResponseFlyout isOpen onClose={closeFlyout}>
          {step.results.map((result, idx) => (
            <Fragment key={`flyout-result-${idx}`}>
              <ToolResult result={result} />
              {idx < step.results.length - 1 && <EuiSpacer size="m" />}
            </Fragment>
          ))}
        </ToolResponseFlyout>
      )}
    </div>
  );
};

interface SubAgentResultData {
  agent_execution_id?: string;
}

const getSubAgentExecutionId = (step: ToolCallStepData): string | undefined => {
  const fromResults = step.results.find(
    (r) => (r.data as SubAgentResultData | undefined)?.agent_execution_id
  );
  if (fromResults) {
    return (fromResults.data as SubAgentResultData).agent_execution_id;
  }
  return step.progression?.find((p) => p.metadata?.agent_execution_id)?.metadata
    ?.agent_execution_id;
};
