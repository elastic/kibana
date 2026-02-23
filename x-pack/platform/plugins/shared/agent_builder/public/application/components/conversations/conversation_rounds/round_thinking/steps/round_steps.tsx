/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRoundStep } from '@kbn/agent-builder-common/chat/conversation';
import { isReasoningStep, isToolCallStep } from '@kbn/agent-builder-common/chat/conversation';
import type { ToolResult } from '@kbn/agent-builder-common/tools/tool_result';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiIcon, useEuiTheme } from '@elastic/eui';
import { ToolResponseFlyout } from './tool_response_flyout';
import { useToolResultsFlyout } from '../../../../../hooks/thinking/use_tool_results_flyout';
import { ThinkingItemLayout } from './thinking_item_layout';
import { ToolCallDisplay } from './tool_call_display';
import { ToolProgressDisplay } from './tool_progress_display';
import { ToolResultDisplay } from './tool_result_display';
import { FlyoutResultItem } from './flyout_result_item';

const labels = {
  roundThinkingSteps: i18n.translate('xpack.agentBuilder.conversation.thinking.stepsList', {
    defaultMessage: 'Round thinking steps',
  }),
  agentReasoning: i18n.translate('xpack.agentBuilder.thinking.agentReasoningLabel', {
    defaultMessage: 'Agent reasoning',
  }),
  flyoutTitle: i18n.translate('xpack.agentBuilder.thinking.flyoutTitle', {
    defaultMessage: 'Tool response details',
  }),
  loading: i18n.translate('xpack.agentBuilder.conversation.thinking.loading', {
    defaultMessage: 'Loading...',
  }),
};

// Exposed in main thinking chain, for now query and esql results
const mainThinkingResultTypes: string[] = [
  ToolResultType.query,
  ToolResultType.esqlResults,
  ToolResultType.error,
];

// Tool result types that should not have an icon displayed in the thinking steps list
const disabledToolResultIconTypes: string[] = [ToolResultType.error, ToolResultType.query];

const getItemIcon = (isLastItem: boolean, isLoading: boolean): ReactNode => {
  if (isLastItem && isLoading) {
    return <EuiIcon type="doubleArrowRight" color="text" />;
  }
  return <EuiIcon type="check" color="success" />;
};

type ItemFactory = (icon?: ReactNode, textColor?: string) => ReactNode;

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

  const { euiTheme } = useEuiTheme();

  const renderedSteps = useMemo(() => {
    const itemFactories: { key: string; factory: ItemFactory }[] = [];

    // First pass: build all item factories to determine total count
    steps.forEach((step, stepIndex) => {
      if (isToolCallStep(step)) {
        itemFactories.push({
          key: `step-${stepIndex}-tool-call`,
          factory: (icon, textColor) => (
            <ToolCallDisplay
              key={`step-${stepIndex}-tool-call`}
              step={step}
              icon={icon}
              textColor={textColor}
            />
          ),
        });

        // Add progression items
        step.progression?.forEach((progress, progressIndex) => {
          itemFactories.push({
            key: `step-${stepIndex}-${step.tool_id}-progress-${progressIndex}`,
            factory: (icon, textColor) => (
              <ToolProgressDisplay
                key={`step-${stepIndex}-${step.tool_id}-progress-${progressIndex}`}
                progress={progress}
                icon={icon}
                textColor={textColor}
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
              factory: (icon, textColor) => {
                const shouldDisableIcon = disabledToolResultIconTypes.includes(result.type);
                return (
                  <ThinkingItemLayout
                    key={`step-${stepIndex}-${step.tool_id}-result-${resultIndex}`}
                    icon={shouldDisableIcon ? undefined : icon}
                    textColor={textColor}
                  >
                    <ToolResultDisplay toolResult={result} />
                  </ThinkingItemLayout>
                );
              },
            });
          });

        // Add flyout result items
        const flyoutResultItems = step.results.filter(
          (result: ToolResult) => !mainThinkingResultTypes.includes(result.type)
        );
        if (flyoutResultItems.length > 0) {
          itemFactories.push({
            key: `step-${stepIndex}-${step.tool_id}-result-flyout`,
            factory: (icon, textColor) => (
              <FlyoutResultItem
                key={`step-${stepIndex}-${step.tool_id}-result-flyout`}
                step={step}
                stepIndex={stepIndex}
                flyoutResultItems={flyoutResultItems}
                onOpenFlyout={openFlyout}
                icon={icon}
                textColor={textColor}
              />
            ),
          });
        }
      } else if (isReasoningStep(step) && !step.transient) {
        itemFactories.push({
          key: `step-reasoning-${stepIndex}`,
          factory: (icon, textColor) => (
            <ThinkingItemLayout
              key={`step-reasoning-${stepIndex}`}
              icon={icon}
              textColor={textColor}
            >
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
    // The last item should always be loading unless the round has completed
    return itemFactories.map((itemFactory, flatIndex) => {
      const isLastItem = flatIndex === totalItems - 1;
      const itemIcon = getItemIcon(isLastItem, isLoading);
      const getItemTextColor = () => {
        if (isLastItem && isLoading) {
          return euiTheme.colors.textParagraph;
        }
        return euiTheme.colors.textSubdued;
      };
      const textColor = getItemTextColor();
      return itemFactory.factory(itemIcon, textColor);
    });
  }, [steps, openFlyout, isLoading, euiTheme.colors.textSubdued, euiTheme.colors.textParagraph]);

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
