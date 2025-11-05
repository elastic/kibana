/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiCode, EuiLink, EuiText } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { ToolResultType, type ToolCallStep, type ToolResult } from '@kbn/onechat-common';
import React from 'react';
import { ToolResultDisplay } from '../tool_result/tool_result_display';
import { ThinkingItemLayout } from './thinking_item_layout';

// Exposed in main thinking chain, for now query and tabular data
const mainToolResultTypes = [
  ToolResultType.query,
  ToolResultType.tabularData,
  ToolResultType.error,
];
// Populated in flyout
const flyoutToolResultTypes = [
  ToolResultType.visualization,
  ToolResultType.other,
  ToolResultType.resource,
];

export const getMainToolResultThinkingItems = ({
  step,
  stepIndex,
}: {
  step: ToolCallStep;
  stepIndex: number;
}) => {
  return step.results
    .filter((result: ToolResult) => mainToolResultTypes.includes(result.type))
    .map((result: ToolResult, index) => (
      <ThinkingItemLayout key={`step-${stepIndex}-${step.tool_id}-result-${index}`}>
        <ToolResultDisplay toolResult={result} />
      </ThinkingItemLayout>
    ));
};

const toolResponseLabel = i18n.translate('xpack.onechat.thinking.toolResponseLabel', {
  defaultMessage: 'Tool response',
});
const inspectResponseLabel = i18n.translate('xpack.onechat.thinking.inspectResponseLabel', {
  defaultMessage: 'Inspect tool response details',
});

const ToolFlyoutResultDisplay = ({
  stepIndex,
  toolId,
  openFlyout,
}: {
  stepIndex: number;
  toolId: string;
  openFlyout: () => void;
}) => {
  const id = `${stepIndex}-${toolId}`;
  const responseId = `tool-response-${id}`;
  const inspectButtonId = `inspect-response-${id}`;

  return (
    <ThinkingItemLayout key={`step-${id}-result-flyout`}>
      <EuiText size="s">
        <p id={responseId} role="status" aria-label={toolResponseLabel}>
          <FormattedMessage
            id="xpack.onechat.thinking.toolCallThinkingItem"
            defaultMessage="Tool {tool} returned response. {inspectResponse}"
            values={{
              tool: (
                <EuiCode
                  aria-label={i18n.translate('xpack.onechat.thinking.toolName', {
                    defaultMessage: 'Tool {toolId}',
                    values: { toolId },
                  })}
                >
                  {toolId}
                </EuiCode>
              ),
              inspectResponse: (
                <EuiLink
                  onClick={openFlyout}
                  id={inspectButtonId}
                  aria-describedby={responseId}
                  aria-label={inspectResponseLabel}
                  role="button"
                >
                  <FormattedMessage
                    id="xpack.onechat.conversation.roundResultsButton"
                    defaultMessage="Inspect response"
                  />
                </EuiLink>
              ),
            }}
          />
        </p>
      </EuiText>
    </ThinkingItemLayout>
  );
};

export const getFlyoutToolResultThinkingItems = ({
  step,
  stepIndex,
  onOpenFlyout,
}: {
  step: ToolCallStep;
  stepIndex: number;
  onOpenFlyout: (results: ToolResult[]) => void;
}) => {
  const flyoutResultItems = step.results.filter((result: ToolResult) =>
    flyoutToolResultTypes.includes(result.type)
  );

  if (flyoutResultItems.length > 0) {
    return [
      <ToolFlyoutResultDisplay
        stepIndex={stepIndex}
        toolId={step.tool_id}
        openFlyout={() => {
          onOpenFlyout(flyoutResultItems);
        }}
      />,
    ];
  }

  return [];
};
