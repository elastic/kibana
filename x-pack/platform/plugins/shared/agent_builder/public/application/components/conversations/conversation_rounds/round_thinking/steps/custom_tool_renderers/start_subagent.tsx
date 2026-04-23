/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolCallStep } from '@kbn/agent-builder-common/chat/conversation';
import type { ToolResult } from '@kbn/agent-builder-common/tools/tool_result';
import { SubagentExecutionMode } from '@kbn/agent-builder-common/agents';
import type { ReactNode } from 'react';
import React, { useState } from 'react';
import { EuiLink, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { ThinkingItemLayout } from '../thinking_item_layout';
import { SubAgentExecutionFlyout } from '../sub_agent_execution_flyout';
import { ToolResponseFlyout } from '../tool_response_flyout';
import { ToolResultDisplay } from '../tool_result_display';
import type { ItemFactoryEntry } from '../tool_call_thinking';

/** Shape of the `data` field in sub-agent tool results. */
interface SubAgentResultData {
  agent_execution_id?: string;
  mode?: SubagentExecutionMode;
  status?: string;
  response?: { message: string };
}

const getResultData = (result: ToolResult): SubAgentResultData | undefined => {
  return result.data as SubAgentResultData | undefined;
};

/**
 * Extract the sub-agent execution ID from tool results or progress metadata.
 */
const getExecutionId = (step: ToolCallStep): string | undefined => {
  // Try results first (available after tool completes)
  const fromResults = step.results.find((r) => getResultData(r)?.agent_execution_id);
  if (fromResults) return getResultData(fromResults)!.agent_execution_id;

  // Fall back to progress metadata (available during execution)
  const fromProgress = step.progression?.find((p) => p.metadata?.agent_execution_id)?.metadata
    ?.agent_execution_id;
  return fromProgress;
};

/**
 * Returns thinking items for a run_subagent tool call.
 */
export const getSubAgentThinkingItems = ({
  step,
  stepIndex,
}: {
  step: ToolCallStep;
  stepIndex: number;
}): ItemFactoryEntry[] => {
  const items: ItemFactoryEntry[] = [];
  const hasResults = step.results.length > 0;

  // "Run subagent" item with the watch button
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

  // For synchronous (foreground) executions, show a "completed" item with inspect link
  if (hasResults && !isBackgroundExecution(step)) {
    items.push({
      key: `step-${stepIndex}-${step.tool_id}-result`,
      factory: (icon, textColor) => (
        <SubAgentResultDisplay
          key={`step-${stepIndex}-${step.tool_id}-result`}
          step={step}
          icon={icon}
          textColor={textColor}
        />
      ),
    });
  }

  return items;
};

const isBackgroundExecution = (step: ToolCallStep): boolean => {
  return step.results.some((r) => getResultData(r)?.mode === SubagentExecutionMode.background);
};

/**
 * Display component for run_subagent tool calls — includes "Watch" button and flyout.
 */
const SubAgentToolCallDisplay: React.FC<{
  step: ToolCallStep;
  icon?: ReactNode;
  textColor?: string;
}> = ({ step, icon, textColor }) => {
  const [watchExecutionId, setWatchExecutionId] = useState<string | null>(null);
  const executionId = getExecutionId(step);
  const isBackground = isBackgroundExecution(step);
  const description = (step.params as { description?: string })?.description;

  return (
    <>
      <ThinkingItemLayout icon={icon} textColor={textColor}>
        <EuiText size="s">
          <p role="status">
            {isBackground ? (
              <FormattedMessage
                id="xpack.agentBuilder.thinking.subAgentToolCallBackground"
                defaultMessage='Started background agent: "{description}"'
                values={{ description }}
              />
            ) : (
              <FormattedMessage
                id="xpack.agentBuilder.thinking.subAgentToolCallRunning"
                defaultMessage='Running agent: "{description}"'
                values={{ description }}
              />
            )}
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
          params={step.params}
          onClose={() => setWatchExecutionId(null)}
        />
      )}
    </>
  );
};

/**
 * Result display for synchronous sub-agent executions — "Subagent execution completed [Inspect response]"
 */
const SubAgentResultDisplay: React.FC<{
  step: ToolCallStep;
  icon?: ReactNode;
  textColor?: string;
}> = ({ step, icon, textColor }) => {
  const [isFlyoutOpen, setIsFlyoutOpen] = useState(false);

  return (
    <>
      <ThinkingItemLayout icon={icon} textColor={textColor}>
        <EuiText size="s">
          <p role="status">
            <FormattedMessage
              id="xpack.agentBuilder.thinking.subAgentCompleted"
              defaultMessage="Subagent execution completed. {inspectResponse}"
              values={{
                inspectResponse: (
                  <EuiLink onClick={() => setIsFlyoutOpen(true)} role="button">
                    <FormattedMessage
                      id="xpack.agentBuilder.thinking.inspectSubAgentResponse"
                      defaultMessage="Inspect response"
                    />
                  </EuiLink>
                ),
              }}
            />
          </p>
        </EuiText>
      </ThinkingItemLayout>
      <ToolResponseFlyout isOpen={isFlyoutOpen} onClose={() => setIsFlyoutOpen(false)}>
        {step.results.map((result: ToolResult, index) => (
          <ThinkingItemLayout key={`subagent-result-${index}`}>
            <ToolResultDisplay toolResult={result} />
          </ThinkingItemLayout>
        ))}
      </ToolResponseFlyout>
    </>
  );
};
