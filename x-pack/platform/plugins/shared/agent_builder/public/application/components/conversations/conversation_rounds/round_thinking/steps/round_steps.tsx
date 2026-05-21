/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRoundStep } from '@kbn/agent-builder-common/chat/conversation';
import {
  isReasoningStep,
  isToolCallStep,
  isCompactionStep,
  isBackgroundAgentCompleteStep,
} from '@kbn/agent-builder-common/chat/conversation';
import type { ToolResult } from '@kbn/agent-builder-common/tools/tool_result';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ReactNode } from 'react';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { EuiFlexGroup, EuiIcon, EuiLoadingSpinner, useEuiTheme } from '@elastic/eui';
import { ToolResponseFlyout } from './tool_response_flyout';
import { useToolResultsFlyout } from '../../../../../hooks/thinking/use_tool_results_flyout';
import { ThinkingItemLayout } from './thinking_item_layout';
import { ToolResultDisplay } from './tool_result_display';
import { CompactionDisplay } from './compaction_display';
import { BackgroundExecutionDisplay } from './background_execution_display';
import { getToolCallThinkingItems, type ItemFactoryEntry } from './tool_call_thinking';

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

const getItemIcon = ({
  isLoading,
  isExecutingTool,
}: {
  isLoading: boolean;
  isExecutingTool: boolean;
}): ReactNode => {
  if (isExecutingTool) {
    return <EuiLoadingSpinner size="s" />;
  }
  if (isLoading) {
    return <EuiIcon type="chevronDoubleRight" color="text" />;
  }
  return <EuiIcon type="check" color="success" />;
};

interface RoundStepsProps {
  steps: ConversationRoundStep[];
  isLoading: boolean;
}
export const RoundSteps: React.FC<RoundStepsProps> = ({ steps, isLoading }) => {
  const {
    toolResults,
    isOpen: isToolResultsFlyoutOpen,
    openFlyout,
    closeFlyout,
  } = useToolResultsFlyout();

  const { euiTheme } = useEuiTheme();

  const renderedSteps = useMemo(() => {
    const itemFactories: ItemFactoryEntry[] = [];

    steps.forEach((step, stepIndex) => {
      if (isToolCallStep(step)) {
        itemFactories.push(...getToolCallThinkingItems({ step, stepIndex, openFlyout }));
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
      } else if (isCompactionStep(step)) {
        const compactionInProgress = step.token_count_after === 0;
        itemFactories.push({
          key: `step-compaction-${stepIndex}`,
          factory: (icon, textColor) => (
            <CompactionDisplay
              key={`step-compaction-${stepIndex}`}
              step={step}
              icon={icon}
              textColor={textColor}
              isInProgress={compactionInProgress}
            />
          ),
        });
      } else if (isBackgroundAgentCompleteStep(step)) {
        itemFactories.push({
          key: `step-bg-execution-${stepIndex}`,
          factory: (icon, textColor) => (
            <BackgroundExecutionDisplay
              key={`step-bg-execution-${stepIndex}`}
              step={step}
              onInspect={() => {
                openFlyout([
                  {
                    type: ToolResultType.other,
                    tool_result_id: `bg-${step.execution_id}`,
                    data: {
                      execution_id: step.execution_id,
                      status: step.status,
                      response: step.response,
                      error: step.error,
                      completed_at: step.completed_at,
                    },
                  },
                ]);
              }}
              icon={icon}
              textColor={textColor}
            />
          ),
        });
      }
    });

    const totalItems = itemFactories.length;

    return itemFactories.map((itemFactory, flatIndex) => {
      const isLastItem = flatIndex === totalItems - 1;
      const isExecutingTool = !!(itemFactory.isExecuting && isLoading);
      const isItemLoading = (isLastItem && isLoading) || isExecutingTool;
      const itemIcon = getItemIcon({ isLoading: isItemLoading, isExecutingTool });
      const textColor = isItemLoading ? euiTheme.colors.textParagraph : euiTheme.colors.textSubdued;
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
