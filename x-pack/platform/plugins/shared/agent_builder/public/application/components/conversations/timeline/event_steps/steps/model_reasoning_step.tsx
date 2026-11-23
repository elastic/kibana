/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiText, type UseEuiTheme } from '@elastic/eui';
import { useBoolean } from '@kbn/react-hooks';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { AGENT_BUILDER_UI_EBT } from '@kbn/agent-builder-common';
import type {
  ConversationRoundStep,
  ModelReasoningStep as ModelReasoningStepData,
} from '@kbn/agent-builder-common/chat/conversation';
import { isModelReasoningStep } from '@kbn/agent-builder-common/chat/conversation';
import { StepLayout } from '../step_layout';

/** The model reasoning of the LLM response that requested a tool call group. */
export const findToolCallGroupModelReasoning = (
  steps: ConversationRoundStep[],
  toolCallGroupId: string
): ModelReasoningStepData | undefined =>
  steps
    .filter(isModelReasoningStep)
    .find((modelReasoning) => modelReasoning.tool_call_group_id === toolCallGroupId);

/** The model reasoning of the LLM response that requested no tools: the one behind the answer. */
export const findAnswerModelReasoning = (
  steps: ConversationRoundStep[]
): ModelReasoningStepData | undefined =>
  steps
    .filter(isModelReasoningStep)
    .findLast((modelReasoning) => modelReasoning.tool_call_group_id === undefined);

interface ModelReasoningTextProps {
  step: ModelReasoningStepData;
}

const reasoningTextStyles = ({ euiTheme }: UseEuiTheme) => css`
  border-inline-start: ${euiTheme.border.thin};
  padding-inline-start: ${euiTheme.size.m};
  white-space: pre-wrap;
  overflow-wrap: anywhere;
`;

/**
 * The provider's reasoning text. Rendered as plain text: it is raw model output, so links and
 * images in it are not made live.
 */
export const ModelReasoningText: React.FC<ModelReasoningTextProps> = ({ step }) => (
  <EuiText
    size="s"
    color="subdued"
    css={reasoningTextStyles}
    data-test-subj="agentBuilderModelReasoning"
  >
    {step.reasoning.trim()}
  </EuiText>
);

interface ModelReasoningStepProps {
  step: ModelReasoningStepData;
}

/** Model reasoning as a row of its own, for reasoning that has no intent line to expand from. */
export const ModelReasoningStep: React.FC<ModelReasoningStepProps> = ({ step }) => {
  const [isModelReasoningShown, { toggle: toggleModelReasoning }] = useBoolean(false);

  return (
    <div data-test-subj="agentBuilderModelReasoningStep">
      <StepLayout
        label={
          <EuiText size="s" color="inherit">
            <p>
              <FormattedMessage
                id="xpack.agentBuilder.eventSteps.steps.modelReasoning.label"
                defaultMessage="Thought"
              />
            </p>
          </EuiText>
        }
        onClick={toggleModelReasoning}
        isExpanded={isModelReasoningShown}
        expansion={<ModelReasoningText step={step} />}
        ebtAction={AGENT_BUILDER_UI_EBT.action.conversation.EXPAND_MODEL_REASONING}
      />
    </div>
  );
};
