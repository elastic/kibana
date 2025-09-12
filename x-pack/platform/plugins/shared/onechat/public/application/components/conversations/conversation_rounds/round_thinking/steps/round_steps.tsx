/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ConversationRoundStep,
  ToolCallProgress,
  ToolCallStep,
} from '@kbn/onechat-common/chat/conversation';
import { isReasoningStep, isToolCallStep } from '@kbn/onechat-common/chat/conversation';
import type { ToolResult } from '@kbn/onechat-common/tools/tool_result';
import { ToolResultType } from '@kbn/onechat-common/tools/tool_result';
import type { ReactNode } from 'react';
import React from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiFlexItem, EuiHorizontalRule, EuiLink, EuiText } from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useNavigation } from '../../../../../hooks/use_navigation';
import { appPaths } from '../../../../../utils/app_paths';
import { TabularDataResultStep } from './tabular_data_result_step';
import { OtherResultStep } from './other_result_step';
import { QueryResultStep } from './query_result_step';

interface ToolResultDisplayProps {
  toolResult: ToolResult;
}

const ToolResultDisplay: React.FC<ToolResultDisplayProps> = ({ toolResult }) => {
  switch (toolResult.type) {
    // TODO: Add resource result step once we can reliably access the reference ID
    // case ToolResultType.resource:
    //   return <ResourceResultStep result={toolResult} />;
    case ToolResultType.query:
      return <QueryResultStep result={toolResult} />;
    case ToolResultType.tabularData:
      return <TabularDataResultStep result={toolResult} />;
    default:
      // Other results
      // Also showing Resource results as Other results for now as JSON blobs
      return <OtherResultStep result={toolResult} />;
  }
};

interface ThinkingItemLayoutProps {
  content: ReactNode;
}

const ThinkingItemLayout: React.FC<ThinkingItemLayoutProps> = ({ content }) => {
  return (
    // No gap because we're using the margin on the horizontal divider
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem grow={false}>{content}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiHorizontalRule margin="m" />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const ToolCallDisplay: React.FC<{
  step: ToolCallStep;
}> = ({ step: { tool_id: toolId } }) => {
  const { createOnechatUrl } = useNavigation();
  const toolHref = createOnechatUrl(appPaths.tools.details({ toolId }));
  return (
    <ThinkingItemLayout
      content={
        <EuiText size="s">
          <p>
            <FormattedMessage
              id="xpack.onechat.thinking.toolCallThinkingItem"
              defaultMessage="Calling tool {tool}"
              values={{
                tool: (
                  <code>
                    <EuiLink href={toolHref} target="_blank">
                      {toolId}
                    </EuiLink>
                  </code>
                ),
              }}
            />
          </p>
        </EuiText>
      }
    />
  );
};

const ToolProgressDisplay: React.FC<{
  progress: ToolCallProgress;
}> = ({ progress }) => {
  return <ThinkingItemLayout content={progress.message} />;
};

interface RoundStepsProps {
  steps: ConversationRoundStep[];
}

const labels = {
  roundThinkingSteps: i18n.translate('xpack.onechat.conversation.thinking.stepsList', {
    defaultMessage: 'Round thinking steps',
  }),
};

const getProgressionItems = ({ step, stepIndex }: { step: ToolCallStep; stepIndex: number }) => {
  return (
    step.progression?.map((progress, index) => (
      <ToolProgressDisplay
        key={`step-${stepIndex}-${step.tool_id}-progress-${index}`}
        progress={progress}
      />
    )) ?? []
  );
};

const getResultItems = ({ step, stepIndex }: { step: ToolCallStep; stepIndex: number }) => {
  return step.results.map((result: ToolResult, index) => (
    <ThinkingItemLayout
      key={`step-${stepIndex}-${step.tool_id}-result-${index}`}
      content={<ToolResultDisplay toolResult={result} />}
    />
  ));
};

const stepsListStyles = css`
  list-style: none;
  padding: none;
`;

export const RoundSteps: React.FC<RoundStepsProps> = ({ steps }) => {
  // Each step will map to multiple thinking items
  // In the case of tool call steps we'll have
  // an item for the tool call, items for the progression, and items for the tool call results
  return (
    <ol css={stepsListStyles} aria-label={labels.roundThinkingSteps}>
      {steps.flatMap((step, stepIndex): ReactNode => {
        if (isToolCallStep(step)) {
          return [
            <ToolCallDisplay key={`step-${stepIndex}-tool-call`} step={step} />,
            ...getProgressionItems({ step, stepIndex }),
            ...getResultItems({ step, stepIndex }),
          ];
        }

        // Display agent reasoning the same as tool call progress
        if (isReasoningStep(step)) {
          return [
            <ThinkingItemLayout key={`step-reasoning-${stepIndex}`} content={step.reasoning} />,
          ];
        }

        return [];
      })}
    </ol>
  );
};
