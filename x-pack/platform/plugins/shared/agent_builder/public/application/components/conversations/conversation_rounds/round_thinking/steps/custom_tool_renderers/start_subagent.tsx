/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolCallStep } from '@kbn/agent-builder-common/chat/conversation';
import type { ToolResult } from '@kbn/agent-builder-common/tools/tool_result';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import type { ReactNode } from 'react';
import React, { useState } from 'react';
import { EuiLink, EuiText, EuiCode } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ThinkingItemLayout } from '../thinking_item_layout';
import { ToolProgressDisplay } from '../tool_progress_display';
import { ToolResultDisplay } from '../tool_result_display';
import { FlyoutResultItem } from '../flyout_result_item';
import { SubAgentExecutionFlyout } from '../sub_agent_execution_flyout';
import type { ItemFactoryEntry } from '../tool_call_thinking';

const mainThinkingResultTypes: string[] = [
  ToolResultType.query,
  ToolResultType.esqlResults,
  ToolResultType.error,
];

const disabledToolResultIconTypes: string[] = [ToolResultType.error, ToolResultType.query];

/**
 * Extract the sub-agent execution ID from tool results or progress metadata.
 */
const getExecutionId = (step: ToolCallStep): string | undefined => {
  // Try results first (available after tool completes)
  const fromResults = (step.results.find((r) => (r.data as any)?.agent_execution_id)?.data as any)
    ?.agent_execution_id;
  if (fromResults) return fromResults;

  // Fall back to progress metadata (available during execution)
  const fromProgress = step.progression?.find((p) => p.metadata?.agent_execution_id)?.metadata
    ?.agent_execution_id;
  return fromProgress;
};

/**
 * Returns thinking items for a start_subagent tool call.
 */
export const getSubAgentThinkingItems = ({
  step,
  stepIndex,
  openFlyout,
}: {
  step: ToolCallStep;
  stepIndex: number;
  openFlyout: (results: ToolResult[]) => void;
}): ItemFactoryEntry[] => {
  const items: ItemFactoryEntry[] = [];
  const hasResults = step.results.length > 0;

  // Tool call item with "Watch" button (manages its own flyout state)
  items.push({
    key: `step-${stepIndex}-tool-call`,
    isExecuting: !hasResults,
    factory: (icon, textColor) => (
      <SubAgentToolCallDisplay
        key={`step-${stepIndex}-tool-call`}
        step={step}
        icon={icon}
        textColor={textColor}
      />
    ),
  });

  // Progression items (skip internal metadata-only progress)
  step.progression
    ?.filter((p) => p.metadata?.internal !== 'true')
    .forEach((progress, progressIndex) => {
      items.push({
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

  // Main thinking result items
  step.results
    .filter((result: ToolResult) => mainThinkingResultTypes.includes(result.type))
    .forEach((result: ToolResult, resultIndex) => {
      items.push({
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

  // Flyout result items
  const flyoutResultItems = step.results.filter(
    (result: ToolResult) => !mainThinkingResultTypes.includes(result.type)
  );
  if (flyoutResultItems.length > 0) {
    items.push({
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

  return items;
};

/**
 * Display component for start_subagent tool calls — includes "Watch" button and flyout.
 * Manages its own flyout state internally.
 */
const SubAgentToolCallDisplay: React.FC<{
  step: ToolCallStep;
  icon?: ReactNode;
  textColor?: string;
}> = ({ step, icon, textColor }) => {
  const [watchExecutionId, setWatchExecutionId] = useState<string | null>(null);
  const executionId = getExecutionId(step);

  return (
    <>
      <ThinkingItemLayout
        icon={icon}
        accordionContent={step.params}
        textColor={textColor}
        loading={step.results.length === 0}
      >
        <EuiText size="s">
          <p role="status">
            <FormattedMessage
              id="xpack.agentBuilder.thinking.subAgentToolCall"
              defaultMessage="Calling tool {tool}"
              values={{
                tool: <EuiCode>{step.tool_id}</EuiCode>,
              }}
            />
            {executionId && (
              <>
                {' · '}
                <EuiLink onClick={() => setWatchExecutionId(executionId)} role="button">
                  <FormattedMessage
                    id="xpack.agentBuilder.thinking.watchSubAgent"
                    defaultMessage="Watch"
                  />
                </EuiLink>
              </>
            )}
          </p>
        </EuiText>
      </ThinkingItemLayout>
      {watchExecutionId && (
        <SubAgentExecutionFlyout
          executionId={watchExecutionId}
          onClose={() => setWatchExecutionId(null)}
        />
      )}
    </>
  );
};
