/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolResult } from '@kbn/onechat-common';
import { isReasoningStep, isToolCallStep } from '@kbn/onechat-common';
import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/react';
import { useRoundContext } from '../../../../../../context/conversation_round/round_context';
import { ToolCallThinkingItem } from './tool_call_thinking_item';
import { getProgressionThinkingItems } from './progression_thinking_items';
import {
  getFlyoutToolResultThinkingItems,
  getMainToolResultThinkingItems,
} from './tool_result_thinking_items';
import { ThinkingItemLayout } from './thinking_item_layout';
import { ErrorThinkingItem } from './error_thinking_item';

const thinkingItemsListLabel = i18n.translate(
  'xpack.onechat.conversation.thinking.thinkingItemsList',
  {
    defaultMessage: 'Round thinking steps',
  }
);

const thinkingItemsListStyles = css`
  list-style: none;
  padding: 0;
`;

export const ThinkingItems: React.FC<{
  openFlyout: (toolResults: ToolResult[]) => void;
}> = ({ openFlyout }) => {
  const {
    round: { steps },
  } = useRoundContext();
  // Each step will map to multiple thinking items
  // In the case of tool call steps we'll have
  // an item for the tool call, items for the progression, and items for the tool call results
  const thinkingItems = useMemo(
    () =>
      steps.flatMap((step, stepIndex) => {
        if (isToolCallStep(step)) {
          return [
            <ToolCallThinkingItem key={`step-${stepIndex}-tool-call`} step={step} />,
            ...getProgressionThinkingItems({ step, stepIndex }),
            ...getMainToolResultThinkingItems({ step, stepIndex }),
            ...getFlyoutToolResultThinkingItems({
              step,
              stepIndex,
              onOpenFlyout: openFlyout,
            }),
          ];
        }

        if (isReasoningStep(step) && !step.transient) {
          return [
            <ThinkingItemLayout key={`step-reasoning-${stepIndex}`}>
              <div
                role="status"
                aria-live="polite"
                aria-label={i18n.translate('xpack.onechat.thinking.agentReasoningLabel', {
                  defaultMessage: 'Agent reasoning',
                })}
              >
                {step.reasoning}
              </div>
            </ThinkingItemLayout>,
          ];
        }

        return [];
      }),
    [steps, openFlyout]
  );

  return (
    <ol css={thinkingItemsListStyles} aria-label={thinkingItemsListLabel}>
      {thinkingItems}
      <ErrorThinkingItem />
    </ol>
  );
};
