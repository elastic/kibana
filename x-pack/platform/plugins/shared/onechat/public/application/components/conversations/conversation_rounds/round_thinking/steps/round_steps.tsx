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
  EuiCode,
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
import { ToolResponseFlyout } from '../../tool_response_flyout';
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
const flyoutResultTypes = [
  ToolResultType.visualization,
  ToolResultType.other,
  ToolResultType.resource,
];

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
  const toolLinkId = `tool-link-${toolId}`;

  return (
    <ThinkingItemLayout>
      <EuiText size="s">
        <p role="status" aria-label={labels.toolCall}>
          <FormattedMessage
            id="xpack.onechat.thinking.toolCallThinkingItem"
            defaultMessage="Calling tool {tool}"
            values={{
              tool: (
                <code>
                  <EuiLink
                    href={toolHref}
                    target="_blank"
                    id={toolLinkId}
                    aria-label={`${labels.toolLink} ${toolId}`}
                    rel="noopener noreferrer"
                  >
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
  return (
    <ThinkingItemLayout>
      <div role="status" aria-live="polite">
        {progress.message}
      </div>
    </ThinkingItemLayout>
  );
};

interface RoundStepsProps {
  steps: ConversationRoundStep[];
}

const labels = {
  roundThinkingSteps: i18n.translate('xpack.onechat.conversation.thinking.stepsList', {
    defaultMessage: 'Round thinking steps',
  }),
  toolCall: i18n.translate('xpack.onechat.thinking.toolCallLabel', {
    defaultMessage: 'Tool call',
  }),
  toolResponse: i18n.translate('xpack.onechat.thinking.toolResponseLabel', {
    defaultMessage: 'Tool response',
  }),
  inspectResponse: i18n.translate('xpack.onechat.thinking.inspectResponseLabel', {
    defaultMessage: 'Inspect tool response details',
  }),
  toolLink: i18n.translate('xpack.onechat.thinking.toolLinkLabel', {
    defaultMessage: 'View tool details',
  }),
  agentReasoning: i18n.translate('xpack.onechat.thinking.agentReasoningLabel', {
    defaultMessage: 'Agent reasoning',
  }),
  flyoutTitle: i18n.translate('xpack.onechat.thinking.flyoutTitle', {
    defaultMessage: 'Tool response details',
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
    const responseId = `tool-response-${stepIndex}-${step.tool_id}`;
    const inspectButtonId = `inspect-response-${stepIndex}-${step.tool_id}`;

    return [
      <ThinkingItemLayout key={`step-${stepIndex}-${step.tool_id}-result-flyout`}>
        <EuiText size="s">
          <p id={responseId} role="status" aria-label={labels.toolResponse}>
            <FormattedMessage
              id="xpack.onechat.thinking.toolCallThinkingItem"
              defaultMessage="Tool {tool} returned response. {inspectResponse}"
              values={{
                tool: (
                  <EuiCode
                    aria-label={i18n.translate('xpack.onechat.thinking.toolName', {
                      defaultMessage: 'Tool {toolId}',
                      values: { toolId: step.tool_id },
                    })}
                  >
                    {step.tool_id}
                  </EuiCode>
                ),
                inspectResponse: (
                  <EuiLink
                    onClick={() => onOpenFlyout(flyoutResultItems)}
                    id={inspectButtonId}
                    aria-describedby={responseId}
                    aria-label={labels.inspectResponse}
                    role="button"
                  >
                    {i18n.translate('xpack.onechat.conversation.roundResultsButton', {
                      defaultMessage: 'Inspect response',
                    })}
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
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
      if (isReasoningStep(step) && !step.transient) {
        return [
          <ThinkingItemLayout key={`step-reasoning-${stepIndex}`}>
            <div role="status" aria-live="polite" aria-label={labels.agentReasoning}>
              {step.reasoning}
            </div>
          </ThinkingItemLayout>,
        ];
      }

      return [];
    });
  }, [steps, openFlyout]);

  return (
    <>
      <ol css={stepsListStyles} aria-label={labels.roundThinkingSteps}>
        {renderedSteps}
      </ol>
      <ToolResponseFlyout
        isOpen={isToolResultsFlyoutOpen}
        onClose={closeFlyout}
        aria-label={labels.flyoutTitle}
      >
        {(toolResults ?? []).map((result: ToolResult, index) => (
          <ThinkingItemLayout key={`flyout-result-${index}`}>
            <ToolResultDisplay toolResult={result} />
          </ThinkingItemLayout>
        ))}
      </ToolResponseFlyout>
    </>
  );
};
