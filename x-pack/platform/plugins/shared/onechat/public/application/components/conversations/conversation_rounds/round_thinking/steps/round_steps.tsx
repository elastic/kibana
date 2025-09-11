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
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiLink,
  EuiText,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { useNavigation } from '../../../../../hooks/use_navigation';
import { appPaths } from '../../../../../utils/app_paths';
import { TabularDataResultStep } from './tabular_data_result_step';
import { OtherResultStep } from './other_result_step';
import { QueryResultStep } from './query_result_step';
import { RoundResultsFlyout } from '../../round_results_flyout';
import { useToolResultsFlyout } from '../../../../../hooks/thinking/use_tool_results_flyout';

interface ToolResultDisplayProps {
  toolResult: ToolResult;
}

// Exposed in main thinking chain, for now query and tabular data
const mainThinkingResultTypes = [
  ToolResultType.query,
  ToolResultType.tabularData,
  ToolResultType.error,
];
// Populated in flyout
const flyoutResultTypes = [ToolResultType.other, ToolResultType.resource];

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
  children: ReactNode;
}

const ThinkingItemLayout: React.FC<ThinkingItemLayoutProps> = ({ children }) => {
  return (
    // No gap because we're using the margin on the horizontal divider
    <EuiFlexGroup direction="column" gutterSize="none">
      <EuiFlexItem grow={false}>{children}</EuiFlexItem>
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
    <ThinkingItemLayout>
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
    </ThinkingItemLayout>
  );
};

const ToolProgressDisplay: React.FC<{
  progress: ToolCallProgress;
}> = ({ progress }) => {
  return <ThinkingItemLayout>{progress.message}</ThinkingItemLayout>;
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

const getMainThinkingResultItems = ({
  step,
  stepIndex,
}: {
  step: ToolCallStep;
  stepIndex: number;
}) => {
  return step.results
    .filter((result: ToolResult) => mainThinkingResultTypes.includes(result.type))
    .map((result: ToolResult, index) => (
      <ThinkingItemLayout key={`step-${stepIndex}-${step.tool_id}-result-${index}`}>
        <ToolResultDisplay toolResult={result} />
      </ThinkingItemLayout>
    ));
};

const getFlyoutResultItems = ({
  step,
  stepIndex,
  onOpenFlyout,
}: {
  step: ToolCallStep;
  stepIndex: number;
  onOpenFlyout: (results: ToolResult[]) => void;
}) => {
  const flyoutResultItems = step.results.filter((result: ToolResult) =>
    flyoutResultTypes.includes(result.type)
  );

  if (flyoutResultItems.length > 0) {
    return [
      <ThinkingItemLayout key={`step-${stepIndex}-${step.tool_id}-result-flyout`}>
        <EuiFlexGroup direction="row" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              size="s"
              iconType="eye"
              color="primary"
              iconSide="left"
              onClick={() => onOpenFlyout(flyoutResultItems)}
              aria-haspopup="dialog"
              aria-label={i18n.translate('xpack.onechat.conversation.roundResultsButtonAriaLabel', {
                defaultMessage: 'View tool call results',
              })}
            >
              {i18n.translate('xpack.onechat.conversation.roundResultsButton', {
                defaultMessage: 'Tool call results',
              })}
            </EuiButtonEmpty>
          </EuiFlexItem>
        </EuiFlexGroup>
      </ThinkingItemLayout>,
    ];
  }
  return [];
};

const stepsListStyles = css`
  list-style: none;
  padding: 0;
`;

export const RoundSteps: React.FC<RoundStepsProps> = ({ steps }) => {
  // Each step will map to multiple thinking items
  // In the case of tool call steps we'll have
  // an item for the tool call, items for the progression, and items for the tool call results

  const {
    toolResults,
    isOpen: isToolResultsFlyoutOpen,
    openFlyout,
    closeFlyout,
  } = useToolResultsFlyout();

  const renderedSteps = useMemo(() => {
    return steps.flatMap((step, stepIndex): ReactNode => {
      if (isToolCallStep(step)) {
        return [
          <ToolCallDisplay key={`step-${stepIndex}-tool-call`} step={step} />,
          ...getProgressionItems({ step, stepIndex }),
          ...getMainThinkingResultItems({ step, stepIndex }),
          ...getFlyoutResultItems({
            step,
            stepIndex,
            onOpenFlyout: openFlyout,
          }),
        ];
      }

      // What is the difference between a reasoning step and a tool call progression message. When does the agent produce one over the other?
      // Is there any difference for how we should display reasoning and progression?
      if (isReasoningStep(step)) {
        return [
          <ThinkingItemLayout key={`step-reasoning-${stepIndex}`}>
            {step.reasoning}
          </ThinkingItemLayout>,
        ];
      }

      return [];
    });
  }, [steps, openFlyout]);

  return (
    <ol css={stepsListStyles} aria-label={labels.roundThinkingSteps}>
      {renderedSteps}
      <RoundResultsFlyout isOpen={isToolResultsFlyoutOpen} onClose={closeFlyout}>
        {(toolResults ?? []).map((result: ToolResult, index) => (
          <ThinkingItemLayout key={`flyout-result-${index}`}>
            <ToolResultDisplay toolResult={result} />
          </ThinkingItemLayout>
        ))}
      </RoundResultsFlyout>
    </ol>
  );
};
