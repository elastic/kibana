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
import { EuiCode, EuiFlexGroup, EuiFlexItem, EuiIcon, EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { EuiLoadingElastic } from '@elastic/eui';
import { useNavigation } from '../../../../../hooks/use_navigation';
import { appPaths } from '../../../../../utils/app_paths';
import { TabularDataResultStep } from './tabular_data_result_step';
import { OtherResultStep } from './other_result_step';
import { QueryResultStep } from './query_result_step';
import { ToolResponseFlyout } from '../../tool_response_flyout';
import { useToolResultsFlyout } from '../../../../../hooks/thinking/use_tool_results_flyout';

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
  children: ReactNode;
  icon?: ReactNode;
}
const ThinkingItemLayout: React.FC<ThinkingItemLayoutProps> = ({ children, icon }) => {
  return (
    <EuiFlexGroup direction="row" gutterSize="m" alignItems="center">
      {icon && <EuiFlexItem grow={false}>{icon}</EuiFlexItem>}
      <EuiFlexItem>
        <EuiFlexGroup direction="column" gutterSize="l">
          <EuiFlexItem grow={false}>{children}</EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

interface ToolCallDisplayProps {
  step: ToolCallStep;
  icon?: ReactNode;
}
const ToolCallDisplay: React.FC<ToolCallDisplayProps> = ({ step, icon }) => {
  const { tool_id: toolId } = step;
  const { createOnechatUrl } = useNavigation();
  const toolHref = createOnechatUrl(appPaths.tools.details({ toolId }));
  const toolLinkId = `tool-link-${toolId}`;

  return (
    <ThinkingItemLayout icon={icon}>
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

interface ToolProgressDisplayProps {
  progress: ToolCallProgress;
  icon?: ReactNode;
}
const ToolProgressDisplay: React.FC<ToolProgressDisplayProps> = ({ progress, icon }) => {
  return (
    <ThinkingItemLayout icon={icon}>
      <div role="status" aria-live="polite">
        {progress.message}
      </div>
    </ThinkingItemLayout>
  );
};

interface RoundStepsProps {
  steps: ConversationRoundStep[];
  isLoading: boolean;
}
export const RoundSteps: React.FC<RoundStepsProps> = ({ steps, isLoading }) => {
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
    // First pass: build all item factories to determine total count
    type ItemFactory = (icon?: ReactNode) => ReactNode;

    const itemFactories: Array<{
      factory: ItemFactory;
      key: string;
    }> = [];

    steps.forEach((step, stepIndex) => {
      if (isToolCallStep(step)) {
        itemFactories.push({
          key: `step-${stepIndex}-tool-call`,
          factory: (icon) => (
            <ToolCallDisplay key={`step-${stepIndex}-tool-call`} step={step} icon={icon} />
          ),
        });

        // Add progression items
        step.progression?.forEach((progress, progressIndex) => {
          itemFactories.push({
            key: `step-${stepIndex}-${step.tool_id}-progress-${progressIndex}`,
            factory: (icon) => (
              <ToolProgressDisplay
                key={`step-${stepIndex}-${step.tool_id}-progress-${progressIndex}`}
                progress={progress}
                icon={icon}
              />
            ),
          });
        });

        // Add main thinking result items
        step.results
          .filter((result: ToolResult) => mainThinkingResultTypes.includes(result.type))
          .forEach((result: ToolResult, resultIndex) => {
            itemFactories.push({
              key: `step-${stepIndex}-${step.tool_id}-result-${resultIndex}`,
              factory: (icon) => (
                <ThinkingItemLayout
                  key={`step-${stepIndex}-${step.tool_id}-result-${resultIndex}`}
                  icon={icon}
                >
                  <ToolResultDisplay toolResult={result} />
                </ThinkingItemLayout>
              ),
            });
          });

        // Add flyout result items
        const flyoutResultItems = step.results.filter((result: ToolResult) =>
          flyoutResultTypes.includes(result.type)
        );
        if (flyoutResultItems.length > 0) {
          const responseId = `tool-response-${stepIndex}-${step.tool_id}`;
          const inspectButtonId = `inspect-response-${stepIndex}-${step.tool_id}`;
          itemFactories.push({
            key: `step-${stepIndex}-${step.tool_id}-result-flyout`,
            factory: (icon) => (
              <ThinkingItemLayout
                key={`step-${stepIndex}-${step.tool_id}-result-flyout`}
                icon={icon}
              >
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
                            onClick={() => openFlyout(flyoutResultItems)}
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
              </ThinkingItemLayout>
            ),
          });
        }
      } else if (isReasoningStep(step) && !step.transient) {
        itemFactories.push({
          key: `step-reasoning-${stepIndex}`,
          factory: (icon) => (
            <ThinkingItemLayout key={`step-reasoning-${stepIndex}`} icon={icon}>
              <div role="status" aria-live="polite" aria-label={labels.agentReasoning}>
                {step.reasoning}
              </div>
            </ThinkingItemLayout>
          ),
        });
      }
    });

    const totalItems = itemFactories.length;

    // Second pass: map over factories and create items with icons based on flat position
    return itemFactories.map((itemFactory, flatIndex) => {
      const isLastItem = flatIndex === totalItems - 1;
      const itemIcon =
        isLastItem && isLoading ? (
          <EuiLoadingElastic size="m" aria-label={'Loading...'} />
        ) : (
          <EuiIcon type="check" color="success" />
        );

      return itemFactory.factory(itemIcon);
    });
  }, [steps, isLoading, openFlyout]);

  return (
    <>
      <EuiFlexGroup direction="column" gutterSize="l" aria-label={labels.roundThinkingSteps}>
        {renderedSteps}
      </EuiFlexGroup>
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
