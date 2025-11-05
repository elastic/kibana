/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ConversationRoundStep } from '@kbn/onechat-common/chat/conversation';
import type { ToolResult } from '@kbn/onechat-common/tools/tool_result';
import React, { useCallback, useState } from 'react';
import { ToolResponseFlyout } from './tool_response_flyout';
import { ThinkingItemLayout } from './thinking_items/thinking_item_layout';
import { ToolResultDisplay } from './tool_result/tool_result_display';
import { ThinkingItems } from './thinking_items/thinking_items';

interface RoundStepsProps {
  steps: ConversationRoundStep[];
  error: unknown;
}

export const RoundSteps: React.FC<RoundStepsProps> = ({ steps, error }) => {
  const [toolResults, setToolResults] = useState<ToolResult[] | null>(null);
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  const openFlyout = useCallback((results: ToolResult[]) => {
    setToolResults(results);
    setIsFlyoutOpen(true);
  }, []);

  const closeFlyout = useCallback(() => {
    setToolResults(null);
    setIsFlyoutOpen(false);
  }, []);

  return (
    <>
      <ThinkingItems steps={steps} openFlyout={openFlyout} error={error} />
      <ToolResponseFlyout isOpen={isFlyoutOpen} onClose={closeFlyout}>
        {toolResults?.map((result: ToolResult, index) => (
          <ThinkingItemLayout key={`flyout-result-${index}`}>
            <ToolResultDisplay toolResult={result} />
          </ThinkingItemLayout>
        ))}
      </ToolResponseFlyout>
    </>
  );
};
