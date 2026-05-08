/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolCallStep } from '@kbn/agent-builder-common/chat/conversation';
import type { ToolResult } from '@kbn/agent-builder-common/tools/tool_result';
import { ToolResultType } from '@kbn/agent-builder-common/tools/tool_result';
import React from 'react';
import type { ReactNode } from 'react';
import { internalTools } from '@kbn/agent-builder-common';
import { ToolCallDisplay } from './tool_call_display';
import { ToolProgressDisplay } from './tool_progress_display';
import { ToolResultDisplay } from './tool_result_display';
import { FlyoutResultItem } from './flyout_result_item';
import { ThinkingItemLayout } from './thinking_item_layout';
import { getSubAgentThinkingItems } from './custom_tool_renderers/start_subagent';

type ItemFactory = (icon?: ReactNode, textColor?: string) => ReactNode;

export interface ItemFactoryEntry {
  key: string;
  factory: ItemFactory;
  isExecuting?: boolean;
}

// Exposed in main thinking chain, for now query and esql results
const mainThinkingResultTypes: string[] = [
  ToolResultType.query,
  ToolResultType.esqlResults,
  ToolResultType.error,
];

// Tool result types that should not have an icon displayed in the thinking steps list
const disabledToolResultIconTypes: string[] = [ToolResultType.error, ToolResultType.query];

/**
 * Build thinking item factories for a tool call step.
 * Dispatches to custom renderers for known tools, falls back to the default renderer.
 */
export const getToolCallThinkingItems = ({
  step,
  stepIndex,
  openFlyout,
}: {
  step: ToolCallStep;
  stepIndex: number;
  openFlyout: (results: ToolResult[]) => void;
}): ItemFactoryEntry[] => {
  if (step.tool_id === internalTools.subAgentTool) {
    return getSubAgentThinkingItems({ step, stepIndex });
  }

  return getDefaultToolCallThinkingItems({ step, stepIndex, openFlyout });
};

/**
 * Default tool call thinking items — tool call, progression, results, flyout.
 */
const getDefaultToolCallThinkingItems = ({
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

  items.push({
    key: `step-${stepIndex}-tool-call`,
    isExecuting: !hasResults,
    factory: (icon, textColor) => (
      <ToolCallDisplay
        key={`step-${stepIndex}-tool-call`}
        step={step}
        icon={icon}
        textColor={textColor}
      />
    ),
  });

  step.progression?.forEach((progress, progressIndex) => {
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
